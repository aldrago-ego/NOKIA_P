using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public ProjectsController(AppDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var projects = await _context.Set<Project>()
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();
            return Ok(projects);
        }

        public class CreateProjectDto
        {
            public string Name { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            // "Projet ancien" — garde une trace des SMR/RMA/shipments historiques sans jamais
            // toucher au stock réel (voir HasFullTraceability sur Project). Réutilise le champ
            // HasFullTraceability déjà présent (jusqu'ici affiché comme badge "archivé" au
            // frontend, mais pas encore exploité côté stock).
            public bool IsLegacy { get; set; }
        }
[HttpPost]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
        return BadRequest("Nom et code du projet requis.");

    // Un projet ancien ne remplace jamais le projet courant — il s'ajoute simplement à la
    // liste, consultable via le sélecteur, sans devenir le contexte par défaut.
    if (!dto.IsLegacy)
    {
        var current = await _context.Projects.Where(p => p.IsCurrent).ToListAsync();
        current.ForEach(p => p.IsCurrent = false);
    }

    var project = new Project
    {
        Name = dto.Name,
        Code = dto.Code,
        StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
        EndDate = dto.EndDate.HasValue
            ? DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc)
            : null,
        IsCurrent = !dto.IsLegacy,
        // false ⇒ "projet ancien" : SMR/RMA/shipments/prêts restent consultables (traçabilité,
        // historique) mais n'affectent jamais le stock physique réel — voir les contrôleurs
        // correspondants, qui vérifient ce flag avant toute écriture sur PhysicalAssets.
        HasFullTraceability = !dto.IsLegacy
    };

    _context.Projects.Add(project);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetAll), new { id = project.Id }, project);
}
}
}