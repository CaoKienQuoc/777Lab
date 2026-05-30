using System.ComponentModel.DataAnnotations;
using TimesheetBlogMeeting.API.Helpers;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Bài blog: tiêu đề, nội dung và hình ảnh (đường dẫn tương đối trong /uploads).
/// </summary>
public class BlogPost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    // Nội dung dài -> nvarchar(max)
    public string Content { get; set; } = string.Empty;

    // Ví dụ: "/uploads/abc.jpg" - có thể null nếu bài không có ảnh
    [MaxLength(400)]
    public string? ImageUrl { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;
}
