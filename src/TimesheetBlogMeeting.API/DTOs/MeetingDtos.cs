using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

public class MeetingRequest
{
    [Required, MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public DateTime MeetingDate { get; set; }

    [Required]
    public string StartTime { get; set; } = string.Empty; // "09:00"

    [Required]
    public string EndTime { get; set; } = string.Empty;    // "10:30"
}

public class MeetingResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public Guid CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
