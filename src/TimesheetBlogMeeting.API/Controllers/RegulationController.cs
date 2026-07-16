using System.Globalization;
using System.Security.Claims;
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
[Authorize]
public class RegulationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IRealtimeNotifier _rt;

    private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const long MaxImageBytes = 5 * 1024 * 1024;

    public RegulationController(AppDbContext db, IWebHostEnvironment env, IRealtimeNotifier rt)
    {
        _db = db;
        _env = env;
        _rt = rt;
    }

    private Guid CurrentUserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(raw, out var guid)) return guid;
            throw new UnauthorizedAccessException("Token không hợp lệ. Vui lòng đăng nhập lại.");
        }
    }
    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RegulationResponse>>> GetAll()
    {
        var posts = await _db.RegulationPosts
            .Include(r => r.Author)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => ToResponse(r))
            .ToListAsync();
        return Ok(posts);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RegulationResponse>> GetById(Guid id)
    {
        var post = await _db.RegulationPosts.Include(r => r.Author).FirstOrDefaultAsync(r => r.Id == id);
        if (post == null) return NotFound(new { message = "Không tìm thấy quy định." });
        return Ok(ToResponse(post));
    }

    [HttpPost]
    public async Task<ActionResult<RegulationResponse>> Create([FromForm] RegulationFormRequest request)
    {
        if (!IsAdmin) return Forbid();

        string? imageUrl = null;
        if (request.Image != null)
        {
            var (ok, error, url) = await SaveImageAsync(request.Image);
            if (!ok) return BadRequest(new { message = error });
            imageUrl = url;
        }

        var post = new RegulationPost
        {
            Title = request.Title.Trim(),
            Content = request.Content,
            ImageUrl = imageUrl,
            AuthorId = CurrentUserId,
            CreatedAt = TimeHelper.VnNow,
            ScheduledAt = ParseScheduledAt(request.ScheduledDate, request.ScheduledTime)
        };

        _db.RegulationPosts.Add(post);
        await _db.SaveChangesAsync();

        await _db.Entry(post).Reference(r => r.Author).LoadAsync();

        await _rt.NotifyAsync("regulation", "created");

        return CreatedAtAction(nameof(GetById), new { id = post.Id }, ToResponse(post));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RegulationResponse>> Update(Guid id, [FromForm] RegulationFormRequest request)
    {
        if (!IsAdmin) return Forbid();

        var post = await _db.RegulationPosts.Include(r => r.Author).FirstOrDefaultAsync(r => r.Id == id);
        if (post == null) return NotFound(new { message = "Không tìm thấy quy định." });

        post.Title = request.Title.Trim();
        post.Content = request.Content;
        post.ScheduledAt = ParseScheduledAt(request.ScheduledDate, request.ScheduledTime);

        if (request.Image != null)
        {
            var (ok, error, url) = await SaveImageAsync(request.Image);
            if (!ok) return BadRequest(new { message = error });
            DeletePhysicalImage(post.ImageUrl);
            post.ImageUrl = url;
        }
        else if (request.RemoveImage)
        {
            DeletePhysicalImage(post.ImageUrl);
            post.ImageUrl = null;
        }

        await _db.SaveChangesAsync();

        await _rt.NotifyAsync("regulation", "updated");
        return Ok(ToResponse(post));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!IsAdmin) return Forbid();

        var post = await _db.RegulationPosts.FindAsync(id);
        if (post == null) return NotFound(new { message = "Không tìm thấy quy định." });

        DeletePhysicalImage(post.ImageUrl);
        _db.RegulationPosts.Remove(post);
        await _db.SaveChangesAsync();

        await _rt.NotifyAsync("regulation", "deleted");
        return NoContent();
    }

    private static DateTime? ParseScheduledAt(string? date, string? time)
    {
        if (string.IsNullOrWhiteSpace(date)) return null;
        var dateStr = date.Trim();
        var timeStr = string.IsNullOrWhiteSpace(time) ? "00:00" : time.Trim();
        if (DateTime.TryParseExact($"{dateStr} {timeStr}", "yyyy-MM-dd HH:mm",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt;
        return null;
    }

    private string GetUploadsDir()
    {
        var webRoot = _env.WebRootPath
                      ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        return Path.Combine(webRoot, "uploads");
    }

    private async Task<(bool ok, string? error, string? url)> SaveImageAsync(IFormFile image)
    {
        try
        {
            if (image.Length == 0)
                return (false, "File ảnh rỗng.", null);
            if (image.Length > MaxImageBytes)
                return (false, "Ảnh vượt quá 5MB.", null);

            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(ext))
                return (false, "Định dạng ảnh không hợp lệ (chỉ jpg, png, gif, webp).", null);

            var uploadsDir = GetUploadsDir();
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsDir, fileName);

            await using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await image.CopyToAsync(stream);
            }

            return (true, null, $"/uploads/{fileName}");
        }
        catch (Exception ex)
        {
            return (false, $"Lỗi lưu ảnh: {ex.Message}", null);
        }
    }

    private void DeletePhysicalImage(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;
        var relative = imageUrl.TrimStart('/');
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var fullPath = Path.Combine(webRoot, relative.Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(fullPath))
        {
            try { System.IO.File.Delete(fullPath); } catch { }
        }
    }

    private static RegulationResponse ToResponse(RegulationPost r) => new()
    {
        Id = r.Id,
        Title = r.Title,
        Content = r.Content,
        ImageUrl = r.ImageUrl,
        AuthorId = r.AuthorId,
        AuthorName = r.Author?.FullName ?? "",
        CreatedAt = r.CreatedAt,
        ScheduledAt = r.ScheduledAt
    };
}
