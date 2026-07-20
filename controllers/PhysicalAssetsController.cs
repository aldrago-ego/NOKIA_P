using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.DTO;
using backend.Models;
using Backend.DTO.Inventory;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PhysicalAssetsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PhysicalAssetsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/PhysicalAssets/summary
        // Alimente la card "Real-Time Inventory" (agrégat par Domain)
        [HttpGet("summary")]
        public async Task<ActionResult<InventorySummaryDto>> GetSummary()
        {
            var assets = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Where(a => a.Status == "STOCK") // uniquement ce qui est physiquement en entrepôt
                .ToListAsync();

            var byDomain = assets
                .GroupBy(a => a.HardwareProduct.Domain.ToString())
                .Select(g => new DomainSummaryDto
                {
                    Domain = g.Key,
                    DistinctReferences = g.Select(a => a.HardwareProductId).Distinct().Count(),
                    TotalQuantity = g.Sum(a => a.Quantity),
                    DefectiveQuantity = g.Sum(a => a.DefectiveQuantity),
                    GoodQuantity = g.Sum(a => a.Quantity - a.DefectiveQuantity)
                })
                .OrderByDescending(d => d.TotalQuantity)
                .ToList();

            var summary = new InventorySummaryDto
            {
                TotalQuantity = assets.Sum(a => a.Quantity),
                TotalDefective = assets.Sum(a => a.DefectiveQuantity),
                TotalReferences = assets.Select(a => a.HardwareProductId).Distinct().Count(),
                ByDomain = byDomain
            };

            return Ok(summary);
        }

        // GET: api/PhysicalAssets/summary/{domain}
        // Drill-down d'un domaine vers ses MaterialGroup (clic sur une tuile RAN/Microwave/...)
        [HttpGet("summary/{domain}")]
        public async Task<ActionResult<List<MaterialGroupSummaryDto>>> GetDomainBreakdown(string domain)
        {
            if (!Enum.TryParse<MaterialDomain>(domain, true, out var parsedDomain))
                return BadRequest($"Domain invalide : {domain}");

            var assets = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Where(a => a.HardwareProduct.Domain == parsedDomain && a.Status == "STOCK")
                .ToListAsync();

            var groups = assets
                .GroupBy(a => a.HardwareProduct.MaterialGroup)
                .Select(g => new MaterialGroupSummaryDto
                {
                    MaterialGroup = g.Key,
                    DistinctReferences = g.Select(a => a.HardwareProductId).Distinct().Count(),
                    TotalQuantity = g.Sum(a => a.Quantity),
                    DefectiveQuantity = g.Sum(a => a.DefectiveQuantity)
                })
                .OrderByDescending(g => g.TotalQuantity)
                .ToList();

            return Ok(groups);
        }

        // GET: api/PhysicalAssets/by-warehouse/5
        // Alimente Warehouse.tsx : liste par référence, groupée par Domain > MaterialGroup côté front
        [HttpGet("by-warehouse/{warehouseId}")]
        public async Task<ActionResult<List<WarehouseAssetLineDto>>> GetByWarehouse(int warehouseId)
        {
            var assets = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Where(a => a.WarehouseId == warehouseId)
                .ToListAsync();

            var lines = assets
                .GroupBy(a => a.HardwareProduct)
                .Select(g => new WarehouseAssetLineDto
                {
                    HardwareProductId = g.Key.Id,
                    PartNumber = g.Key.PartNumber,
                    Name = g.Key.Name,
                    Domain = g.Key.Domain.ToString(),
                    MaterialGroup = g.Key.MaterialGroup,
                    IsSerialized = g.Key.IsSerialized,
                    TotalQuantity = g.Sum(a => a.Quantity),
                    DefectiveQuantity = g.Sum(a => a.DefectiveQuantity),
                    Units = g.Select(a => new PhysicalAssetLineDto
                    {
                        Id = a.Id,
                        SerialNumber = a.SerialNumber,
                        Quantity = a.Quantity,
                        DefectiveQuantity = a.DefectiveQuantity,
                        Status = a.Status
                    }).ToList()
                })
                .OrderBy(l => l.Domain).ThenBy(l => l.MaterialGroup).ThenBy(l => l.Name)
                .ToList();

            return Ok(lines);
        }

        // PATCH: api/PhysicalAssets/5/defect
        // Marque un asset (unité ou lot) comme défectueux, avec quantité
        [HttpPatch("{id}/defect")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateDefect(int id, [FromBody] UpdateDefectDto dto)
        {
            var asset = await _context.PhysicalAssets.FindAsync(id);
            if (asset == null) return NotFound();

            if (dto.DefectiveQuantity < 0 || dto.DefectiveQuantity > asset.Quantity)
                return BadRequest("La quantité défectueuse doit être comprise entre 0 et la quantité totale.");

            asset.DefectiveQuantity = dto.DefectiveQuantity;
            await _context.SaveChangesAsync();

            return Ok(new { asset.Id, asset.DefectiveQuantity });
        }

        // POST: api/PhysicalAssets/import
        // Réception des lignes lues côté front (SheetJS) depuis le bouton "Importer Excel"
        [HttpPost("import")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ImportResultDto>> ImportRows([FromBody] ImportRequestDto request)
        {
            var warehouse = await _context.Warehouses.FindAsync(request.WarehouseId);
            if (warehouse == null) return BadRequest("Entrepôt invalide.");

            var result = new ImportResultDto();

            foreach (var row in request.Rows)
            {
                if (string.IsNullOrWhiteSpace(row.PartNumber) || string.IsNullOrWhiteSpace(row.Description))
                {
                    result.SkippedRows.Add($"Ligne ignorée (champs vides) : {row.PartNumber}");
                    continue;
                }

                var product = await _context.HardwareProducts
                    .FirstOrDefaultAsync(p => p.PartNumber == row.PartNumber);

                if (product == null)
                {
                    product = new HardwareProduct
                    {
                        PartNumber = row.PartNumber,
                        Name = row.Description,
                        Domain = MaterialDomain.Consumables, // valeur par défaut, à corriger manuellement ensuite
                        MaterialGroup = "À catégoriser",
                        IsSerialized = GuessIsSerialized(row.Description)
                    };
                    _context.HardwareProducts.Add(product);
                    await _context.SaveChangesAsync();
                    result.CreatedProducts++;
                }

                var existingAsset = await _context.PhysicalAssets
                    .FirstOrDefaultAsync(a => a.HardwareProductId == product.Id
                                            && a.WarehouseId == request.WarehouseId
                                            && a.Status == "STOCK");

                if (existingAsset != null && !product.IsSerialized)
                {
                    // Lot existant non-sérialisé : on additionne la quantité importée
                    existingAsset.Quantity += row.Quantity;
                    result.UpdatedAssets++;
                }
                else
                {
                    _context.PhysicalAssets.Add(new PhysicalAsset
                    {
                        SerialNumber = product.IsSerialized
                            ? $"AUTO-{Guid.NewGuid().ToString()[..8].ToUpper()}"
                            : $"LOT-{DateTime.UtcNow:yyyyMMdd}-{product.PartNumber}",
                        HardwareProductId = product.Id,
                        HardwareProduct = product,
                        Quantity = row.Quantity,
                        Status = "STOCK",
                        IsManuallyVerified = false,
                        VerificationStatus = "CONFORME",
                        WarehouseId = request.WarehouseId,
                        Warehouse = warehouse,
                        UploadedAt = DateTime.UtcNow
                    });
                    result.CreatedAssets++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(result);
        }
        // dans PhysicalAssetsController.cs
        // GET: api/PhysicalAssets/faulty
        [HttpGet("faulty")]
        public async Task<ActionResult<List<FaultyAssetDto>>> GetFaultyAssets()
        {
            var faulty = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Include(a => a.Warehouse)
                .Where(a => a.DefectiveQuantity > 0)
                .OrderByDescending(a => a.UploadedAt)
                .Select(a => new FaultyAssetDto
                {
                    AssetId = a.Id,
                    PartNumber = a.HardwareProduct.PartNumber,
                    Name = a.HardwareProduct.Name,
                    Domain = a.HardwareProduct.Domain.ToString(),
                    DefectiveQuantity = a.DefectiveQuantity,
                    WarehouseName = a.Warehouse != null ? a.Warehouse.Name : null,
                    UploadedAt = a.UploadedAt
                })
                .ToListAsync();

            return Ok(faulty);
        }
        // GET: api/PhysicalAssets/defective?warehouseId=1
        [HttpGet("defective")]
        public async Task<IActionResult> GetDefective([FromQuery] int warehouseId)
        {
            var assets = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Where(a => a.WarehouseId == warehouseId && a.DefectiveQuantity > 0 && a.Status == "STOCK")
                .ToListAsync();

            return Ok(assets.Select(a => new
            {
                a.Id,
                a.SerialNumber,
                PartNumber = a.HardwareProduct.PartNumber,
                Name = a.HardwareProduct.Name,
                a.DefectiveQuantity
            }));
        }


        private static bool GuessIsSerialized(string description)
        {
            var desc = description.ToLowerInvariant();
            string[] lotKeywords = { "per m", "pcs", " lk", " ltu", " cltu", " sw ", "license", "lic" };
            return !lotKeywords.Any(k => desc.Contains(k));
        }
    }

}