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
        [Authorize(Roles = "Admin")]
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
    }
}