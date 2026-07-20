using Backend.Models;

namespace backend.Models;

public class RmaRequest
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public int WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }

    public string RmaNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Shipped, Closed
    public string? Notes { get; set; }
    public string? CourierReference { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? ShippedDate { get; set; }
    public DateTime? ClosedDate { get; set; }

    public List<RmaRequestItem> Items { get; set; } = new();
}