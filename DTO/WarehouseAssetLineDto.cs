namespace Backend.DTO
{
    public class WarehouseAssetLineDto
    {
        public int HardwareProductId { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public string MaterialGroup { get; set; } = string.Empty;
        public bool IsSerialized { get; set; }
        public int TotalQuantity { get; set; }
        public int DefectiveQuantity { get; set; }

        // Utile uniquement si IsSerialized = true, pour lister les unités précises (RMA ciblé)
        public List<PhysicalAssetLineDto> Units { get; set; } = new();
    }

    public class PhysicalAssetLineDto
    {
        public int Id { get; set; }
        public string SerialNumber { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public int DefectiveQuantity { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}