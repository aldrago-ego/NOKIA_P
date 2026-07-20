namespace backend.Models;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;   // "New Horizon"
    public string Code { get; set; } = string.Empty;    // "P1", "P2", "P3"
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public bool HasFullTraceability { get; set; }        // false pour P1/P2 (historique Excel, pas de RMA/SMR fiables)
}