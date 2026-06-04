using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

public class TimesheetRequest
{
    [Required, MaxLength(150)]
    public string EmployeeName { get; set; } = string.Empty;

    [Required]
    public DateTime WorkDate { get; set; }

    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public double WorkHours { get; set; }
    public string? Note { get; set; }
}

public class TimesheetResponse
{
    public Guid Id { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime WorkDate { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }
    public double WorkHours { get; set; }
    public string? Note { get; set; }
}

public class ImportResult
{
    public int Imported { get; set; }
    public List<string> Errors { get; set; } = new();
}

// ---- Báo cáo chấm công theo từng người (import từ máy chấm công) ----

public class TimesheetStatDto
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class TimesheetDayDto
{
    public string Date { get; set; } = string.Empty;     // "yyyy-MM-dd"
    public string Weekday { get; set; } = string.Empty;  // "Thứ sáu"

    // Buổi sáng: vào làm / ra nghỉ
    public string? MorningIn { get; set; }               // "07:50" hoặc "OFF" / "LỄ"
    public string? MorningOut { get; set; }              // "12:00"

    // Buổi chiều: vào làm / ra nghỉ
    public string? AfternoonIn { get; set; }             // "13:00"
    public string? AfternoonOut { get; set; }            // "17:30" hoặc "OFF"

    public string? Status { get; set; }                  // "LỄ" / "OFF" / "đi muộn"...
}

public class TimesheetPersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TimesheetStatDto> Stats { get; set; } = new();
    public List<TimesheetDayDto> Days { get; set; } = new();
}
