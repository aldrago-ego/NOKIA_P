using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class SitesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SitesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Sites
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Site>>> GetSites()
        {
            // On inclut le Client pour afficher "Site de Yas Togo" par exemple
            return await _context.Sites
                .Include(s => s.Client)
                .ToListAsync();
        }

        
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSite(int id, [FromBody] Site updatedSite)
        {
            if (id != updatedSite.Id) return BadRequest("L'ID ne correspond pas.");

            _context.Entry(updatedSite).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Sites.Any(e => e.Id == id)) return NotFound("Site introuvable.");
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Sites/{id} (Suppression)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSite(int id)
        {
            var site = await _context.Sites.FindAsync(id);
            if (site == null) return NotFound("Site introuvable.");

            _context.Sites.Remove(site);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        public class CreateSiteDto
{
    public string SiteName { get; set; } = string.Empty;
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? ZipCode { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public int ClientId { get; set; }
}

[HttpPost]
[Authorize(Roles = "Admin,Supervisor")]
public async Task<IActionResult> Create([FromBody] CreateSiteDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.SiteName)) return BadRequest("Nom du site requis.");

    var client = await _context.Clients.FindAsync(dto.ClientId);
    if (client == null) return BadRequest("Client invalide.");

    var site = new Site
    {
        SiteName = dto.SiteName,
        Latitude = dto.Latitude ?? "",
        Longitude = dto.Longitude ?? "",
        Address = dto.Address ?? "",
        City = dto.City ?? "",
        ZipCode = dto.ZipCode ?? "",
        State = dto.State ?? "",
        Country = dto.Country ?? "",
        ClientId = dto.ClientId
    };

    _context.Sites.Add(site);
    await _context.SaveChangesAsync();

    return Ok(site);
}
    }

    
    
}