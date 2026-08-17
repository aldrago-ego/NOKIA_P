namespace backend.DTO
{
    // Conservé pour compat — équivalent à CreateUserDto avec Role="Admin" forcé.
    public class CreateAdminDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
    }

    public class AdminUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    // Gestion complète des utilisateurs (tous rôles) — réservée au SuperAdmin.
    public class CreateUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "SuperAdmin" | "Admin" | "Supervisor" | "Viewer"
    }

    public class UpdateUserDto
    {
        public string? DisplayName { get; set; }
        public string? Role { get; set; }
        public string? NewPassword { get; set; } // optionnel — non fourni = mot de passe inchangé
    }
}
