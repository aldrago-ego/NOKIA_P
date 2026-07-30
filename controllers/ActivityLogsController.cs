using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ActivityLogsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public ActivityLogsController(AppDbContext context) => _context = context;

        // GET: api/ActivityLogs?projectId=3&take=10
        [HttpGet]
        [Authorize(Roles = "Admin, Supervisor")]
        public async Task<IActionResult> GetRecent([FromQuery] int projectId, [FromQuery] int take = 10)
        {
            var logs = await _context.Set<ActivityLog>()
                .Where(l => l.ProjectId == projectId)
                .OrderByDescending(l => l.Timestamp)
                .Take(take)
                .ToListAsync();

            return Ok(logs);
        }
    }
}