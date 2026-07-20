namespace backend.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Type { get; set; } = string.Empty;         // "DELIVERY_IMPORTED", "DELIVERY_CONFIRMED", "DEFECT_MARKED", "SMR_CREATED"
    public string Description { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}