using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Helpers;
using TimesheetBlogMeeting.API.Models;
using TimesheetBlogMeeting.API.Services;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Quản lý tài khoản người dùng. CHỈ admin mới truy cập được.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier _rt;

    public UsersController(AppDbContext db, IRealtimeNotifier rt)
    {
        _db = db;
        _rt = rt;
    }

    private static readonly string[] ValidRoles = { "Admin", "Customer" };

    // Mật khẩu mặc định khi admin bấm "Đặt lại mật khẩu".
    public const string DefaultPassword = "User@123";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetAll()
    {
        var users = await _db.Users
            .OrderBy(u => u.Id)
            .Select(u => new UserResponse
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.FullName,
                Role = u.Role,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        var role = NormalizeRole(request.Role);
        if (role == null)
            return BadRequest(new { message = "Role không hợp lệ (chỉ Admin hoặc Customer)." });

        var username = request.Username.Trim();
        if (await _db.Users.AnyAsync(u => u.Username == username))
            return Conflict(new { message = "Tên đăng nhập đã tồn tại." });

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Role = role,
            CreatedAt = TimeHelper.VnNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("users", "created");

        return CreatedAtAction(nameof(GetAll), new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        // Không cho đổi role của tài khoản admin cố định
        if (user.Username == DbSeeder.AdminUsername && request.Role != "Admin")
            return BadRequest(new { message = "Không thể thay đổi quyền của tài khoản admin gốc." });

        var role = NormalizeRole(request.Role);
        if (role == null)
            return BadRequest(new { message = "Role không hợp lệ (chỉ Admin hoặc Customer)." });

        user.FullName = request.FullName.Trim();
        user.Role = role;

        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("users", "updated");

        return Ok(new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }

    /// <summary>
    /// Đặt lại mật khẩu của người dùng về mật khẩu mặc định (User@123).
    /// </summary>
    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword);
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("users", "updated");

        return Ok(new
        {
            message = $"Đã đặt lại mật khẩu của \"{user.Username}\" về \"{DefaultPassword}\".",
            password = DefaultPassword
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        // Không cho xoá tài khoản admin gốc
        if (user.Username == DbSeeder.AdminUsername)
            return BadRequest(new { message = "Không thể xoá tài khoản admin gốc." });

        _db.Users.Remove(user); // cascade xoá luôn blog + lịch họp của user này
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("users", "deleted");
        return NoContent();
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return null;
        return ValidRoles.FirstOrDefault(r => r.Equals(role.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
