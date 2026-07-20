namespace backend.Models;

public enum MaterialDomain
{
    RAN,
    Microwave,
    Energy,
    Core,
    Consumables
}

public class HardwareProduct
{
    public int Id { get; set; }
    public string PartNumber { get; set; }
    public string Name { get; set; }
    public MaterialDomain Domain { get; set; }
    public string MaterialGroup { get; set; }   // sous-catégorie affichée au drill-down
    public bool IsSerialized { get; set; }
}