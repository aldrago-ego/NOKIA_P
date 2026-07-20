using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Site
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SiteName { get; set; } = string.Empty;

        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? ZipCode { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }

        // Liaison avec le Client
        [Required]
        public int ClientId { get; set; }
        
        [ForeignKey("ClientId")]
        public Client? Client { get; set; }
    }
}