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
    .FirstOrDefaultAsync(dn => dn.DeliveryNumber == dto.DeliveryNumber && dn.ProjectId == dto.ProjectId);

if (delivery == null)
    return NotFound($"Aucun shipment '{dto.DeliveryNumber}' trouvé pour ce projet — importez-le d'abord.");

if (delivery.IsApproved)
    return BadRequest($"Le shipment {dto.DeliveryNumber} est déjà confirmé.");

            // NOUVEAU : récupère l'entrepôt unique pour l'assigner au matériel injecté
            var warehouse = await _context.Warehouses.FirstOrDefaultAsync();
            if (warehouse == null)
                return BadRequest("Aucun entrepôt configuré en base.");

            // Projet ancien — le matériel reçu reste consultable (détail du shipment,
            // traçabilité) mais n'est jamais injecté dans le stock réel : statut dédié
            // "STOCK_LEGACY" (exclu de tous les agrégats qui filtrent Status == "STOCK")
            // et aucun entrepôt réel assigné, comme pour tout asset sorti du stock vivant.
            var project = await _context.Projects.FindAsync(delivery.ProjectId);
            bool isLegacy = project != null && !project.HasFullTraceability;

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
                Status = isLegacy ? "STOCK_LEGACY" : "STOCK",
                IsManuallyVerified = item.IsManuallyCounted,
                VerificationStatus = verifStatus,
                DeliveryNoteId = delivery.Id,
                WarehouseId = isLegacy ? null : warehouse.Id,
                Warehouse = isLegacy ? null : warehouse,
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
            Status = isLegacy ? "STOCK_LEGACY" : "STOCK",
            IsManuallyVerified = item.IsManuallyCounted,
            VerificationStatus = verifStatus,
            DeliveryNoteId = delivery.Id,
            WarehouseId = isLegacy ? null : warehouse.Id,
            Warehouse = isLegacy ? null : warehouse,
            UploadedAt = DateTime.UtcNow
        });
    }
}
            await _context.SaveChangesAsync();

            _context.Set<ActivityLog>().Add(new ActivityLog
            {
                ProjectId = delivery.ProjectId,
                Type = "DELIVERY_CONFIRMED",
                Description = isLegacy
                    ? $"Shipment {delivery.DeliveryNumber} confirmé (projet archivé) — matériel enregistré sans affecter le stock réel"
                    : $"Shipment {delivery.DeliveryNumber} confirmé livré et injecté en stock",
                PerformedBy = dto.SupervisorName
            });
            await _context.SaveChangesAsync();

            return Ok(new {
                message = isLegacy
                    ? $"Shipment {dto.DeliveryNumber} validé par {dto.SupervisorName} — projet archivé, stock réel non affecté."
                    : $"Shipment {dto.DeliveryNumber} validé et injecté en stock par {dto.SupervisorName}."
            });
        }

     private static (MaterialDomain domain, bool isSerialized) GuessClassification(string partNumber, string description)
{
    var desc = (description ?? "").ToLowerInvariant();

    // Tout en lot par défaut — la sérialisation individuelle n'apporte pas de valeur
    // fonctionnelle réelle aujourd'hui, on la garde disponible mais désactivée par défaut.
    bool isSerialized = false;

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
