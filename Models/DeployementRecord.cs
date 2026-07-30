using Backend.Models;

namespace backend.Models;

public class DeploymentRecord
{
    public int Id { get; set; }
    public int SmrRequestId { get; set; }
    public SMRRequest? SmrRequest { get; set; }

    public int SiteId { get; set; }
    public Site? Site { get; set; }

    public int HardwareProductId { get; set; }
    public HardwareProduct? HardwareProduct { get; set; }

    public int Quantity { get; set; }
    public DateTime DeployedAt { get; set; } = DateTime.UtcNow;
}