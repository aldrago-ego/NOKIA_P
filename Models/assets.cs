using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("assets")]
    public class Asset
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ImageUrl { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime? UploadedAt { get; set; } = DateTime.UtcNow;

        // Liaison avec le Site
        [Required]
        public int SiteId { get; set; }
        
        [ForeignKey("SiteId")]
        public Site? Site { get; set; }
    }
}