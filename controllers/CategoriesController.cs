using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;
        public CategoriesController(AppDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.Domain).ThenBy(c => c.Name)
                .ToListAsync();

            var counts = await _context.HardwareProducts
                .GroupBy(p => p.MaterialGroup)
                .Select(g => new { MaterialGroup = g.Key, Count = g.Count() })
                .ToListAsync();

            var result = categories.Select(c => new
            {
                c.Id,
                c.Name,
                Domain = c.Domain.ToString(),
                ProductCount = counts.FirstOrDefault(x => x.MaterialGroup == c.Name)?.Count ?? 0
            });

            return Ok(result);
        }

        public class CreateCategoryDto
        {
            public string Name { get; set; } = string.Empty;
            public string Domain { get; set; } = string.Empty;
        }

        [HttpPost]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Nom de catégorie requis.");
            if (!Enum.TryParse<MaterialDomain>(dto.Domain, true, out var domain))
                return BadRequest("Domaine invalide.");

            if (await _context.Categories.AnyAsync(c => c.Name == dto.Name))
                return BadRequest("Cette catégorie existe déjà.");

            var category = new Category { Name = dto.Name, Domain = domain };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            return Ok(category);
        }
        public class UpdateThresholdDto
        {
            public int? MinimumStockThreshold { get; set; }
        }

        [HttpPatch("{id}/threshold")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateThreshold(int id, [FromBody] UpdateThresholdDto dto)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();

            category.MinimumStockThreshold = dto.MinimumStockThreshold;
            await _context.SaveChangesAsync();
            return Ok(category);
        }

        // GET: api/Categories/stock-status — alerte seuil bas, global (indépendant du projet)
        // Une seule requête groupée pour toutes les catégories, au lieu d'une requête par
        // catégorie — sur une base distante, N allers-retours séquentiels dépassent vite le
        // timeout du front (15s) dès qu'il y a plus qu'une poignée de catégories.
        [HttpGet("stock-status")]
        public async Task<IActionResult> GetStockStatus()
        {
            var categories = await _context.Categories
                .Where(c => c.MinimumStockThreshold != null)
                .ToListAsync();

            var quantitiesByGroup = await _context.PhysicalAssets
                .Include(a => a.HardwareProduct)
                .Where(a => a.Status == "STOCK")
                .GroupBy(a => a.HardwareProduct.MaterialGroup)
                .Select(g => new { MaterialGroup = g.Key, Total = g.Sum(a => a.Quantity) })
                .ToDictionaryAsync(x => x.MaterialGroup, x => x.Total);

            var result = categories
                .Select(cat =>
                {
                    var currentQty = quantitiesByGroup.TryGetValue(cat.Name, out var q) ? q : 0;
                    return new
                    {
                        cat.Id,
                        cat.Name,
                        Threshold = cat.MinimumStockThreshold,
                        CurrentQuantity = currentQty,
                        IsLow = currentQty < cat.MinimumStockThreshold
                    };
                })
                .OrderByDescending(r => r.IsLow)
                .ToList();

            return Ok(result);
        }

        // GET: api/Categories/low-stock-items — mêmes principes : produits + quantités en
        // stock récupérés chacun en une seule requête groupée, jointure faite en mémoire.
        [HttpGet("low-stock-items")]
        public async Task<IActionResult> GetLowStockItems()
        {
            var categories = await _context.Categories
                .Where(c => c.MinimumStockThreshold != null)
                .ToListAsync();
            var thresholdByCategory = categories.ToDictionary(c => c.Name, c => c.MinimumStockThreshold!.Value);
            var categoryNames = categories.Select(c => c.Name).ToList();

            var products = await _context.HardwareProducts
                .Where(p => categoryNames.Contains(p.MaterialGroup))
                .Select(p => new { p.Id, p.PartNumber, p.Name, p.MaterialGroup })
                .ToListAsync();

            var quantitiesByProduct = await _context.PhysicalAssets
                .Where(a => a.Status == "STOCK")
                .GroupBy(a => a.HardwareProductId)
                .Select(g => new { ProductId = g.Key, Total = g.Sum(a => a.Quantity) })
                .ToDictionaryAsync(x => x.ProductId, x => x.Total);

            var result = products
                .Select(p =>
                {
                    var qty = quantitiesByProduct.TryGetValue(p.Id, out var q) ? q : 0;
                    return new
                    {
                        p.PartNumber,
                        p.Name,
                        Category = p.MaterialGroup,
                        Quantity = qty,
                        Threshold = thresholdByCategory[p.MaterialGroup]
                    };
                })
                .Where(r => r.Quantity < r.Threshold)
                .OrderBy(r => r.Quantity)
                .ToList();

            return Ok(result);
        }
    }
}