using backend.Models;
using Backend.Models;

namespace Backend.Models
{

public class PhysicalAsset
{
    public int Id { get; set; }
    public required string SerialNumber { get; set; }

    public int HardwareProductId { get; set; }
    public required HardwareProduct HardwareProduct { get; set; }

    public int Quantity { get; set; } = 1;
    public int DefectiveQuantity { get; set; } = 0;

    public required string Status { get; set; }   // STOCK, TRANSIT, PENDING
    public bool IsManuallyVerified { get; set; }
    public required string VerificationStatus { get; set; }

    public int? WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public int? SiteId { get; set; }
    public Site? Site { get; set; }

    public int? DeliveryNoteId { get; set; }
    public DeliveryNote? DeliveryNote { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
}
// DTO/Inventory/FaultyAssetDto.cs
namespace Backend.DTO.Inventory{
    public class FaultyAssetDto
    {
        public int AssetId { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public int DefectiveQuantity { get; set; }
        public string? WarehouseName { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}