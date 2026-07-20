namespace backend.DTO;

public class DeliveryApprovalDto
{
    public string SupervisorName { get; set; }
    public List<AssetVerificationInput> VerifiedAssets { get; set; }
}

public class AssetVerificationInput
{
    public string ScannedOrGeneratedSerial { get; set; } // Le QR Code ou le code généré
    public int HardwareProductId { get; set; }
    public bool IsManuallyCounted { get; set; }
    public string Status { get; set; } // CONFORME, MANQUANT
}