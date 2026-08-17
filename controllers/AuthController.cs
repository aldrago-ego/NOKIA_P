using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Backend.Data;
using backend.DTO;
using backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (user == null) return Unauthorized("Identifiants invalides.");

            var hasher = new PasswordHasher<User>();
            var result = hasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
            if (result == PasswordVerificationResult.Failed)
                return Unauthorized("Identifiants invalides.");

            var accessToken = GenerateAccessToken(user);
            var refreshToken = await GenerateRefreshToken(user.Id);

            return Ok(new LoginResponseDto
            {
                Token = accessToken,
                RefreshToken = refreshToken,
                Role = user.Role,
                DisplayName = user.DisplayName
            });
        }

        // POST: api/Auth/refresh — échange un refresh token valide contre un nouvel access token
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequestDto dto)
        {
            var stored = await _context.RefreshTokens
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Token == dto.RefreshToken);

            if (stored == null || stored.Revoked || stored.ExpiresAt < DateTime.UtcNow)
                return Unauthorized("Session expirée, reconnexion nécessaire.");

            // Rotation : l'ancien refresh token est révoqué, un nouveau est émis
            stored.Revoked = true;
            var newRefreshToken = await GenerateRefreshToken(stored.UserId);
            var newAccessToken = GenerateAccessToken(stored.User!);
            await _context.SaveChangesAsync();

            return Ok(new LoginResponseDto
            {
                Token = newAccessToken,
                RefreshToken = newRefreshToken,
                Role = stored.User!.Role,
                DisplayName = stored.User.DisplayName
            });
        }

        // POST: api/Auth/logout — révoque le refresh token côté serveur
        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] RefreshRequestDto dto)
        {
            var stored = await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == dto.RefreshToken);
            if (stored != null)
            {
                stored.Revoked = true;
                await _context.SaveChangesAsync();
            }
            return Ok();
        }
        // POST: api/Auth/reset-password — réservé Admin, pour rattraper un compte oublié/compromis
        [HttpPost("reset-password")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResetPassword([FromBody] ChangePasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            if (user == null) return NotFound("Utilisateur introuvable.");

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
                return BadRequest("Le mot de passe doit contenir au moins 8 caractères.");

            var hasher = new PasswordHasher<User>();
            user.PasswordHash = hasher.HashPassword(user, dto.NewPassword);
            await _context.SaveChangesAsync();

            // Révoque toutes les sessions actives de ce compte — un changement de mot de passe
            // doit invalider les anciens refresh tokens, sinon une session déjà ouverte reste valide.
            var activeSessions = await _context.RefreshTokens
                .Where(r => r.UserId == user.Id && !r.Revoked)
                .ToListAsync();
            foreach (var session in activeSessions) session.Revoked = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Mot de passe de {dto.Username} mis à jour, sessions actives révoquées." });
        }

        private string GenerateAccessToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("displayName", user.DisplayName),
            };

            // Le SuperAdmin hérite de tous les droits Admin : on ajoute la claim "Admin" en plus
            // de "SuperAdmin", pour que les endpoints [Authorize(Roles = "Admin")] existants
            // restent valables sans devoir être modifiés un par un.
            if (user.Role == "SuperAdmin")
                claims.Add(new Claim(ClaimTypes.Role, "Admin"));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiryMinutes"]!)),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private async Task<string> GenerateRefreshToken(int userId)
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            var token = Convert.ToBase64String(randomBytes);

            _context.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(double.Parse(_config["Jwt:RefreshExpiryDays"]!))
            });
            await _context.SaveChangesAsync();

            return token;
        }
    }
}