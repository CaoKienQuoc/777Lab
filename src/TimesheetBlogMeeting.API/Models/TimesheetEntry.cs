using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Một dòng chấm công (tương ứng 1 nhân viên trong 1 ngày).
/// Giờ vào / giờ ra lưu dạng chuỗi "HH:mm" để linh hoạt khi import Excel.
/// </summary>
public class TimesheetEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(150)]
    public string EmployeeName { get; set; } = string.Empty;

    public DateTime WorkDate { get; set; }

    [MaxLength(10)]
    public string? CheckIn { get; set; }   // "08:00"

    [MaxLength(10)]
    public string? CheckOut { get; set; }  // "17:30"

    // Số giờ làm trong ngày
    public double WorkHours { get; set; }

    [MaxLength(300)]
    public string? Note { get; set; }
}
