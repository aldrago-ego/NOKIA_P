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
        // GET: api/ActivityLogs/history?projectId=3&page=1&pageSize=25&type=SMR_APPROVED
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory(
            [FromQuery] int projectId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] string? type = null)
        {
            var query = _context.ActivityLogs.Where(l => l.ProjectId == projectId);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(l => l.Type == type);

            var total = await query.CountAsync();

            var logs = await query
                .OrderByDescending(l => l.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize),
                items = logs
            });
        }

        // GET: api/ActivityLogs/types?projectId=3 — pour peupler le filtre déroulant
        [HttpGet("types")]
        public async Task<IActionResult> GetDistinctTypes([FromQuery] int projectId)
        {
            var types = await _context.ActivityLogs
                .Where(l => l.ProjectId == projectId)
                .Select(l => l.Type)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();

            return Ok(types);
        }
    }
}