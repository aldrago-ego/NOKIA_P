using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTO;
using backend.Models;
using backend.DTO;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeliveryNotesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DeliveryNotesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/DeliveryNotes?projectId=3
        // Alimente la card "HW Shipment" — liste des shipments du projet actif
        [HttpGet]
        public async Task<IActionResult> GetByProject([FromQuery] int projectId)
        {
            var shipments = await _context.DeliveryNotes
                .Where(d => d.ProjectId == projectId)
                .OrderByDescending(d => d.VesselArrivalDate)
                .Select(d => new
                {
                    d.Id,
                    d.DeliveryNumber,
                    d.Scope,
                    d.Location,
                    d.Mot,
                    d.VesselDepartureDate,
                    d.VesselArrivalDate,
                    d.InvoiceNumber,
                    d.ContainersCount,
                    d.Waybill,
                    d.IsApproved,
                    Status = d.IsApproved ? "Delivered" : "Pending"
                })
                .ToListAsync();

            return Ok(shipments);
        }

        // GET: api/DeliveryNotes/5
        // Détail d'un shipment + le matériel reçu (si déjà confirmé/livré)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var shipment = await _context.DeliveryNotes
                .Include(d => d.Assets).ThenInclude(a => a.HardwareProduct)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (shipment == null) return NotFound();

            var expectedLines = await _context.ExpectedDeliveryLines
                .Where(e => e.DeliveryNoteId == id)
                .ToListAsync();

            var expectedByPartNumber = expectedLines.ToDictionary(e => e.PartNumber, e => e.ExpectedQuantity);

return Ok(new
{
    shipment.Id,
    shipment.DeliveryNumber,
    shipment.Scope,
    shipment.Location,
    shipment.Mot,
    shipment.VesselDepartureDate,
    shipment.VesselArrivalDate,
    shipment.InvoiceNumber,
    shipment.ContainersCount,
    shipment.Waybill,
    Status = shipment.IsApproved ? "Delivered" : "Pending",
    shipment.ApprovedBy,
    shipment.ApprovalDate,
    Materials = shipment.Assets
        .GroupBy(a => a.HardwareProduct.PartNumber)
        .Select(g => new
        {
            PartNumber = g.Key,
            Name = g.First().HardwareProduct.Name,
            Quantity = g.Sum(a => a.Quantity),
            DefectiveQuantity = g.Sum(a => a.DefectiveQuantity),
            SerialNumber = g.Count() > 1 ? $"{g.Count()} unités" : g.First().SerialNumber,
            ExpectedQuantity = expectedByPartNumber.TryGetValue(g.Key, out var exp) ? exp : (int?)null
        }),
    ExpectedMaterials = expectedLines.Select(e => new
    {
        e.PartNumber, e.Description, e.ExpectedQuantity, e.Category
    })
});
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> CancelShipment(int id)
        {
            var shipment = await _context.DeliveryNotes.FindAsync(id);
            if (shipment == null) return NotFound();

            if (shipment.IsApproved)
                return BadRequest("Impossible d'annuler un shipment déjà confirmé — le matériel est en stock.");

            var expectedLines = _context.ExpectedDeliveryLines.Where(e => e.DeliveryNoteId == id);
            _context.ExpectedDeliveryLines.RemoveRange(expectedLines);
            _context.DeliveryNotes.Remove(shipment);
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = shipment.ProjectId,
                Type = "SHIPMENT_CANCELLED",
                Description = $"Shipment {shipment.DeliveryNumber} annulé (en attente)",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Shipment {shipment.DeliveryNumber} annulé." });
        }
        // POST: api/DeliveryNotes/import
        // Étape 1 : importe la liste des shipments annoncés (Excel), aucun PhysicalAsset créé

        [HttpPost("import")]
        [Authorize(Roles = "Admin , Supervisor ")]
        public async Task<IActionResult> ImportShipments([FromBody] ShipmentImportRequestDto request)
        {
            var project = await _context.Projects.FindAsync(request.ProjectId);
            if (project == null) return BadRequest("Projet invalide.");

            int created = 0;
            var skippedDetails = new List<string>();

            foreach (var row in request.Rows)
            {
                if (string.IsNullOrWhiteSpace(row.ShipmentNo))
                {
                    skippedDetails.Add("Ligne sans numéro de shipment");
                    continue;
                }

                var exists = await _context.DeliveryNotes
                    .AnyAsync(d => d.DeliveryNumber == row.ShipmentNo && d.ProjectId == request.ProjectId);
                if (exists)
                {
                    skippedDetails.Add($"{row.ShipmentNo} : déjà importé pour ce projet");
                    continue;
                }

                var note = new DeliveryNote
                {
                    ProjectId = request.ProjectId,
                    DeliveryNumber = row.ShipmentNo,
                    Scope = row.Scope,
                    Location = row.Location,
                    Mot = row.Mot,
                    VesselDepartureDate = row.VesselDepartureDate,
                    VesselArrivalDate = row.VesselArrivalDate,
                    InvoiceNumber = row.InvoiceNumber,
                    ContainersCount = row.ContainersCount,
                    Waybill = row.Waybill,
                    ArrivalDate = row.VesselArrivalDate ?? DateTime.UtcNow,
                    IsApproved = false
                };
                _context.DeliveryNotes.Add(note);
                await _context.SaveChangesAsync(); // génère note.Id pour les lignes ci-dessous

                // NOUVEAU : persiste le matériel attendu, lu depuis la même ligne Excel
                foreach (var mat in row.Materials)
                {
                    if (string.IsNullOrWhiteSpace(mat.PartNumber)) continue;
                    _context.ExpectedDeliveryLines.Add(new ExpectedDeliveryLine
                    {
                        DeliveryNoteId = note.Id,
                        PartNumber = mat.PartNumber,
                        Description = mat.Description,
                        ExpectedQuantity = mat.ExpectedQuantity,
                        Category = mat.Category
                    });
                }

                created++;
            }

            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = request.ProjectId,
                Type = "SHIPMENTS_IMPORTED",
                Description = $"{created} shipment(s) importé(s), {skippedDetails.Count} ignoré(s)",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { created, skipped = skippedDetails.Count, skippedDetails });
        }
    }

}