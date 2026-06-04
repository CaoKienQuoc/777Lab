using System.Globalization;
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
/// để xem thống kê + bảng theo ngày, tách buổi sáng / buổi chiều (vào làm – ra nghỉ)
/// và trạng thái (LỄ / OFF / đi muộn / về sớm).
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

                    RecalculateNgayLam(stats, days);

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

        /// <summary>Tính lại thống kê \"Ngày làm\" dựa trên ngày đi làm thực tế (Thứ 2-Thứ 6, loại trừ LỄ/OFF).</summary>
        private static void RecalculateNgayLam(List<TimesheetStatDto> stats, List<TimesheetDayDto> days)
        {
            var workDayCount = days.Count(d => IsWorkDay(d));
            var existing = stats.FirstOrDefault(s => s.Label == "Ngày làm");
            if (existing != null)
                existing.Value = workDayCount.ToString();
            else
                stats.Add(new TimesheetStatDto { Label = "Ngày làm", Value = workDayCount.ToString() });
        }

        /// <summary>Ngày đi làm thực tế: là ngày trong tuần (Thứ 2-Thứ 6) và không phải LỄ hoặc OFF.</summary>
        private static bool IsWorkDay(TimesheetDayDto d)
        {
            if (DateTime.TryParse(d.Date, out var date))
            {
                int dow = (int)date.DayOfWeek;
                if (dow == 0 || dow == 6) return false;
            }

            if (!string.IsNullOrWhiteSpace(d.Status))
            {
                var statusUp = d.Status.ToUpperInvariant();
                if (statusUp.Contains("LỄ") || statusUp.Contains("OFF"))
                    return false;
            }

            return true;
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

    /// <summary>
    /// Đọc 1 nửa bảng (1 ngày) từ startCol: [Ngày, Tuần, Vào, Ra, Vào, Ra, Vào, Ra].
    /// Theo đúng bố cục file: cặp 1 = buổi sáng (vào/ra), cặp 2 = buổi chiều (vào/ra),
    /// cặp 3 (hiếm) là dự phòng. Mỗi ô giữ nguyên giá trị hiển thị: giờ "HH:mm",
    /// hoặc nhãn OFF/LỄ, hoặc ghi chú (vd "XIN VỀ SỚM"). Trạng thái do ComputeStatus tính theo giờ.
    /// </summary>
    private static void ParseDayHalf(IXLWorksheet ws, int row, int startCol, int year, List<TimesheetDayDto> days)
    {
        var date = ReadDate(ws.Cell(row, startCol), year);
        if (date == null) return;

        var weekday = ws.Cell(row, startCol + 1).GetString().Trim();

        // 6 ô giờ: [0]=Sáng Vào, [1]=Sáng Ra, [2]=Chiều Vào, [3]=Chiều Ra, [4][5]=cặp dự phòng
        var cells = new DayCell[6];
        for (int k = 0; k < 6; k++) cells[k] = ReadCell(ws.Cell(row, startCol + 2 + k));

        var mIn = cells[0]; var mOut = cells[1];
        var aIn = cells[2]; var aOut = cells[3];

        // Cặp thứ 3 (hiếm): bổ sung cho buổi chiều để không mất lần chấm cuối ngày.
        if (aIn.Display.Length == 0 && cells[4].Display.Length > 0) aIn = cells[4];
        if (cells[5].Time is { } t3 && (aOut.Time == null || t3 > aOut.Time.Value)) aOut = cells[5];
        else if (aOut.Display.Length == 0 && cells[5].Display.Length > 0) aOut = cells[5];

        var dto = new TimesheetDayDto
        {
            Date = date.Value.ToString("yyyy-MM-dd"),
            Weekday = weekday,
            MorningIn = NullIfEmpty(mIn.Display),
            MorningOut = NullIfEmpty(mOut.Display),
            AfternoonIn = NullIfEmpty(aIn.Display),
            AfternoonOut = NullIfEmpty(aOut.Display),
        };
        dto.Status = ComputeStatus(dto);
        days.Add(dto);
    }

    private static string? NullIfEmpty(string s) => string.IsNullOrEmpty(s) ? null : s;

    /// <summary>
    /// Quy tắc trạng thái: vào làm (sáng) sau 08:00 → "đi muộn"; ra nghỉ (chiều) trước 17:00 → "về sớm".
    /// LỄ → "LỄ". OFF: chỉ buổi sáng → "Off sáng", chỉ chiều → "Off chiều", cả ngày → "Off".
    /// </summary>
    private static string? ComputeStatus(TimesheetDayDto d)
    {
        var parts = new List<string>();
        if (new[] { d.MorningIn, d.MorningOut, d.AfternoonIn, d.AfternoonOut }
                .Any(c => string.Equals(c?.Trim(), "LỄ", StringComparison.OrdinalIgnoreCase)))
            parts.Add("LỄ");

        var off = OffLabel(d);
        if (off != null) parts.Add(off);

        if (TryTime(d.MorningIn, out var mi) && mi > new TimeSpan(8, 0, 0)) parts.Add("đi muộn");
        if (TryTime(d.AfternoonOut, out var ao) && ao < new TimeSpan(17, 0, 0)) parts.Add("về sớm");
        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    /// <summary>Nhãn OFF theo buổi: cả 2 buổi → "Off"; chỉ sáng → "Off sáng"; chỉ chiều → "Off chiều".</summary>
    private static string? OffLabel(TimesheetDayDto d)
    {
        static bool IsOff(string? v) => !string.IsNullOrWhiteSpace(v) && v.Trim().ToUpperInvariant().StartsWith("OFF");
        bool mOff = IsOff(d.MorningIn) || IsOff(d.MorningOut);
        bool aOff = IsOff(d.AfternoonIn) || IsOff(d.AfternoonOut);
        if (mOff && aOff) return "Off";
        if (mOff) return "Off sáng";
        if (aOff) return "Off chiều";
        return null;
    }

    /// <summary>Phân tích chuỗi "HH:mm" thành TimeSpan. Trả về false nếu không phải giờ.</summary>
    private static bool TryTime(string? s, out TimeSpan t)
    {
        t = default;
        if (string.IsNullOrWhiteSpace(s)) return false;
        var m = Regex.Match(s.Trim(), @"^(\d{1,2}):(\d{2})$");
        if (m.Success && int.TryParse(m.Groups[1].Value, out var h) && int.TryParse(m.Groups[2].Value, out var mi)
            && h < 24 && mi < 60) { t = new TimeSpan(h, mi, 0); return true; }
        return false;
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

    /// <summary>Giá trị 1 ô giờ đã chuẩn hoá để hiển thị.</summary>
    /// <param name="Display">Chuỗi hiển thị: "HH:mm", hoặc nhãn OFF/LỄ, hoặc ghi chú; "" nếu trống.</param>
    /// <param name="Time">Giờ đã phân tích (nếu ô là giờ), dùng để so sánh sớm/muộn.</param>
    /// <param name="Star">Ô có dấu "*" (bất thường: vào muộn / ra sớm).</param>
    /// <param name="Marker">Nhãn ngày để gom vào trạng thái (LỄ/OFF...), null nếu là giờ/ghi chú.</param>
    private readonly record struct DayCell(string Display, TimeSpan? Time, bool Star, string? Marker);

    /// <summary>
    /// Đọc 1 ô giờ: ưu tiên giá trị thời gian thật (TimeSpan/DateTime/số phân số), vì GetString
    /// trả về định dạng 12 giờ sai. Nếu là text thì nhận LỄ/OFF, "HH:mm" (kèm * = bất thường),
    /// hoặc giữ nguyên ghi chú để hiển thị.
    /// </summary>
    private static DayCell ReadCell(IXLCell cell)
    {
        if (cell.IsEmpty()) return new DayCell("", null, false, null);
        try
        {
            if (cell.DataType == XLDataType.TimeSpan) { var ts = cell.GetTimeSpan(); return new DayCell(Fmt(ts), ts, false, null); }
            if (cell.DataType == XLDataType.DateTime) { var ts = cell.GetDateTime().TimeOfDay; return new DayCell(Fmt(ts), ts, false, null); }
            if (cell.DataType == XLDataType.Number) { var v = cell.GetDouble(); if (v > 0 && v < 2) { var ts = TimeSpan.FromDays(v); return new DayCell(Fmt(ts), ts, false, null); } }
        }
        catch { /* rơi xuống đọc chuỗi */ }

        var s = cell.GetString().Trim();
        if (s.Length == 0) return new DayCell("", null, false, null);

        var upper = s.ToUpperInvariant();
        if (upper is "LỄ" or "LE") return new DayCell("LỄ", null, false, "LỄ");
        if (upper.StartsWith("OFF")) return new DayCell(s, null, false, s);   // "OFF", "OFF KL"...

        bool star = s.Contains('*');
        var m = Regex.Match(s.Replace("*", ""), @"(\d{1,2}):(\d{2})");
        if (m.Success &&
            int.TryParse(m.Groups[1].Value, out var h) &&
            int.TryParse(m.Groups[2].Value, out var mi) &&
            h < 24 && mi < 60)
        {
            var ts = new TimeSpan(h, mi, 0);
            return new DayCell(Fmt(ts), ts, star, null);
        }

        // Ghi chú tự do (vd "XIN VỀ SỚM 30'") — giữ nguyên text để hiển thị trong ô.
        return new DayCell(s, null, star, null);
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

        string[] headers =
        {
            "Tên", "Ngày", "Thứ",
            "Vào làm (sáng)", "Ra nghỉ (chiều)",
            "Trạng thái"
        };
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
                ws.Cell(row, 4).Value = d.MorningIn ?? "";
                ws.Cell(row, 5).Value = d.AfternoonOut ?? "";
                ws.Cell(row, 6).Value = ComputeStatus(d) ?? "";
                row++;
            }
        }

        ws.Columns().AdjustToContents();
        return wb;
    }
}
