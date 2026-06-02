namespace TimesheetBlogMeeting.API.DTOs;

public class LeaveColumnDto
{
    public Guid Id { get; set; }
    public int Position { get; set; }
    public string Header { get; set; } = string.Empty;
    public bool IsNumeric { get; set; }
}

public class LeaveRowDto
{
    public Guid Id { get; set; }
    public int Position { get; set; }
    /// <summary>key = Position cột (chuỗi), value = giá trị ô (chuỗi).</summary>
    public Dictionary<string, string?> Cells { get; set; } = new();
}

/// <summary>Toàn bộ bảng phép tồn: định nghĩa cột (động) + dữ liệu dòng.</summary>
public class LeaveTableDto
{
    public List<LeaveColumnDto> Columns { get; set; } = new();
    public List<LeaveRowDto> Rows { get; set; } = new();
}

/// <summary>Body khi thêm / sửa 1 dòng: map Position cột -> giá trị.</summary>
public class LeaveRowRequest
{
    public Dictionary<string, string?> Cells { get; set; } = new();
}
