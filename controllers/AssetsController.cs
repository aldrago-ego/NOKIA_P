using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AssetsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AssetsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Assets/site/{siteId} -> Récupère les photos d'un site spécifique
        [HttpGet("site/{siteId}")]
        public async Task<ActionResult<IEnumerable<Asset>>> GetAssetsBySite(int siteId)
        {
            var assets = await _context.Assets
                .Where(a => a.SiteId == siteId)
                .OrderByDescending(a => a.UploadedAt)
                .ToListAsync();

            return Ok(assets);
        }

        // POST: api/Assets -> Ajoute une nouvelle photo à un site
       [HttpPost]
        public async Task<ActionResult<Asset>> UploadAsset([FromBody] Asset newAsset)
        {
            if (newAsset == null) return BadRequest("Données invalides.");

            // Assurer que les validations de base passent
            if (!ModelState.IsValid) return BadRequest(ModelState);

            newAsset.UploadedAt = DateTime.UtcNow;
            _context.Assets.Add(newAsset);
            await _context.SaveChangesAsync();

            // Utilisation d'un retour sécurisé pour éviter le conflit avec la route "site/{siteId}"
            return StatusCode(201, newAsset);
        }
    }
}