using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WarehousesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WarehousesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Warehouse>>> GetWarehouses()
        {
            return await _context.Warehouses.ToListAsync();
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Warehouse>> PostWarehouse(Warehouse warehouse)
        {
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetWarehouses), new { id = warehouse.Id }, warehouse);
        }
    }
}