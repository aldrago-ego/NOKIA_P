using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using backend.Models;
using backend.DTO;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace backend.controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeliveriesController : ControllerBase
    {
        private readonly AppDbContext _context; // Utilise ton DbContext réel

        public DeliveriesController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Deliveries/approve-direct -> Réceptionne et crée tout automatiquement
        [HttpPost("approve-direct")]
        [Authorize(Roles = "Supervisor,Admin")]
        public async Task<IActionResult> ApproveDirectDelivery([FromBody] DirectDeliveryApprovalDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.DeliveryNumber))
                return BadRequest("Données de livraison invalides.");

            var delivery = await _context.DeliveryNotes
     .FirstOrDefaultAsync(dn => dn.DeliveryNumber == dto.DeliveryNumber);

            if (delivery == null)
                return NotFound($"Aucun shipment '{dto.DeliveryNumber}' trouvé — importez-le d'abord.");

            // NOUVEAU : récupère l'entrepôt unique pour l'assigner au matériel injecté
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync();
            if (warehouse == null)
                return BadRequest("Aucun entrepôt configuré en base.");

            delivery.IsApproved = true;
            delivery.ApprovedBy = dto.SupervisorName;
            delivery.ApprovalDate = DateTime.UtcNow;

           foreach (var item in dto.VerifiedAssets)
{
    var product = await _context.HardwareProducts
        .FirstOrDefaultAsync(p => p.PartNumber == item.PartNumber);

    if (product == null)
    {
        MaterialDomain domain;
        bool isSerialized;

        if (!string.IsNullOrEmpty(item.Domain) && item.IsSerialized.HasValue)
        {
            if (!Enum.TryParse<MaterialDomain>(item.Domain, true, out domain))
                return BadRequest($"Domain invalide pour '{item.PartNumber}': {item.Domain}");
            isSerialized = item.IsSerialized.Value;
        }
        else
        {
            (domain, isSerialized) = GuessClassification(item.PartNumber, item.ProductName);
        }

        product = new HardwareProduct
        {
            PartNumber = item.PartNumber,
            Name = item.ProductName ?? "Équipement générique",
            Domain = domain,
            MaterialGroup = string.IsNullOrEmpty(item.MaterialGroup) ? "À catégoriser" : item.MaterialGroup,
            IsSerialized = isSerialized
        };
        _context.HardwareProducts.Add(product);
        await _context.SaveChangesAsync();
    }

    int qty = item.ReceivedQty > 0 ? item.ReceivedQty : 1;
    string verifStatus = item.ReceivedQty == item.ExpectedQty ? "CONFORME" : "ECART_DETECTE";

    if (product.IsSerialized)
    {
        for (int i = 0; i < qty; i++)
        {
            string serial = item.IsManuallyCounted || string.IsNullOrEmpty(item.ScannedSerial)
                ? $"NEXA-{delivery.ProjectId}-{product.Id}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
                : item.ScannedSerial;

            _context.PhysicalAssets.Add(new PhysicalAsset
            {
                SerialNumber = serial,
                HardwareProductId = product.Id,
                HardwareProduct = product,
                Quantity = 1,
                Status = "STOCK",
                IsManuallyVerified = item.IsManuallyCounted,
                VerificationStatus = verifStatus,
                DeliveryNoteId = delivery.Id,
                WarehouseId = warehouse.Id,
                Warehouse = warehouse,
                UploadedAt = DateTime.UtcNow
            });
        }
    }
    else
    {
        _context.PhysicalAssets.Add(new PhysicalAsset
        {
            SerialNumber = $"LOT-{delivery.DeliveryNumber}-{product.PartNumber}",
            HardwareProductId = product.Id,
            HardwareProduct = product,
            Quantity = qty,
            Status = "STOCK",
            IsManuallyVerified = item.IsManuallyCounted,
            VerificationStatus = verifStatus,
            DeliveryNoteId = delivery.Id,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            UploadedAt = DateTime.UtcNow
        });
    }
}
            await _context.SaveChangesAsync();

            _context.Set<ActivityLog>().Add(new ActivityLog
            {
                ProjectId = delivery.ProjectId,
                Type = "DELIVERY_CONFIRMED",
                Description = $"Shipment {delivery.DeliveryNumber} confirmé livré et injecté en stock",
                PerformedBy = dto.SupervisorName
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Shipment {dto.DeliveryNumber} validé et injecté en stock par {dto.SupervisorName}." });
        }

        private static (MaterialDomain domain, bool isSerialized) GuessClassification(string partNumber, string description)
        {
            var desc = (description ?? "").ToLowerInvariant();

            bool isSerialized = !(desc.Contains("pcs") || desc.Contains(" m.") || desc.Contains("per m")
                || desc.Contains("cable tie") || desc.Contains(" lk") || desc.Contains(" ltu")
                || desc.Contains("license") || desc.Contains(" lic") || desc.Contains(" sw ")
                || desc.Contains("bolt") || desc.Contains("screw") || desc.Contains("washer")
                || desc.Contains("tape") || desc.Contains("sleeve") || desc.Contains("label"));

            MaterialDomain domain;
            if (desc.Contains("wavence") || desc.Contains("mpr") || desc.Contains("mss-e") || desc.Contains("ubt-t") || desc.Contains("aim-t-o"))
                domain = MaterialDomain.Microwave;
            else if (desc.Contains("rectifier") || desc.Contains("battery") || desc.Contains("aaob") || desc.Contains("cabinet") || desc.Contains("power"))
                domain = MaterialDomain.Energy;
            else if (desc.Contains("hpe") || desc.Contains("dell") || desc.Contains("server") || desc.Contains("netact") || desc.Contains("bsc"))
                domain = MaterialDomain.Core;
            else if (desc.Contains("cable") || desc.Contains("connector") || desc.Contains("tie") || desc.Contains("bolt")
                || desc.Contains("screw") || desc.Contains("tape") || desc.Contains("sleeve") || desc.Contains("kit"))
                domain = MaterialDomain.Consumables;
            else
                domain = MaterialDomain.RAN;

            return (domain, isSerialized);
        }
    }

}
