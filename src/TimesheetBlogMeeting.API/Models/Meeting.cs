using System.ComponentModel.DataAnnotations;
using TimesheetBlogMeeting.API.Helpers;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Lịch họp do người dùng tự đăng ký.
/// MeetingDate là ngày họp; StartTime/EndTime là khung giờ trong ngày ("HH:mm").
/// </summary>
public class Meeting
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public DateTime MeetingDate { get; set; }

    [MaxLength(10)]
    public string StartTime { get; set; } = string.Empty; // "09:00"

    [MaxLength(10)]
    public string EndTime { get; set; } = string.Empty;    // "10:30"

    public Guid CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = TimeHelper.VnNow;
}
