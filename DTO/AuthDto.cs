namespace backend.DTO
{
    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

   
    public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty; // NOUVEAU
    public string Role { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class RefreshRequestDto
{
    public string RefreshToken { get; set; } = string.Empty;
}
public class ChangePasswordDto
{
    public string Username { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
}
