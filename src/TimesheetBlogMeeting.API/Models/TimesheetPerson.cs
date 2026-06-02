using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Một nhân viên trong báo cáo chấm công (import từ file máy chấm công).
/// Mỗi người là 1 block trong file: tên + các thống kê + bảng theo ngày.
/// Lưu thống kê và dữ liệu ngày dưới dạng JSON cho linh hoạt.
/// </summary>
public class TimesheetPerson
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Thứ tự xuất hiện trong file (để giữ nguyên thứ tự khi hiển thị)
    public int Position { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // JSON: [ { "label": "Ngày làm", "value": "31" }, ... ]
    public string StatsJson { get; set; } = "[]";

    // JSON: [ { "date": "2026-05-01", "weekday": "Thứ sáu", "checkIn": "07:59", "checkOut": "17:10", "status": "đi muộn" }, ... ]
    public string DaysJson { get; set; } = "[]";
}
