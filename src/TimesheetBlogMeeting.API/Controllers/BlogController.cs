using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Helpers;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Quản lý bài blog. Mọi người dùng đã đăng nhập đều có thể đăng bài.
/// Chỉ tác giả hoặc admin mới được sửa/xoá bài.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BlogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const long MaxImageBytes = 5 * 1024 * 1024; // 5MB

    public BlogController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
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
    public async Task<ActionResult<IEnumerable<BlogResponse>>> GetAll()
    {
        var posts = await _db.BlogPosts
            .Include(b => b.Author)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => ToResponse(b))
            .ToListAsync();

        return Ok(posts);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BlogResponse>> GetById(Guid id)
    {
        var post = await _db.BlogPosts.Include(b => b.Author).FirstOrDefaultAsync(b => b.Id == id);
        if (post == null) return NotFound(new { message = "Không tìm thấy bài viết." });
        return Ok(ToResponse(post));
    }

    [HttpPost]
    public async Task<ActionResult<BlogResponse>> Create([FromForm] BlogFormRequest request)
    {
        string? imageUrl = null;
        if (request.Image != null)
        {
            var (ok, error, url) = await SaveImageAsync(request.Image);
            if (!ok) return BadRequest(new { message = error });
            imageUrl = url;
        }

        var post = new BlogPost
        {
            Title = request.Title.Trim(),
            Content = request.Content,
            ImageUrl = imageUrl,
            AuthorId = CurrentUserId,
            CreatedAt = TimeHelper.VnNow
        };

        _db.BlogPosts.Add(post);
        await _db.SaveChangesAsync();

        await _db.Entry(post).Reference(b => b.Author).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = post.Id }, ToResponse(post));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BlogResponse>> Update(Guid id, [FromForm] BlogFormRequest request)
    {
        var post = await _db.BlogPosts.Include(b => b.Author).FirstOrDefaultAsync(b => b.Id == id);
        if (post == null) return NotFound(new { message = "Không tìm thấy bài viết." });

        if (post.AuthorId != CurrentUserId && !IsAdmin)
            return Forbid();

        post.Title = request.Title.Trim();
        post.Content = request.Content;

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
        return Ok(ToResponse(post));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var post = await _db.BlogPosts.FindAsync(id);
        if (post == null) return NotFound(new { message = "Không tìm thấy bài viết." });

        if (post.AuthorId != CurrentUserId && !IsAdmin)
            return Forbid();

        DeletePhysicalImage(post.ImageUrl);
        _db.BlogPosts.Remove(post);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ---- Helpers ----

    private string GetUploadsDir()
    {
        // WebRootPath có thể null nếu không có thư mục wwwroot được cấu hình
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
            try { System.IO.File.Delete(fullPath); } catch { /* bỏ qua */ }
        }
    }

    private static BlogResponse ToResponse(BlogPost b) => new()
    {
        Id = b.Id,
        Title = b.Title,
        Content = b.Content,
        ImageUrl = b.ImageUrl,
        AuthorId = b.AuthorId,
        AuthorName = b.Author?.FullName ?? "",
        CreatedAt = b.CreatedAt
    };
}
