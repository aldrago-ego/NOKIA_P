using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Models;

namespace backend.Models
{
    [Table("smr_requests")]
    public class SMRRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string SMRNumber { get; set; } = string.Empty;

        [Required]
        public int WarehouseId { get; set; }
        
        [ForeignKey("WarehouseId")]
        public Warehouse? Warehouse { get; set; }

        [Required]
        public int ClientId { get; set; }
        public int ProjectId { get; set; }
public Project? Project { get; set; }
        
        [ForeignKey("ClientId")]
        public Client? Client { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Rejected", "Dispatched"

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        // Liste des sites destinataires de cette demande SMR
        public List<int> SiteIds { get; set; } = new();

        // Lignes de matériels demandées (Relation One-to-Many)
        public List<SMRRequestItem> Items { get; set; } = new();
    }

    [Table("smr_request_items")]
    public class SMRRequestItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SMRRequestId { get; set; }

        [Required]
        public int HardwareProductId { get; set; }
        
        // 👈 C'est CETTE ligne précise (la propriété de navigation) qui devait manquer ou être mal orthographiée !
        [ForeignKey("HardwareProductId")]
        public HardwareProduct? HardwareProduct { get; set; }

        [Required]
        public int RequestedQuantity { get; set; }

        public int AllocatedQuantity { get; set; } = 0; // Quantité physique réellement préparée lors du kitting
    }
}