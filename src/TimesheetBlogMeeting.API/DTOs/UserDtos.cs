using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

public class CreateUserRequest
{
    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MinLength(4)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    // "Admin" hoặc "Customer"
    public string Role { get; set; } = "Customer";
}

public class UpdateUserRequest
{
    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = "Customer";

    // Để trống nếu không đổi mật khẩu
    public string? Password { get; set; }
}

public class UserResponse
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
