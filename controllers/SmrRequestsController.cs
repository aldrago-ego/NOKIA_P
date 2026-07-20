using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using Backend.Models;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;

namespace backend.controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SmrRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public SmrRequestsController(AppDbContext context) => _context = context;

        // GET: api/SmrRequests?projectId=3
        [HttpGet]
        public async Task<IActionResult> GetSMRRequests([FromQuery] int? projectId)
        {
            var query = _context.Set<SMRRequest>()
                .Include(r => r.Warehouse).Include(r => r.Client)
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .AsQueryable();

            if (projectId.HasValue) query = query.Where(r => r.ProjectId == projectId.Value);

            return Ok(await query.OrderByDescending(r => r.CreatedDate).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSMRRequest(int id)
        {
            var request = await _context.Set<SMRRequest>()
                .Include(r => r.Warehouse).Include(r => r.Client)
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound("Demande SMR introuvable.");
            return Ok(request);
        }

        public class CreateSmrItemDto
        {
            public int HardwareProductId { get; set; }
            public int RequestedQuantity { get; set; }
        }

        public class CreateSmrDto
        {
            public string SMRNumber { get; set; } = string.Empty;
            public int ProjectId { get; set; }
            public int WarehouseId { get; set; }
            public int ClientId { get; set; }
            public List<int> SiteIds { get; set; } = new();
            public List<CreateSmrItemDto> Items { get; set; } = new();
        }

        // POST: api/SmrRequests — création manuelle (le superviseur choisit le matériel à demander)
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateSMRRequest([FromBody] CreateSmrDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest("La demande SMR doit contenir au moins un article.");

            var request = new SMRRequest
            {
                SMRNumber = dto.SMRNumber,
                ProjectId = dto.ProjectId,
                WarehouseId = dto.WarehouseId,
                ClientId = dto.ClientId,
                SiteIds = dto.SiteIds,
                Status = "Pending",
                CreatedDate = DateTime.UtcNow,
                Items = dto.Items.Select(i => new SMRRequestItem
                {
                    HardwareProductId = i.HardwareProductId,
                    RequestedQuantity = i.RequestedQuantity
                }).ToList()
            };

            _context.Set<SMRRequest>().Add(request);
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = dto.ProjectId,
                Type = "SMR_CREATED",
                Description = $"SMR {dto.SMRNumber} créée ({dto.Items.Count} référence(s))",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            var saved = await _context.Set<SMRRequest>()
                .Include(r => r.Warehouse).Include(r => r.Client)
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .FirstOrDefaultAsync(r => r.Id == request.Id);

            return CreatedAtAction(nameof(GetSMRRequest), new { id = request.Id }, saved);
        }

        public class ShortageInfo
        {
            public int HardwareProductId { get; set; }
            public string PartNumber { get; set; } = string.Empty;
            public int Requested { get; set; }
            public int Available { get; set; }
        }

        private async Task<List<ShortageInfo>> CheckAvailability(SMRRequest request)
        {
            var shortages = new List<ShortageInfo>();
            foreach (var item in request.Items)
            {
                var assets = await _context.PhysicalAssets
                    .Include(a => a.HardwareProduct)
                    .Where(a => a.HardwareProductId == item.HardwareProductId
                             && a.WarehouseId == request.WarehouseId
                             && a.Status == "STOCK")
                    .ToListAsync();

                var available = assets.Sum(a => a.Quantity - a.DefectiveQuantity);
                if (available < item.RequestedQuantity)
                {
                    shortages.Add(new ShortageInfo
                    {
                        HardwareProductId = item.HardwareProductId,
                        PartNumber = assets.FirstOrDefault()?.HardwareProduct.PartNumber ?? $"#{item.HardwareProductId}",
                        Requested = item.RequestedQuantity,
                        Available = available
                    });
                }
            }
            return shortages;
        }

        // Consomme le stock : entame les lots/unités "bon état" en priorité, marque
        // les unités totalement consommées comme "DEPLOYED" (sorties du warehouse,
        // matériel envoyé sur site) plutôt que de les supprimer — traçabilité conservée.
        private async Task DeductStockForItem(SMRRequestItem item, int warehouseId, int quantityToDeduct)
        {
            var assets = await _context.PhysicalAssets
                .Where(a => a.HardwareProductId == item.HardwareProductId
                         && a.WarehouseId == warehouseId
                         && a.Status == "STOCK")
                .OrderByDescending(a => a.Quantity - a.DefectiveQuantity)
                .ToListAsync();

            int remaining = quantityToDeduct;
            foreach (var asset in assets)
            {
                if (remaining <= 0) break;
                int goodAvail = asset.Quantity - asset.DefectiveQuantity;
                if (goodAvail <= 0) continue;

                int take = Math.Min(remaining, goodAvail);
                asset.Quantity -= take;
                remaining -= take;

                if (asset.Quantity <= 0)
                {
                    asset.Status = "DEPLOYED";
                    asset.WarehouseId = null;
                }
            }
        }

        public class ApproveSmrDto
        {
            public string? ApprovedBy { get; set; }
            public bool ForcePartialAllocation { get; set; } // true si l'admin accepte une allocation partielle malgré la pénurie
        }

        // PATCH: api/SmrRequests/5/approve
        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveSmrDto dto)
        {
            var request = await _context.Set<SMRRequest>()
                .Include(r => r.Items).ThenInclude(i => i.HardwareProduct)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound();
            if (request.Status != "Pending") return BadRequest("Cette demande n'est plus en attente.");

            if (!dto.ForcePartialAllocation)
            {
                var shortages = await CheckAvailability(request);
                if (shortages.Any())
                    return Conflict(new { message = "Stock insuffisant pour certaines références.", shortages });
            }

            foreach (var item in request.Items)
            {
                var assets = await _context.PhysicalAssets
                    .Where(a => a.HardwareProductId == item.HardwareProductId
                             && a.WarehouseId == request.WarehouseId
                             && a.Status == "STOCK")
                    .ToListAsync();
                var available = assets.Sum(a => a.Quantity - a.DefectiveQuantity);
                int toDeduct = Math.Min(item.RequestedQuantity, available);

                await DeductStockForItem(item, request.WarehouseId, toDeduct);
                item.AllocatedQuantity = toDeduct;
            }

            request.Status = "Approved";
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = request.ProjectId,
                Type = "SMR_APPROVED",
                Description = $"SMR {request.SMRNumber} approuvée — matériel déduit du stock",
                PerformedBy = dto.ApprovedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"SMR {request.SMRNumber} approuvée." });
        }

        public class RejectSmrDto
        {
            public string? Reason { get; set; }
            public string? RejectedBy { get; set; }
        }

        // PATCH: api/SmrRequests/5/reject
        [HttpPatch("{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectSmrDto dto)
        {
            var request = await _context.Set<SMRRequest>().FindAsync(id);
            if (request == null) return NotFound();
            if (request.Status != "Pending") return BadRequest("Cette demande n'est plus en attente.");

            request.Status = "Rejected";
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = request.ProjectId,
                Type = "SMR_REJECTED",
                Description = $"SMR {request.SMRNumber} rejetée" + (string.IsNullOrEmpty(dto.Reason) ? "" : $" — {dto.Reason}"),
                PerformedBy = dto.RejectedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = $"SMR {request.SMRNumber} rejetée." });
        }
    }
}