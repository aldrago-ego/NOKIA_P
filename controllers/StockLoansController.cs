using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.DTO;
using backend.Models;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StockLoansController : ControllerBase
    {
        private readonly AppDbContext _context;
        public StockLoansController(AppDbContext context) => _context = context;

        // GET: api/StockLoans?projectId=3&direction=Loaned
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int projectId, [FromQuery] string? direction)
        {
            var query = _context.StockLoans
                .Include(l => l.Items)
                .Where(l => l.ProjectId == projectId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(direction) && Enum.TryParse<LoanDirection>(direction, true, out var dir))
                query = query.Where(l => l.Direction == dir);

            var loans = await query.OrderByDescending(l => l.LoanDate).ToListAsync();

            return Ok(loans.Select(l => new
            {
                l.Id,
                Direction = l.Direction.ToString(),
                l.PartyName,
                l.Notes,
                l.Status,
                l.LoanDate,
                l.ExpectedReturnDate,
                l.ReturnedDate,
                Items = l.Items.Select(i => new { i.Id, i.PartNumber, i.Description, i.Quantity })
            }));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateLoanDto dto)
        {
            if (!Enum.TryParse<LoanDirection>(dto.Direction, true, out var direction))
                return BadRequest("Direction invalide (Loaned ou Borrowed).");
            if (string.IsNullOrWhiteSpace(dto.PartyName)) return BadRequest("Nom du client/source requis.");
            if (dto.Items.Count == 0) return BadRequest("Ajoutez au moins une référence.");

            var loan = new StockLoan
            {
                ProjectId = dto.ProjectId,
                WarehouseId = dto.WarehouseId,
                Direction = direction,
                PartyName = dto.PartyName,
                Notes = dto.Notes,
                ExpectedReturnDate = dto.ExpectedReturnDate,
                Status = "Active",
                Items = dto.Items.Select(i => new StockLoanItem
                {
                    HardwareProductId = i.HardwareProductId,
                    PartNumber = i.PartNumber,
                    Description = i.Description,
                    Quantity = i.Quantity
                }).ToList()
            };

            if (direction == LoanDirection.Loaned)
            {
                // Vérifie la disponibilité avant toute écriture
                foreach (var item in loan.Items)
                {
                    if (item.HardwareProductId == null)
                        return BadRequest("Une référence à prêter doit exister au catalogue.");

                    var available = await _context.PhysicalAssets
                        .Where(a => a.HardwareProductId == item.HardwareProductId
                                 && a.WarehouseId == dto.WarehouseId && a.Status == "STOCK")
                        .SumAsync(a => a.Quantity - a.DefectiveQuantity);

                    if (available < item.Quantity)
                        return BadRequest($"Stock insuffisant pour {item.PartNumber} ({available} disponible).");
                }

                foreach (var item in loan.Items)
                    await DeductStock(item.HardwareProductId!.Value, dto.WarehouseId, item.Quantity);
            }
            // Borrowed : simple registre, aucun impact sur le stock

            _context.StockLoans.Add(loan);
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = dto.ProjectId,
                Type = direction == LoanDirection.Loaned ? "STOCK_LOANED" : "STOCK_BORROWED",
                Description = direction == LoanDirection.Loaned
                    ? $"Matériel prêté à {dto.PartyName} ({loan.Items.Count} référence(s), hors SMR)"
                    : $"Matériel emprunté auprès de {dto.PartyName} ({loan.Items.Count} référence(s))",
                PerformedBy = "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { loan.Id });
        }

        [HttpPatch("{id}/return")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Return(int id, [FromBody] ReturnLoanDto dto)
        {
            var loan = await _context.StockLoans.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
            if (loan == null) return NotFound();
            if (loan.Status != "Active") return BadRequest("Ce mouvement n'est plus actif.");

            if (loan.Direction == LoanDirection.Loaned)
            {
                // Le client rend le matériel : ré-injection en stock (nouveau lot, traçable)
                foreach (var item in loan.Items)
                {
                    _context.PhysicalAssets.Add(new PhysicalAsset
                    {
                        SerialNumber = $"RETOUR-PRET-{loan.Id}-{item.HardwareProductId}",
                        HardwareProductId = item.HardwareProductId!.Value,
                        HardwareProduct = (await _context.HardwareProducts.FindAsync(item.HardwareProductId!.Value))!,
                        Quantity = item.Quantity,
                        Status = "STOCK",
                        IsManuallyVerified = true,
                        VerificationStatus = "CONFORME",
                        WarehouseId = loan.WarehouseId,
                        UploadedAt = DateTime.UtcNow
                    });
                }
            }
            // Borrowed : on rend le matériel à son propriétaire, aucun impact stock (jamais possédé)

            loan.Status = "Returned";
            loan.ReturnedDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _context.ActivityLogs.Add(new ActivityLog
            {
                ProjectId = loan.ProjectId,
                Type = "STOCK_LOAN_RETURNED",
                Description = $"Retour {(loan.Direction == LoanDirection.Loaned ? "du prêt" : "de l'emprunt")} — {loan.PartyName}",
                PerformedBy = dto.PerformedBy ?? "Admin"
            });
            await _context.SaveChangesAsync();

            return Ok(new { message = "Retour enregistré." });
        }

        private async Task DeductStock(int hardwareProductId, int warehouseId, int quantityToDeduct)
        {
            var assets = await _context.PhysicalAssets
                .Where(a => a.HardwareProductId == hardwareProductId && a.WarehouseId == warehouseId && a.Status == "STOCK")
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
                    asset.Status = "LOANED_OUT";
                    asset.WarehouseId = null;
                }
            }
        }
    }
}