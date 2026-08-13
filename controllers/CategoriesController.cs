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
        [HttpGet("stock-status")]
        public async Task<IActionResult> GetStockStatus()
        {
            var categories = await _context.Categories
                .Where(c => c.MinimumStockThreshold != null)
                .ToListAsync();

            var result = new List<object>();
            foreach (var cat in categories)
            {
                var currentQty = await _context.PhysicalAssets
                    .Include(a => a.HardwareProduct)
                    .Where(a => a.HardwareProduct.MaterialGroup == cat.Name && a.Status == "STOCK")
                    .SumAsync(a => a.Quantity);

                result.Add(new
                {
                    cat.Id,
                    cat.Name,
                    Threshold = cat.MinimumStockThreshold,
                    CurrentQuantity = currentQty,
                    IsLow = currentQty < cat.MinimumStockThreshold
                });
            }

            return Ok(result.OrderByDescending(r => ((dynamic)r).IsLow));
        }
        [HttpGet("low-stock-items")]
        public async Task<IActionResult> GetLowStockItems()
        {
            var categories = await _context.Categories
                .Where(c => c.MinimumStockThreshold != null)
                .ToListAsync();

            var result = new List<object>();

            foreach (var cat in categories)
            {
                var products = await _context.HardwareProducts
                    .Where(p => p.MaterialGroup == cat.Name)
                    .ToListAsync();

                foreach (var product in products)
                {
                    var qty = await _context.PhysicalAssets
                        .Where(a => a.HardwareProductId == product.Id && a.Status == "STOCK")
                        .SumAsync(a => a.Quantity);

                    if (qty < cat.MinimumStockThreshold)
                    {
                        result.Add(new
                        {
                            product.PartNumber,
                            product.Name,
                            Category = cat.Name,
                            Quantity = qty,
                            Threshold = cat.MinimumStockThreshold
                        });
                    }
                }
            }

            return Ok(result.OrderBy(r => ((dynamic)r).Quantity));
        }
    }
}