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
        }
[HttpPost]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
        return BadRequest("Nom et code du projet requis.");

    var current = await _context.Projects.Where(p => p.IsCurrent).ToListAsync();
    current.ForEach(p => p.IsCurrent = false);

    var project = new Project
    {
        Name = dto.Name,
        Code = dto.Code,
        StartDate = DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc),
        EndDate = dto.EndDate.HasValue
            ? DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc)
            : null,
        IsCurrent = true,
        HasFullTraceability = true
    };

    _context.Projects.Add(project);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetAll), new { id = project.Id }, project);
}
}
}