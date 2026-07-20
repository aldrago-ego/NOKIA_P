namespace backend.DTO
{
    public class CreateRmaItemDto
    {
        public int PhysicalAssetId { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateRmaDto
    {
        public int ProjectId { get; set; }
        public int WarehouseId { get; set; }
        public string RmaNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public List<CreateRmaItemDto> Items { get; set; } = new();
    }

    public class ShipRmaDto
    {
        public string? CourierReference { get; set; }
        public string? PerformedBy { get; set; }
    }

    public class CloseRmaDto
    {
        public string? PerformedBy { get; set; }
    }
}