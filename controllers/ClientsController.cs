using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClientsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClientsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Client>>> GetClients()
        {
            return await _context.Clients.ToListAsync();
        }

        public class CreateClientDto
        {
            public string Name { get; set; } = string.Empty;
            public string CompanyName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Nom requis.");

            var client = new Client
            {
                Name = dto.Name,
                CompanyName = dto.CompanyName,
                Email = dto.Email
            };

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();
            return Ok(client);
        }
    }
}