using System.Globalization;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Bảng chấm công.
/// - Mọi người dùng đã đăng nhập: chỉ XEM (GET) và xuất Excel.
/// - Admin: thêm/sửa/xoá từng dòng và import từ file Excel.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetController : ControllerBase
{
    private const string ExcelContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly AppDbContext _db;

    public TimesheetController(AppDbContext db)
    {
        _db = db;
    }

    // ---- Ai cũng xem được ----

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimesheetResponse>>> GetAll()
    {
        var rows = await _db.TimesheetEntries
            .OrderBy(t => t.WorkDate).ThenBy(t => t.EmployeeName)
            .Select(t => ToResponse(t))
            .ToListAsync();
        return Ok(rows);
    }

    /// <summary>Xuất toàn bộ bảng chấm công ra file Excel.</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var rows = await _db.TimesheetEntries
            .OrderBy(t => t.WorkDate).ThenBy(t => t.EmployeeName)
            .ToListAsync();

        using var wb = BuildWorkbook(rows);
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), ExcelContentType, "BangChamCong.xlsx");
    }

    /// <summary>Tải file Excel mẫu (đúng định dạng dùng cho import).</summary>
    [HttpGet("template")]
    public IActionResult Template()
    {
        var sample = new List<TimesheetEntry>
        {
            new() { EmployeeName = "Nguyễn Văn A", WorkDate = DateTime.Today, CheckIn = "08:00", CheckOut = "17:30", WorkHours = 8, Note = "" }
        };
        using var wb = BuildWorkbook(sample);
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), ExcelContentType, "Mau_ChamCong.xlsx");
    }

    // ---- Chỉ admin ----

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<TimesheetResponse>> Create(TimesheetRequest request)
    {
        var entry = new TimesheetEntry
        {
            EmployeeName = request.EmployeeName.Trim(),
            WorkDate = request.WorkDate.Date,
            CheckIn = request.CheckIn,
            CheckOut = request.CheckOut,
            WorkHours = request.WorkHours,
            Note = request.Note
        };
        _db.TimesheetEntries.Add(entry);
        await _db.SaveChangesAsync();
        return Ok(ToResponse(entry));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<TimesheetResponse>> Update(Guid id, TimesheetRequest request)
    {
        var entry = await _db.TimesheetEntries.FindAsync(id);
        if (entry == null) return NotFound(new { message = "Không tìm thấy dòng chấm công." });

        entry.EmployeeName = request.EmployeeName.Trim();
        entry.WorkDate = request.WorkDate.Date;
        entry.CheckIn = request.CheckIn;
        entry.CheckOut = request.CheckOut;
        entry.WorkHours = request.WorkHours;
        entry.Note = request.Note;

        await _db.SaveChangesAsync();
        return Ok(ToResponse(entry));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await _db.TimesheetEntries.FindAsync(id);
        if (entry == null) return NotFound(new { message = "Không tìm thấy dòng chấm công." });
        _db.TimesheetEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Xoá toàn bộ bảng chấm công (admin).</summary>
    [HttpDelete("clear")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Clear()
    {
        _db.TimesheetEntries.RemoveRange(_db.TimesheetEntries);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Import file Excel (.xlsx). Dòng 1 là tiêu đề cột:
    /// Họ tên | Ngày | Giờ vào | Giờ ra | Số giờ | Ghi chú (cho phép thêm cột STT ở đầu).
    /// Gửi tham số replace=true để xoá dữ liệu cũ trước khi import.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ImportResult>> Import(IFormFile file, [FromQuery] bool replace = false)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
            return BadRequest(new { message = "Chỉ hỗ trợ file .xlsx" });

        var result = new ImportResult();
        var entries = new List<TimesheetEntry>();

        try
        {
            using var stream = file.OpenReadStream();
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheets.First();
            var range = ws.RangeUsed();
            if (range == null)
                return BadRequest(new { message = "File rỗng." });

            var header = range.Row(1);
            var used = new HashSet<int>();

            int? colDate = FindColumn(header, used, "ngày", "date");
            int? colName = FindColumn(header, used, "họ tên", "ho ten", "tên", "ten", "name", "nhân viên", "nhan vien", "employee");
            int? colIn = FindColumn(header, used, "giờ vào", "gio vao", "vào", "checkin", "check in", "time in");
            int? colOut = FindColumn(header, used, "giờ ra", "gio ra", "ra", "checkout", "check out", "time out");
            int? colHours = FindColumn(header, used, "số giờ", "so gio", "tổng giờ", "tong gio", "hours", "giờ công", "gio cong");
            int? colNote = FindColumn(header, used, "ghi chú", "ghi chu", "note", "remark");

            if (colName == null || colDate == null)
                return BadRequest(new { message = "Không nhận diện được cột 'Họ tên' và 'Ngày'. Vui lòng dùng đúng file mẫu (tải ở nút 'Tải file mẫu')." });

            int lastRow = range.LastRow().RowNumber();
            for (int r = range.FirstRow().RowNumber() + 1; r <= lastRow; r++)
            {
                var row = ws.Row(r);
                var name = row.Cell(colName.Value).GetString().Trim();
                var date = ReadDate(row.Cell(colDate.Value));

                if (string.IsNullOrWhiteSpace(name) && date == null)
                    continue; // dòng trống -> bỏ qua

                if (string.IsNullOrWhiteSpace(name))
                {
                    result.Errors.Add($"Dòng {r}: thiếu họ tên, đã bỏ qua.");
                    continue;
                }
                if (date == null)
                {
                    result.Errors.Add($"Dòng {r}: ngày không hợp lệ, đã bỏ qua.");
                    continue;
                }

                entries.Add(new TimesheetEntry
                {
                    EmployeeName = name,
                    WorkDate = date.Value.Date,
                    CheckIn = colIn != null ? ReadTime(row.Cell(colIn.Value)) : null,
                    CheckOut = colOut != null ? ReadTime(row.Cell(colOut.Value)) : null,
                    WorkHours = colHours != null ? ReadHours(row.Cell(colHours.Value)) : 0,
                    Note = colNote != null ? row.Cell(colNote.Value).GetString().Trim() : null
                });
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Không đọc được file Excel: " + ex.Message });
        }

        if (replace)
            _db.TimesheetEntries.RemoveRange(_db.TimesheetEntries);

        _db.TimesheetEntries.AddRange(entries);
        await _db.SaveChangesAsync();

        result.Imported = entries.Count;
        return Ok(result);
    }

    // ---- Helpers ----

    private static XLWorkbook BuildWorkbook(List<TimesheetEntry> rows)
    {
        var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("ChamCong");

        string[] headers = { "STT", "Họ tên", "Ngày", "Giờ vào", "Giờ ra", "Số giờ", "Ghi chú" };
        for (int c = 0; c < headers.Length; c++)
            ws.Cell(1, c + 1).Value = headers[c];

        var headerRange = ws.Range(1, 1, 1, headers.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#21303B");
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int rowIndex = 2;
        int stt = 1;
        foreach (var t in rows)
        {
            ws.Cell(rowIndex, 1).Value = stt++;
            ws.Cell(rowIndex, 2).Value = t.EmployeeName;
            ws.Cell(rowIndex, 3).Value = t.WorkDate;
            ws.Cell(rowIndex, 3).Style.DateFormat.Format = "dd/MM/yyyy";
            ws.Cell(rowIndex, 4).Value = t.CheckIn ?? "";
            ws.Cell(rowIndex, 5).Value = t.CheckOut ?? "";
            ws.Cell(rowIndex, 6).Value = t.WorkHours;
            ws.Cell(rowIndex, 7).Value = t.Note ?? "";
            rowIndex++;
        }

        ws.Columns().AdjustToContents();
        return wb;
    }

    private static int? FindColumn(IXLRangeRow header, HashSet<int> used, params string[] keywords)
    {
        foreach (var cell in header.CellsUsed())
        {
            var col = cell.Address.ColumnNumber;
            if (used.Contains(col)) continue;
            var text = cell.GetString().Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(text)) continue;
            if (keywords.Any(k => text.Contains(k)))
            {
                used.Add(col);
                return col;
            }
        }
        return null;
    }

    private static DateTime? ReadDate(IXLCell cell)
    {
        if (cell.IsEmpty()) return null;
        if (cell.DataType == XLDataType.DateTime)
            return cell.GetDateTime();

        var s = cell.GetString().Trim();
        string[] formats = { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd-MM-yyyy" };
        if (DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
            return d;
        if (DateTime.TryParse(s, out var d2))
            return d2;
        return null;
    }

    private static string? ReadTime(IXLCell cell)
    {
        if (cell.IsEmpty()) return null;
        try
        {
            if (cell.DataType == XLDataType.DateTime)
                return cell.GetDateTime().ToString("HH:mm");
            if (cell.DataType == XLDataType.TimeSpan)
            {
                var ts = cell.GetTimeSpan();
                return $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}";
            }
        }
        catch { /* rơi xuống đọc chuỗi */ }

        var s = cell.GetString().Trim();
        return string.IsNullOrEmpty(s) ? null : s;
    }

    private static double ReadHours(IXLCell cell)
    {
        if (cell.IsEmpty()) return 0;
        if (cell.DataType == XLDataType.Number) return cell.GetDouble();
        var s = cell.GetString().Trim().Replace(',', '.');
        return double.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : 0;
    }

    private static TimesheetResponse ToResponse(TimesheetEntry t) => new()
    {
        Id = t.Id,
        EmployeeName = t.EmployeeName,
        WorkDate = t.WorkDate,
        CheckIn = t.CheckIn,
        CheckOut = t.CheckOut,
        WorkHours = t.WorkHours,
        Note = t.Note
    };
}
