namespace TimesheetBlogMeeting.API.Models;

public class LeaveRenewalLog
{
    public int Id { get; set; }

    /// <summary>"2026-06" — khoá duy nhất mỗi tháng để tránh cộng phép 2 lần.</summary>
    public string YearMonth { get; set; } = string.Empty;

    public DateTime RanAt { get; set; } = DateTime.UtcNow;
}
