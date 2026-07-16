using System.ComponentModel.DataAnnotations;
using TimesheetBlogMeeting.API.Helpers;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Tài khoản người dùng. Role chỉ nhận 1 trong 2 giá trị: "Admin" hoặc "Customer".
/// </summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    // Email (dùng cho đăng nhập Google). Null với tài khoản nội bộ cũ.
    [MaxLength(200)]
    public string? Email { get; set; }

    // "Local" (username/mật khẩu) hoặc "Google" (đăng nhập Google).
    [MaxLength(20)]
    public string AuthProvider { get; set; } = "Local";

    // Mật khẩu KHÔNG lưu dạng plaintext mà lưu hash (BCrypt).
    // Rỗng với tài khoản Google (không đăng nhập bằng mật khẩu).
    [MaxLength(200)]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    // "Admin" hoặc "Customer"
    [MaxLength(20)]
    public string Role { get; set; } = "Customer";

    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;

    // Quan hệ
    public ICollection<BlogPost> BlogPosts { get; set; } = new List<BlogPost>();
    public ICollection<RegulationPost> RegulationPosts { get; set; } = new List<RegulationPost>();
    public ICollection<Meeting> Meetings { get; set; } = new List<Meeting>();
}
