namespace backend.DTO
{
    public class ExpectedMaterialLineDto
    {
        public string PartNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int ExpectedQuantity { get; set; }
        public string? Category { get; set; }
    }

    public class ShipmentImportRowDto
    {
        public string ShipmentNo { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Mot { get; set; } = string.Empty;
        public DateTime? VesselDepartureDate { get; set; }
        public DateTime? VesselArrivalDate { get; set; }
        public string? InvoiceNumber { get; set; }
        public int? ContainersCount { get; set; }
        public string? Waybill { get; set; }
        public List<ExpectedMaterialLineDto> Materials { get; set; } = new(); // NOUVEAU
    }

    public class ShipmentImportRequestDto
    {
        public int ProjectId { get; set; }
        public List<ShipmentImportRowDto> Rows { get; set; } = new();
    }
}