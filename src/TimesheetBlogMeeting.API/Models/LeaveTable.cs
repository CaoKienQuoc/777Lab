using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.Models;

/// <summary>
/// Một CỘT của bảng "Phép tồn". Bộ cột không cố định — được dựng động theo dòng
/// tiêu đề của file Excel khi import (file có cột gì thì bảng có cột đó).
/// </summary>
public class LeaveColumn
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Thứ tự cột (0-based), theo đúng thứ tự trong file.</summary>
    public int Position { get; set; }

    /// <summary>Tiêu đề cột hiển thị (đúng như file import).</summary>
    [MaxLength(200)]
    public string Header { get; set; } = string.Empty;

    /// <summary>Cột số (căn phải, nhập bằng ô number) hay cột chữ.</summary>
    public bool IsNumeric { get; set; }
}

/// <summary>
/// Một DÒNG của bảng "Phép tồn". Giá trị các ô lưu dạng JSON, key = Position của cột
/// (chuỗi "0","1",…), value = chuỗi giá trị ô. Nhờ vậy số cột có thể thay đổi tuỳ file.
/// </summary>
public class LeaveRow
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Thứ tự dòng (để giữ nguyên thứ tự như file/khi nhập).</summary>
    public int Position { get; set; }

    /// <summary>JSON: { "0": "7L_001", "1": "Nguyễn Văn A", "4": "1.5", … }</summary>
    public string CellsJson { get; set; } = "{}";
}
