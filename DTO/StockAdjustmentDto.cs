namespace backend.DTO
{
    public class StockAdjustmentItemDto
    {
        public int? HardwareProductId { get; set; } // null si nouvelle référence
        public string? PartNumber { get; set; }
        public string? Description { get; set; }
        public string? Domain { get; set; }
        public string? MaterialGroup { get; set; }
        public bool? IsSerialized { get; set; }
        public int NewQuantity { get; set; } // quantité totale souhaitée après correction
    }

    public class StockAdjustmentDto
    {
        public int WarehouseId { get; set; }
        public int ProjectId { get; set; } // contexte pour le log d'activité uniquement
        public string? Reason { get; set; }
        public List<StockAdjustmentItemDto> Items { get; set; } = new();
    }
}