namespace backend.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public MaterialDomain Domain { get; set; }
    public int? MinimumStockThreshold { get; set; }
}