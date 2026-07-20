using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Dashboard/stats
       // GET: api/Dashboard/stats
[HttpGet("stats")]
public async Task<IActionResult> GetDashboardStats([FromQuery] int projectId)
{
    var project = await _context.Set<Project>().FindAsync(projectId);
    if (project == null) return NotFound("Projet introuvable.");

    var hwShipment = await _context.DeliveryNotes.CountAsync(d => d.ProjectId == projectId);

    // Real-Time Inventory : jamais scoped par projet, c'est le stock physique actuel
    var totalStockQuantity = await _context.PhysicalAssets
        .Where(a => a.Status == "STOCK")
        .SumAsync(a => a.Quantity);

    int? smrs = null;
    int? faultyHwRma = null;

    if (project.HasFullTraceability)
    {
        smrs = await _context.Set<SMRRequest>().CountAsync(s => s.ProjectId == projectId);

        faultyHwRma = await _context.PhysicalAssets
            .Include(a => a.DeliveryNote)
            .CountAsync(a => a.DefectiveQuantity > 0 && a.DeliveryNote != null && a.DeliveryNote.ProjectId == projectId);
    }

    return Ok(new
    {
        HwShipment = hwShipment,
        RealTimeInventory = totalStockQuantity,
        Smrs = smrs,
        FaultyHwRma = faultyHwRma,
        HasFullTraceability = project.HasFullTraceability
    });
}
    }
}