namespace backend.DTO
{
    public class CreateLoanItemDto
    {
        public int? HardwareProductId { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class CreateLoanDto
    {
        public int ProjectId { get; set; }
        public int WarehouseId { get; set; }
        public string Direction { get; set; } = string.Empty; // "Loaned" ou "Borrowed"
        public string PartyName { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }
        public List<CreateLoanItemDto> Items { get; set; } = new();
    }

    public class ReturnLoanDto
    {
        public string? PerformedBy { get; set; }
    }
}