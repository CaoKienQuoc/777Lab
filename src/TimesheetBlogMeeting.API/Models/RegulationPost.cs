using System.ComponentModel.DataAnnotations;
using TimesheetBlogMeeting.API.Helpers;

namespace TimesheetBlogMeeting.API.Models;

public class RegulationPost
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    [MaxLength(400)]
    public string? ImageUrl { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;

    public DateTime? ScheduledAt { get; set; }
}
