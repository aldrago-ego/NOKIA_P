using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HardwareProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public HardwareProductsController(AppDbContext context) => _context = context;

        // GET /api/HardwareProducts?search=xxx&uncategorizedOnly=true
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] bool uncategorizedOnly = false)
        {
            var query = _context.HardwareProducts.AsQueryable();
            if (uncategorizedOnly) query = query.Where(p => p.MaterialGroup == "À catégoriser");
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(p => p.PartNumber.Contains(search) || p.Name.Contains(search));

            var products = await query.OrderBy(p => p.PartNumber).ToListAsync();
            return Ok(products.Select(p => new
            {
                p.Id, p.PartNumber, p.Name, Domain = p.Domain.ToString(), p.MaterialGroup, p.IsSerialized
            }));
        }

        public class BulkCategoryDto
        {
            public List<int> ProductIds { get; set; } = new();
            public string Domain { get; set; } = string.Empty;
            public string MaterialGroup { get; set; } = string.Empty;
        }

        // PATCH /api/HardwareProducts/bulk-category
        // Assigne plusieurs codes matériel à une catégorie en une fois.
        // Comme Domain/MaterialGroup vivent sur HardwareProduct (pas sur chaque PhysicalAsset),
        // tous les exemplaires en stock de ce code héritent immédiatement de la catégorie.
        [HttpPatch("bulk-category")]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> BulkUpdateCategory([FromBody] BulkCategoryDto dto)
        {
            if (!Enum.TryParse<MaterialDomain>(dto.Domain, true, out var domain))
                return BadRequest("Domaine invalide.");

            var products = await _context.HardwareProducts
                .Where(p => dto.ProductIds.Contains(p.Id))
                .ToListAsync();

            foreach (var p in products)
            {
                p.Domain = domain;
                p.MaterialGroup = dto.MaterialGroup;
            }
            await _context.SaveChangesAsync();

            return Ok(new { updated = products.Count });
        }
        // GET: api/HardwareProducts/5
[HttpGet("{id}")]
public async Task<IActionResult> GetById(int id)
{
    var product = await _context.HardwareProducts.FindAsync(id);
    if (product == null) return NotFound();

    return Ok(new
    {
        product.Id,
        product.PartNumber,
        product.Name,
        Domain = product.Domain.ToString(),
        product.MaterialGroup,
        product.IsSerialized
    });
}

public class UpdateProductDto
{
    public string Name { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string MaterialGroup { get; set; } = string.Empty;
    public bool IsSerialized { get; set; }
}

// PATCH: api/HardwareProducts/5
[HttpPatch("{id}")]
[Authorize(Roles = "Admin,Supervisor")]
public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
{
    var product = await _context.HardwareProducts.FindAsync(id);
    if (product == null) return NotFound();

    if (!Enum.TryParse<MaterialDomain>(dto.Domain, true, out var domain))
        return BadRequest("Domain invalide.");

    product.Name = dto.Name;
    product.Domain = domain;
    product.MaterialGroup = dto.MaterialGroup;
    product.IsSerialized = dto.IsSerialized;

    await _context.SaveChangesAsync();
    return Ok(new { message = "Fiche produit mise à jour." });
}
    }
}