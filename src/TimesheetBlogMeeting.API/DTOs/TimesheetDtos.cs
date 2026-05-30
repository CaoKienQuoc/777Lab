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
