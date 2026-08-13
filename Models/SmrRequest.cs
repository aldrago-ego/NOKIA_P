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
        // Ajout sur SMRRequest.cs
        public int? SubcontractorId { get; set; }
        public Subcontractor? Subcontractor { get; set; }
        public Project? Project { get; set; }

        [ForeignKey("ClientId")]
        public Client? Client { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Rejected", "Dispatched"

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public List<SmrRequestSiteItem> SmrRequestSiteItems { get; set; } = new();

        // Liste des sites destinataires de cette demande SMR
        public List<int> SiteIds { get; set; } = new();

        // Lignes de matériels demandées (Relation One-to-Many)
        public List<SMRRequestItem> Items { get; set; } = new();
    }

  

}