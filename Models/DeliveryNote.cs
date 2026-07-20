using Backend.Models;

namespace backend.Models;

public class DeliveryNote
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project? Project { get; set; }

    // --- Identité du shipment (issue de l'Excel) ---
    public string DeliveryNumber { get; set; } = string.Empty;  // = "Shipment no." dans ton Excel
    public string? PurchaseOrder { get; set; }
    public string Scope { get; set; } = string.Empty;            // "RAN"
    public string Location { get; set; } = string.Empty;         // "Tillburg", "Suzhou"
    public string Mot { get; set; } = string.Empty;               // "Sea" / "Air"
    public DateTime? VesselDepartureDate { get; set; }
    public DateTime? VesselArrivalDate { get; set; }
    public string? InvoiceNumber { get; set; }
    public int? ContainersCount { get; set; }
    public string? Waybill { get; set; }

    // --- Réception réelle ---
    public DateTime ArrivalDate { get; set; }
    public bool IsApproved { get; set; }        // false = Pending (annoncé) / true = Delivered (stock injecté)
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovalDate { get; set; }

    public List<PhysicalAsset> Assets { get; set; } = new();
}