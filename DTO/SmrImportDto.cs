namespace backend.DTO
{
    public class SmrImportLineDto
    {
        public string SiteName { get; set; } = string.Empty;
        public string SiteType { get; set; } = string.Empty;
        public string PartNumber { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class SmrImportRequestDto
    {
        public int ProjectId { get; set; }
        public int WarehouseId { get; set; }
        public int SubcontractorId { get; set; }
        public string SmrNumber { get; set; } = string.Empty;
        public int ClientId { get; set; }
        public List<SmrImportLineDto> Lines { get; set; } = new();
    }
}