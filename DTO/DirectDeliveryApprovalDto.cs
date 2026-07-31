namespace backend.DTO
{
    public class DirectDeliveryApprovalDto
    {
        public int ProjectId { get; set; }
        public string DeliveryNumber { get; set; } = string.Empty;
        public string PurchaseOrder { get; set; } = string.Empty;
        public string SupervisorName { get; set; } = string.Empty;
        public List<DirectAssetInputDto> VerifiedAssets { get; set; } = new();
    }

   public class DirectAssetInputDto
{
    public string PartNumber { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string MaterialGroup { get; set; } = string.Empty;
    public string? Domain { get; set; }          // "RAN"/"Microwave"/"Energy"/"Core"/"Consumables" — requis si nouvelle référence
    public bool? IsSerialized { get; set; }       // requis si nouvelle référence
    public int ExpectedQty { get; set; }
    public int ReceivedQty { get; set; }
    public string ScannedSerial { get; set; } = string.Empty;
    public bool IsManuallyCounted { get; set; }
}
}