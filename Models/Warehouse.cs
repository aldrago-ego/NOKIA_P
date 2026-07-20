namespace Backend.Models
{
    public class Warehouse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}