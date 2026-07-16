using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

public class LoginRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

// Đăng ký tài khoản mới (tài khoản nội bộ: username + mật khẩu).
// Không dùng [Required] để tự kiểm tra và trả thông báo tiếng Việt trong controller.
public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

// Người dùng tự bổ sung email cho tài khoản đang đăng nhập.
public class SetEmailRequest
{
    public string Email { get; set; } = string.Empty;
}

// Người dùng tự đổi mật khẩu của chính mình.
public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

// ID token (JWT) do Google Identity Services trả về phía client.
public class GoogleLoginRequest
{
    [Required]
    public string Credential { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
