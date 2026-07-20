public class DashboardStatsDto
{
    public int HwShipment { get; set; }
    public int RealTimeInventory { get; set; }   // jamais scoped par projet
    public int? Smrs { get; set; }               // null si HasFullTraceability == false
    public int? FaultyHwRma { get; set; }         // idem
    public bool HasFullTraceability { get; set; }
}