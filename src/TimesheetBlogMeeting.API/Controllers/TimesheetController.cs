using System.Text.Json;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Models;
using TimesheetBlogMeeting.API.Services;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Bảng chấm công — import từ file báo cáo máy chấm công (CHECKIN-OUT).
/// Mỗi người là 1 block: dòng "Tên:..", dòng thống kê, rồi lịch theo ngày (2 cột
/// nửa tháng, mỗi ngày tới 3 ca vào/ra). Khi hiển thị: chọn người trong combobox
/// để xem thống kê + bảng theo ngày (giờ vào sớm nhất, giờ ra muộn nhất, trạng thái).
/// - Mọi người dùng đã đăng nhập: chỉ XEM và xuất Excel.
/// - Admin: import (thay thế toàn bộ) và xoá.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimesheetController : ControllerBase
{
    private const string ExcelContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = false };

    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier _rt;

    public TimesheetController(AppDbContext db, IRealtimeNotifier rt)
    {
        _db = db;
        _rt = rt;
    }

    // ---- Ai cũng xem được ----

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TimesheetPersonDto>>> GetAll()
    {
        var people = await _db.TimesheetPeople.OrderBy(p => p.Position).ToListAsync();
        return Ok(people.Select(ToDto).ToList());
    }

    /// <summary>Xuất tất cả người ra một bảng tổng hợp (Tên | Ngày | Thứ | Vào | Ra | Trạng thái).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var people = await _db.TimesheetPeople.OrderBy(p => p.Position).ToListAsync();
        using var wb = BuildWorkbook(people);
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), ExcelContentType, "BangChamCong.xlsx");
    }

    // ---- Chỉ admin ----

    [HttpDelete("clear")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Clear()
    {
        _db.TimesheetPeople.RemoveRange(_db.TimesheetPeople);
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("timesheet", "cleared");
        return NoContent();
    }

    /// <summary>
    /// Import file báo cáo CHECKIN-OUT (.xlsx). Tự dò từng block người, đọc thống kê và
    /// lịch theo ngày. Thay thế toàn bộ dữ liệu hiện có.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ImportResult>> Import(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file." });
        if (Path.GetExtension(file.FileName).ToLowerInvariant() != ".xlsx")
            return BadRequest(new { message = "Chỉ hỗ trợ file .xlsx" });

        List<TimesheetPerson> people;
        try
        {
            using var stream = file.OpenReadStream();
            using var wb = new XLWorkbook(stream);
            people = ParseReport(wb);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Không đọc được file Excel: " + ex.Message });
        }

        if (people.Count == 0)
            return BadRequest(new { message = "Không tìm thấy dữ liệu chấm công trong file (cần có các dòng 'Tên:' và bảng theo ngày)." });

        _db.TimesheetPeople.RemoveRange(_db.TimesheetPeople);
        _db.TimesheetPeople.AddRange(people);
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("timesheet", "imported");

        return Ok(new ImportResult { Imported = people.Count });
    }

    // ===================== Parse báo cáo =====================

    private static List<TimesheetPerson> ParseReport(XLWorkbook wb)
    {
        var people = new List<TimesheetPerson>();
        int position = 0;

        foreach (var ws in wb.Worksheets)
        {
            var used = ws.RangeUsed();
            if (used == null) continue;
            int firstRow = used.FirstRow().RowNumber();
            int lastRow = used.LastRow().RowNumber();
            int lastCol = Math.Min(used.LastColumn().ColumnNumber(), 30);

            int r = firstRow;
            while (r <= lastRow)
            {
                if (!TryGetName(ws, r, lastCol, out var name)) { r++; continue; }

                int year = FindYear(ws, r, lastCol);
                var stats = ParseStats(ws, r + 1, lastCol);

                // Tiêu đề bảng ở r+2, dữ liệu bắt đầu r+3
                var days = new List<TimesheetDayDto>();
                int dr = r + 3;
                while (dr <= lastRow)
                {
                    if (TryGetName(ws, dr, lastCol, out _)) break;             // sang người mới
                    if (RowContains(ws, dr, lastCol, "Chữ ký")) { dr++; break; } // hết block

                    ParseDayHalf(ws, dr, 2, year, days);   // nửa trái: cột 2..9
                    ParseDayHalf(ws, dr, 10, year, days);  // nửa phải: cột 10..17
                    dr++;
                }

                people.Add(new TimesheetPerson
                {
                    Position = position++,
                    Name = name,
                    StatsJson = JsonSerializer.Serialize(stats, JsonOpts),
                    DaysJson = JsonSerializer.Serialize(days.OrderBy(d => d.Date).ToList(), JsonOpts)
                });

                r = dr;
            }
        }

        return people;
    }

    /// <summary>Dò ô bắt đầu bằng "Tên:" trong dòng, trả về phần tên phía sau dấu hai chấm.</summary>
    private static bool TryGetName(IXLWorksheet ws, int row, int lastCol, out string name)
    {
        name = "";
        for (int c = 1; c <= lastCol; c++)
        {
            var s = ws.Cell(row, c).GetString().Trim();
            if (s.StartsWith("Tên:", StringComparison.OrdinalIgnoreCase) ||
                s.StartsWith("Tên ", StringComparison.OrdinalIgnoreCase))
            {
                var idx = s.IndexOf(':');
                name = (idx >= 0 ? s[(idx + 1)..] : s[3..]).Trim();
                if (name.Length > 0) return true;
            }
        }
        return false;
    }

    private static int FindYear(IXLWorksheet ws, int row, int lastCol)
    {
        for (int c = 1; c <= lastCol; c++)
        {
            var m = Regex.Match(ws.Cell(row, c).GetString(), @"(\d{4})-\d{2}-\d{2}");
            if (m.Success) return int.Parse(m.Groups[1].Value);
        }
        return DateTime.Now.Year;
    }

    private static List<TimesheetStatDto> ParseStats(IXLWorksheet ws, int row, int lastCol)
    {
        var stats = new List<TimesheetStatDto>();
        for (int c = 1; c <= lastCol; c++)
        {
            var s = ws.Cell(row, c).GetString().Trim();
            var idx = s.IndexOf(':');
            if (idx <= 0) continue;
            var label = s[..idx].Trim();
            var value = s[(idx + 1)..].Trim();
            if (label.Length > 0)
                stats.Add(new TimesheetStatDto { Label = label, Value = value });
        }
        return stats;
    }

    /// <summary>Đọc 1 nửa bảng (1 ngày) từ startCol: [Ngày, Tuần, Vào, Ra, Vào, Ra, Vào, Ra].</summary>
    private static void ParseDayHalf(IXLWorksheet ws, int row, int startCol, int year, List<TimesheetDayDto> days)
    {
        var date = ReadDate(ws.Cell(row, startCol), year);
        if (date == null) return;

        var weekday = ws.Cell(row, startCol + 1).GetString().Trim();

        var ins = new List<TimeSpan>();
        var outs = new List<TimeSpan>();
        var statusSet = new List<string>();
        bool late = false, early = false;

        for (int k = 0; k < 3; k++)
        {
            ReadTimeInto(ws.Cell(row, startCol + 2 + k * 2), ins, statusSet, ref late);
            ReadTimeInto(ws.Cell(row, startCol + 3 + k * 2), outs, statusSet, ref early);
        }

        if (late && !statusSet.Contains("đi muộn")) statusSet.Add("đi muộn");
        if (early && !statusSet.Contains("về sớm")) statusSet.Add("về sớm");

        days.Add(new TimesheetDayDto
        {
            Date = date.Value.ToString("yyyy-MM-dd"),
            Weekday = weekday,
            CheckIn = ins.Count > 0 ? Fmt(ins.Min()) : null,
            CheckOut = outs.Count > 0 ? Fmt(outs.Max()) : null,
            Status = statusSet.Count > 0 ? string.Join(", ", statusSet) : null
        });
    }

    /// <summary>
    /// Đọc ngày từ CHUỖI HIỂN THỊ "05-01" (MM-DD). KHÔNG dùng giá trị DateTime vì file
    /// máy chấm công lưu ngày bị hoán đổi tháng/ngày (hiển thị 05-01 nhưng giá trị là 01-05).
    /// </summary>
    private static DateTime? ReadDate(IXLCell cell, int year)
    {
        if (cell.IsEmpty()) return null;
        var s = cell.GetFormattedString().Trim();
        var m = Regex.Match(s, @"(\d{1,2})\D+(\d{1,2})");
        if (!m.Success) return null;
        try { return new DateTime(year, int.Parse(m.Groups[1].Value), int.Parse(m.Groups[2].Value)); }
        catch { return null; }
    }

    /// <summary>
    /// Đọc 1 ô giờ: ưu tiên giá trị thời gian thật (TimeSpan/DateTime/số phân số), vì GetString
    /// trả về định dạng 12 giờ sai. Nếu là text thì nhận LỄ/OFF và "HH:mm" (kèm * = bất thường).
    /// </summary>
    private static void ReadTimeInto(IXLCell cell, List<TimeSpan> times, List<string> statusSet, ref bool flag)
    {
        if (cell.IsEmpty()) return;
        try
        {
            if (cell.DataType == XLDataType.TimeSpan) { times.Add(cell.GetTimeSpan()); return; }
            if (cell.DataType == XLDataType.DateTime) { times.Add(cell.GetDateTime().TimeOfDay); return; }
            if (cell.DataType == XLDataType.Number) { var v = cell.GetDouble(); if (v > 0 && v < 2) { times.Add(TimeSpan.FromDays(v)); return; } }
        }
        catch { /* rơi xuống đọc chuỗi */ }

        var s = cell.GetString().Trim();
        if (s.Length == 0) return;
        var upper = s.ToUpperInvariant();
        if (upper is "LỄ" or "LE") { if (!statusSet.Contains("LỄ")) statusSet.Add("LỄ"); return; }
        if (upper == "OFF") { if (!statusSet.Contains("OFF")) statusSet.Add("OFF"); return; }

        bool star = s.Contains('*');
        var m = Regex.Match(s.Replace("*", ""), @"(\d{1,2}):(\d{2})");
        if (m.Success &&
            int.TryParse(m.Groups[1].Value, out var h) &&
            int.TryParse(m.Groups[2].Value, out var mi) &&
            h < 24 && mi < 60)
        {
            times.Add(new TimeSpan(h, mi, 0));
            if (star) flag = true;
        }
    }

    private static string Fmt(TimeSpan t) => $"{t.Hours:D2}:{t.Minutes:D2}";

    private static bool RowContains(IXLWorksheet ws, int row, int lastCol, string text)
    {
        for (int c = 1; c <= lastCol; c++)
            if (ws.Cell(row, c).GetString().Contains(text, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    // ===================== DTO + Export =====================

    private static TimesheetPersonDto ToDto(TimesheetPerson p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Stats = Deserialize<List<TimesheetStatDto>>(p.StatsJson) ?? new(),
        Days = Deserialize<List<TimesheetDayDto>>(p.DaysJson) ?? new()
    };

    private static T? Deserialize<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return default;
        try { return JsonSerializer.Deserialize<T>(json); }
        catch { return default; }
    }

    private static XLWorkbook BuildWorkbook(List<TimesheetPerson> people)
    {
        var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("ChamCong");

        string[] headers = { "Tên", "Ngày", "Thứ", "Giờ vào", "Giờ ra", "Trạng thái" };
        for (int c = 0; c < headers.Length; c++)
            ws.Cell(1, c + 1).Value = headers[c];
        var hr = ws.Range(1, 1, 1, headers.Length);
        hr.Style.Font.Bold = true;
        hr.Style.Fill.BackgroundColor = XLColor.FromHtml("#21303B");
        hr.Style.Font.FontColor = XLColor.White;
        hr.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = 2;
        foreach (var p in people)
        {
            var days = Deserialize<List<TimesheetDayDto>>(p.DaysJson) ?? new();
            foreach (var d in days)
            {
                ws.Cell(row, 1).Value = p.Name;
                ws.Cell(row, 2).Value = d.Date;
                ws.Cell(row, 3).Value = d.Weekday;
                ws.Cell(row, 4).Value = d.CheckIn ?? "";
                ws.Cell(row, 5).Value = d.CheckOut ?? "";
                ws.Cell(row, 6).Value = d.Status ?? "";
                row++;
            }
        }

        ws.Columns().AdjustToContents();
        return wb;
    }
}
