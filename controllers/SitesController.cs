using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

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

        // POST: api/Sites
        [HttpPost]
        public async Task<ActionResult<Site>> CreateSite([FromBody] Site newSite)
        {
            if (newSite == null) return BadRequest("Données invalides.");

            _context.Sites.Add(newSite);
            await _context.SaveChangesAsync();

            // Recharger la relation client pour le JSON de retour
            await _context.Entry(newSite).Reference(s => s.Client).LoadAsync();

            return CreatedAtAction(nameof(GetSites), new { id = newSite.Id }, newSite);
        }
        // PUT: api/Sites/{id} (Modification)
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
    }
}