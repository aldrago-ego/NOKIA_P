namespace Backend.DTO
{
    public class DomainSummaryDto
    {
        public string Domain { get; set; } = string.Empty;      // "RAN", "Microwave", ...
        public int DistinctReferences { get; set; }
        public int TotalQuantity { get; set; }
        public int GoodQuantity { get; set; }
        public int DefectiveQuantity { get; set; }
    }

    public class MaterialGroupSummaryDto
    {
        public string MaterialGroup { get; set; } = string.Empty;
        public int DistinctReferences { get; set; }
        public int TotalQuantity { get; set; }
        public int DefectiveQuantity { get; set; }
    }

    public class InventorySummaryDto
    {
        public int TotalQuantity { get; set; }
        public int TotalDefective { get; set; }
        public int TotalReferences { get; set; }
        public List<DomainSummaryDto> ByDomain { get; set; } = new();
    }
}