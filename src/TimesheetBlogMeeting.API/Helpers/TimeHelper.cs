namespace TimesheetBlogMeeting.API.Helpers;

/// <summary>
/// Tiện ích thời gian — luôn trả về giờ Việt Nam (UTC+7).
/// </summary>
public static class TimeHelper
{
    private static readonly TimeZoneInfo VnZone =
        TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); // Windows
        // Nếu chạy trên Linux/Mac thì thay bằng "Asia/Ho_Chi_Minh"

    /// <summary>Trả về DateTime hiện tại theo múi giờ UTC+7 (Việt Nam).</summary>
    public static DateTime VnNow =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VnZone);
}
