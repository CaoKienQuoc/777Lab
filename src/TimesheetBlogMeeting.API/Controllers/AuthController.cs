using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Helpers;
using TimesheetBlogMeeting.API.Models;
using TimesheetBlogMeeting.API.Services;

namespace TimesheetBlogMeeting.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, TokenService tokenService, IConfiguration config)
    {
        _db = db;
        _tokenService = tokenService;
        _config = config;
    }

    /// <summary>Đăng nhập bằng tên đăng nhập / mật khẩu, trả về JWT token.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null)
            return Unauthorized(new { message = "Sai tên đăng nhập hoặc mật khẩu." });

        // Tài khoản Google không có mật khẩu -> không cho đăng nhập kiểu này
        if (string.IsNullOrEmpty(user.PasswordHash))
            return Unauthorized(new { message = "Tài khoản này đăng nhập bằng Google. Vui lòng dùng nút \"Đăng nhập với Google\"." });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Sai tên đăng nhập hoặc mật khẩu." });

        return Ok(BuildResponse(user));
    }

    /// <summary>
    /// Đăng ký tài khoản mới (luôn là Customer). Đăng ký thành công thì tự đăng nhập luôn
    /// (trả về JWT token như khi login).
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var username = request.Username.Trim();
        var fullName = request.FullName.Trim();

        if (string.IsNullOrWhiteSpace(fullName))
            return BadRequest(new { message = "Vui lòng nhập họ và tên." });
        if (username.Length < 3)
            return BadRequest(new { message = "Tên đăng nhập phải có ít nhất 3 ký tự." });
        if (request.Password.Length < 6)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự." });

        if (await _db.Users.AnyAsync(u => u.Username == username))
            return Conflict(new { message = "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác." });

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = fullName,
            AuthProvider = "Local",
            Role = "Customer",
            CreatedAt = TimeHelper.VnNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(BuildResponse(user));
    }

    /// <summary>
    /// Đăng nhập bằng Google. Client gửi lên ID token (credential) do Google Identity Services trả về.
    /// Lần đầu đăng nhập sẽ tự tạo tài khoản Customer.
    /// </summary>
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(GoogleLoginRequest request)
    {
        var clientId = _config["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId) || clientId.StartsWith("YOUR_GOOGLE_CLIENT_ID"))
            return StatusCode(500, new { message = "Server chưa cấu hình Google ClientId." });

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.Credential,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                });
        }
        catch
        {
            return Unauthorized(new { message = "Token Google không hợp lệ." });
        }

        if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
            return Unauthorized(new { message = "Email Google chưa được xác minh." });

        var email = payload.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            // Lần đầu đăng nhập -> tạo tài khoản Customer mới
            user = new User
            {
                Username = email,
                Email = email,
                AuthProvider = "Google",
                PasswordHash = string.Empty,
                FullName = string.IsNullOrWhiteSpace(payload.Name) ? email : payload.Name,
                Role = "Customer",
                CreatedAt = TimeHelper.VnNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        return Ok(BuildResponse(user));
    }

    /// <summary>Trả về Google ClientId cho frontend khởi tạo nút đăng nhập.</summary>
    [HttpGet("google-config")]
    public ActionResult GoogleConfig()
    {
        return Ok(new { clientId = _config["Google:ClientId"] });
    }

    /// <summary>Lấy thông tin tài khoản đang đăng nhập (từ token).</summary>
    [HttpGet("me")]
    [Authorize]
    public ActionResult Me()
    {
        return Ok(new
        {
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            Username = User.FindFirstValue(ClaimTypes.Name),
            FullName = User.FindFirstValue("fullName"),
            Role = User.FindFirstValue(ClaimTypes.Role)
        });
    }

    private AuthResponse BuildResponse(User user) => new()
    {
        Token = _tokenService.CreateToken(user),
        UserId = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role
    };
}
