namespace Backend.DTO
{
    public class ImportRowDto
    {
        public string PartNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class ImportRequestDto
    {
        public int WarehouseId { get; set; }
        public List<ImportRowDto> Rows { get; set; } = new();
    }

    public class ImportResultDto
    {
        public int CreatedProducts { get; set; }
        public int CreatedAssets { get; set; }
        public int UpdatedAssets { get; set; }
        public List<string> SkippedRows { get; set; } = new();
    }
}