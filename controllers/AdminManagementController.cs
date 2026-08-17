using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Backend.Data;
using backend.DTO;
using backend.Models;

namespace Backend.Controllers
{
    // Réservé au SuperAdmin — gestion de TOUS les comptes utilisateurs (SuperAdmin, Admin,
    // Supervisor, Viewer). Un Admin, même avec Role="Admin", n'a pas accès à ces routes :
    // seul le token SuperAdmin porte le rôle "SuperAdmin".
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin")]
    public class AdminManagementController : ControllerBase
    {
        private static readonly string[] ValidRoles = { "SuperAdmin", "Admin", "Supervisor", "Viewer" };

        private readonly AppDbContext _context;

        public AdminManagementController(AppDbContext context)
        {
            _context = context;
        }

        private string? CurrentUsername => User.Identity?.Name;

        // GET: api/AdminManagement/users — tous les comptes, tous rôles confondus.
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.Role).ThenBy(u => u.Username)
                .Select(u => new AdminUserDto { Id = u.Id, Username = u.Username, DisplayName = u.DisplayName, Role = u.Role })
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/AdminManagement/users — crée un compte avec le rôle de son choix.
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Nom d'utilisateur et mot de passe requis.");
            if (dto.Password.Length < 8)
                return BadRequest("Le mot de passe doit contenir au moins 8 caractères.");
            if (!ValidRoles.Contains(dto.Role))
                return BadRequest("Rôle invalide.");
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return Conflict("Ce nom d'utilisateur existe déjà.");

            var user = new User
            {
                Username = dto.Username.Trim(),
                Role = dto.Role,
                DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? dto.Username.Trim() : dto.DisplayName.Trim(),
            };
            var hasher = new PasswordHasher<User>();
            user.PasswordHash = hasher.HashPassword(user, dto.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new AdminUserDto { Id = user.Id, Username = user.Username, DisplayName = user.DisplayName, Role = user.Role });
        }

        // PUT: api/AdminManagement/users/5 — modifie le nom affiché, le rôle et/ou le mot de passe.
        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound("Utilisateur introuvable.");

            if (dto.Role != null && dto.Role != user.Role)
            {
                if (!ValidRoles.Contains(dto.Role))
                    return BadRequest("Rôle invalide.");
                // Empêche le SuperAdmin de se rétrograder lui-même par erreur — risque de
                // se retrouver bloqué hors de cette console sans autre SuperAdmin.
                if (user.Username == CurrentUsername)
                    return BadRequest("Vous ne pouvez pas modifier votre propre rôle.");
                // Empêche de retirer le dernier SuperAdmin restant.
                if (user.Role == "SuperAdmin" && dto.Role != "SuperAdmin")
                {
                    var otherSuperAdmins = await _context.Users.CountAsync(u => u.Role == "SuperAdmin" && u.Id != id);
                    if (otherSuperAdmins == 0)
                        return BadRequest("Impossible de retirer le dernier SuperAdmin.");
                }
                user.Role = dto.Role;
            }

            if (dto.DisplayName != null)
                user.DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? user.Username : dto.DisplayName.Trim();

            if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                if (dto.NewPassword.Length < 8)
                    return BadRequest("Le mot de passe doit contenir au moins 8 caractères.");
                var hasher = new PasswordHasher<User>();
                user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);

                // Un changement de mot de passe révoque les sessions actives de ce compte.
                var activeSessions = await _context.RefreshTokens.Where(r => r.UserId == id && !r.Revoked).ToListAsync();
                foreach (var session in activeSessions) session.Revoked = true;
            }

            await _context.SaveChangesAsync();
            return Ok(new AdminUserDto { Id = user.Id, Username = user.Username, DisplayName = user.DisplayName, Role = user.Role });
        }

        // DELETE: api/AdminManagement/users/5 — supprime le compte et révoque ses sessions actives.
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null) return NotFound("Utilisateur introuvable.");

            if (user.Username == CurrentUsername)
                return BadRequest("Vous ne pouvez pas supprimer votre propre compte.");

            if (user.Role == "SuperAdmin")
            {
                var otherSuperAdmins = await _context.Users.CountAsync(u => u.Role == "SuperAdmin" && u.Id != id);
                if (otherSuperAdmins == 0)
                    return BadRequest("Impossible de supprimer le dernier SuperAdmin.");
            }

            var tokens = await _context.RefreshTokens.Where(r => r.UserId == id).ToListAsync();
            _context.RefreshTokens.RemoveRange(tokens);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
