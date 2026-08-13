using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("smr_request_items")]
    public class SMRRequestItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SMRRequestId { get; set; }

        [Required]
        public int HardwareProductId { get; set; }

        [ForeignKey("HardwareProductId")]
        public HardwareProduct? HardwareProduct { get; set; }

        [Required]
        public int RequestedQuantity { get; set; }

        public int AllocatedQuantity { get; set; } = 0;
    }
}