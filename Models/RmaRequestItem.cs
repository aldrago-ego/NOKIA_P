using Backend.Models;

namespace backend.Models;

public class RmaRequestItem
{
    public int Id { get; set; }
    public int RmaRequestId { get; set; }
    public RmaRequest? RmaRequest { get; set; }

    public int PhysicalAssetId { get; set; }
    public PhysicalAsset? PhysicalAsset { get; set; }

    public int Quantity { get; set; } // nombre d'unités défectueuses incluses dans ce retour
}