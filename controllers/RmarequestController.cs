using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.DTO;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RmaRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public RmaRequestsController(AppDbContext context) => _context = context;

        // GET: api/RmaRequests?projectId=3
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? projectId)
        {
            var query = _context.RmaRequests
                .Include(r => r.Items).ThenInclude(i => i.PhysicalAsset).ThenInclude(a => a!.HardwareProduct)
                .AsQueryable();

            if (projectId.HasValue) query = query.Where(r => r.ProjectId == projectId.Value);

            var requests = await query.OrderByDescending(r => r.CreatedDate).ToListAsync();

            return Ok(requests.Select(r => new
            {
                r.Id,
                r.RmaNumber,
                r.Status,
                r.Notes,
                r.CourierReference,
                r.CreatedDate,
                r.ShippedDate,
                r.ClosedDate,
                Items = r.Items.Select(i => new
                {
                    i.Id,
                    i.Quantity,
                    PartNumber = i.PhysicalAsset?.HardwareProduct.PartNumber,
                    Name = i.PhysicalAsset?.HardwareProduct.Name,
                })
            }));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var r = await _context.RmaRequests
                .Include(x => x.Items).ThenInclude(i => i.PhysicalAsset).ThenInclude(a => a!.HardwareProduct)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (r == null) return NotFound();

            return Ok(new
            {
                r.Id,
                r.RmaNumber,
                r.Status,
                r.Notes,
                r.CourierReference,
                r.CreatedDate,
                r.ShippedDate,
                r.ClosedDate,
                Items = r.Items.Select(i => new
                {
                    i.Id,
                    i.Quantity,
                    i.PhysicalAssetId,
                    PartNumber = i.PhysicalAsset?.HardwareProduct.PartNumber,
                    Name = i.PhysicalAsset?.HardwareProduct.Name,
                    SerialNumber = i.PhysicalAsset?.SerialNumber,
                })
            });
        }

        // POST: api/RmaRequests — documente l'intention de retour, ne touche pas encore au stock
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateRmaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RmaNumber)) return BadRequest("Numéro RMA requis.");
            if (dto.Items.Count == 0) return BadRequest("Sélectionnez au moins une référence défectueuse.");

            foreach (var item in dto.Items)
            {
                var asset = await _context.PhysicalAssets.FindAsync(item.PhysicalAssetId);
                if (asset == null) return BadRequest($"Asset #{item.PhysicalAssetId} introuvable.");
                if (item.Quantity <= 0 || item.Quantity > asset.DefectiveQuantity)
                    return BadRequest($"Quantité invalide pour l'asset #{item.PhysicalAssetId} (max {asset.DefectiveQuantity} défectueux).");
            }

            var rma = new RmaRequest
            {
                ProjectId = dto.ProjectId,
                WarehouseId = dto.WarehouseId,
                RmaNumber = dto.RmaNumber,
                Notes = dto.Notes,
                Status = "Pending",
                Items = dto.Items.Select(i => new RmaRequestItem
                {
                    PhysicalAssetId = i.PhysicalAssetId,
                    Quantity = i.Quantity
                }).ToList()
            };

            _context.RmaRequests.Add(rma);
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = dto.ProjectId,
                Type = "RMA_CREATED",
                Description = $"RMA {dto.RmaNumber} créée ({dto.Items.Count} référence(s))",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { rma.Id, rma.RmaNumber });
        }

        // PATCH: api/RmaRequests/5/ship — le matériel quitte physiquement l'entrepôt
        [HttpPatch("{id}/ship")]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> Ship(int id, [FromBody] ShipRmaDto dto)
        {
            var rma = await _context.RmaRequests
                .Include(r => r.Items).ThenInclude(i => i.PhysicalAsset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (rma == null) return NotFound();
            if (rma.Status != "Pending") return BadRequest("Cette RMA n'est plus en attente.");

            // Projet ancien — le statut RMA reste suivi normalement (traçabilité), mais le
            // stock physique réel n'est jamais touché.
            var project = await _context.Projects.FindAsync(rma.ProjectId);
            bool isLegacy = project != null && !project.HasFullTraceability;

            if (!isLegacy)
            {
                foreach (var item in rma.Items)
                {
                    var asset = item.PhysicalAsset!;
                    if (item.Quantity > asset.DefectiveQuantity || item.Quantity > asset.Quantity)
                        return BadRequest($"Stock incohérent pour {asset.SerialNumber} — annulez et recréez la RMA.");

                    asset.Quantity -= item.Quantity;
                    asset.DefectiveQuantity -= item.Quantity;
                    if (asset.Quantity <= 0)
                    {
                        asset.Status = "RMA_TRANSIT";
                        asset.WarehouseId = null;
                    }
                }
            }

            rma.Status = "Shipped";
            rma.ShippedDate = DateTime.UtcNow;
            rma.CourierReference = dto.CourierReference;
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = rma.ProjectId,
                Type = "RMA_SHIPPED",
                Description = isLegacy
                    ? $"RMA {rma.RmaNumber} expédiée vers Nokia (projet archivé) — stock réel non affecté"
                    : $"RMA {rma.RmaNumber} expédiée vers Nokia — matériel retiré du stock",
                PerformedBy = dto.PerformedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"RMA {rma.RmaNumber} expédiée." });
        }

        // PATCH: api/RmaRequests/5/close — clôture administrative, ne touche pas au stock
        // (le remplacement éventuel de Nokia entre par le circuit shipment normal)
        [HttpPatch("{id}/close")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Close(int id, [FromBody] CloseRmaDto dto)
        {
            var rma = await _context.RmaRequests.FindAsync(id);
            if (rma == null) return NotFound();
            if (rma.Status != "Shipped") return BadRequest("Seule une RMA expédiée peut être clôturée.");

            rma.Status = "Closed";
            rma.ClosedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = rma.ProjectId,
                Type = "RMA_CLOSED",
                Description = $"RMA {rma.RmaNumber} clôturée",
                PerformedBy = dto.PerformedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"RMA {rma.RmaNumber} clôturée." });
        }

        // DELETE: api/RmaRequests/5 — annule une RMA encore en attente (rien en stock à défaire)
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Cancel(int id)
        {
            var rma = await _context.RmaRequests.Include(r => r.Items).FirstOrDefaultAsync(r => r.Id == id);
            if (rma == null) return NotFound();
            if (rma.Status != "Pending") return BadRequest("Impossible d'annuler une RMA déjà expédiée.");

            _context.RmaRequestItems.RemoveRange(rma.Items);
            _context.RmaRequests.Remove(rma);
            await _context.SaveChangesAsync();

            return Ok(new { message = "RMA annulée." });
        }
    }
}