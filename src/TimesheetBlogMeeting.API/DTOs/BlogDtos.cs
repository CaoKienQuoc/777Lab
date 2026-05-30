using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

// Dùng cho cả tạo mới và cập nhật. Gửi lên dưới dạng multipart/form-data
// vì có kèm file ảnh.
public class BlogFormRequest
{
    [Required, MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    // File ảnh (tuỳ chọn)
    public IFormFile? Image { get; set; }

    // Khi cập nhật: gửi true nếu muốn xoá ảnh hiện tại
    public bool RemoveImage { get; set; } = false;
}

public class BlogResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
