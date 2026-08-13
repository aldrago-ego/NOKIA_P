namespace backend.Models;

public class ExpectedDeliveryLine
{
    public int Id { get; set; }
    public int DeliveryNoteId { get; set; }
    public DeliveryNote? DeliveryNote { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ExpectedQuantity { get; set; }
    public string? Category { get; set; }
}