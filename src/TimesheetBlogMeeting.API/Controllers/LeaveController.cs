using System.Globalization;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Bảng "Phép tồn" với CỘT ĐỘNG — bộ cột được dựng theo dòng tiêu đề của file Excel
/// khi import (file có cột gì thì bảng/template/export hiện đúng cột đó).
/// - Mọi người dùng đã đăng nhập: chỉ XEM (GET) và xuất Excel.
/// - Admin: thêm/sửa/xoá từng dòng và import từ file Excel (import sẽ dựng lại bảng theo file).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeaveController : ControllerBase
{
    private const string ExcelContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    // Bộ cột mặc định cho file mẫu khi bảng còn trống (chưa import lần nào).
    private static readonly string[] DefaultHeaders =
    {
        "Mã NV", "Tên nhân viên", "Team",
        "Tồn 2025", "Tổng phép đến 6/2026", "Nghỉ phép không lương",
        "Ngày nghỉ (đã sd)", "Còn lại"
    };

    private readonly AppDbContext _db;

    public LeaveController(AppDbContext db)
    {
        _db = db;
    }

    // ---- Ai cũng xem được ----

    [HttpGet]
    public async Task<ActionResult<LeaveTableDto>> GetTable()
    {
        var cols = await _db.LeaveColumns.OrderBy(c => c.Position).ToListAsync();
        var rows = await _db.LeaveRows.OrderBy(r => r.Position).ToListAsync();

        return Ok(new LeaveTableDto
        {
            Columns = cols.Select(c => new LeaveColumnDto
            {
                Id = c.Id, Position = c.Position, Header = c.Header, IsNumeric = c.IsNumeric
            }).ToList(),
            Rows = rows.Select(r => new LeaveRowDto
            {
                Id = r.Id, Position = r.Position, Cells = Deserialize(r.CellsJson)
            }).ToList()
        });
    }

    /// <summary>Xuất bảng hiện tại ra Excel (đúng các cột đang có).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var cols = await _db.LeaveColumns.OrderBy(c => c.Position).ToListAsync();
        var rows = await _db.LeaveRows.OrderBy(r => r.Position).ToListAsync();
        using var wb = BuildWorkbook(cols, rows);
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), ExcelContentType, "PhepTon.xlsx");
    }

    /// <summary>Tải file mẫu = đúng bộ cột hiện tại (hoặc bộ cột mặc định nếu bảng trống).</summary>
    [HttpGet("template")]
    public async Task<IActionResult> Template()
    {
        var cols = await _db.LeaveColumns.OrderBy(c => c.Position).ToListAsync();
        if (cols.Count == 0)
        {
            cols = DefaultHeaders.Select((h, i) => new LeaveColumn
            {
                Position = i, Header = h, IsNumeric = i >= 3 // 3 cột đầu là chữ
            }).ToList();
        }
        using var wb = BuildWorkbook(cols, new List<LeaveRow>());
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return File(ms.ToArray(), ExcelContentType, "Mau_PhepTon.xlsx");
    }

    // ---- Chỉ admin ----

    [HttpPost("rows")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LeaveRowDto>> AddRow(LeaveRowRequest request)
    {
        if (!await _db.LeaveColumns.AnyAsync())
            return BadRequest(new { message = "Bảng chưa có cột. Hãy import file Excel để dựng cột trước." });
        if (request.Cells == null || request.Cells.Values.All(string.IsNullOrWhiteSpace))
            return BadRequest(new { message = "Dòng trống — vui lòng nhập ít nhất một ô." });

        int nextPos = (await _db.LeaveRows.AnyAsync())
            ? await _db.LeaveRows.MaxAsync(r => r.Position) + 1 : 0;

        var row = new LeaveRow { Position = nextPos, CellsJson = Serialize(request.Cells) };
        _db.LeaveRows.Add(row);
        await _db.SaveChangesAsync();
        return Ok(new LeaveRowDto { Id = row.Id, Position = row.Position, Cells = Deserialize(row.CellsJson) });
    }

    [HttpPut("rows/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LeaveRowDto>> UpdateRow(Guid id, LeaveRowRequest request)
    {
        var row = await _db.LeaveRows.FindAsync(id);
        if (row == null) return NotFound(new { message = "Không tìm thấy dòng." });
        row.CellsJson = Serialize(request.Cells ?? new());
        await _db.SaveChangesAsync();
        return Ok(new LeaveRowDto { Id = row.Id, Position = row.Position, Cells = Deserialize(row.CellsJson) });
    }

    [HttpDelete("rows/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteRow(Guid id)
    {
        var row = await _db.LeaveRows.FindAsync(id);
        if (row == null) return NotFound(new { message = "Không tìm thấy dòng." });
        _db.LeaveRows.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Xoá sạch bảng (cả cột lẫn dòng).</summary>
    [HttpDelete("clear")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Clear()
    {
        _db.LeaveRows.RemoveRange(_db.LeaveRows);
        _db.LeaveColumns.RemoveRange(_db.LeaveColumns);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Import file Excel (.xlsx). Tự quét mọi sheet, dò dòng tiêu đề và DỰNG CỘT theo đúng
    /// các cột trong file (lấy khối cột liền nhau từ tiêu đề, dừng ở ô tiêu đề trống đầu tiên
    /// để bỏ qua phần lịch/cột thừa). Import sẽ thay thế toàn bộ bảng hiện tại.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ImportResult>> Import(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Chưa chọn file." });
        if (Path.GetExtension(file.FileName).ToLowerInvariant() != ".xlsx")
            return BadRequest(new { message = "Chỉ hỗ trợ file .xlsx" });

        List<string> headers;
        List<Dictionary<string, string?>> dataRows;

        try
        {
            using var stream = file.OpenReadStream();
            using var wb = new XLWorkbook(stream);
            if (!TryExtractTable(wb, out headers, out dataRows))
                return BadRequest(new { message = "Không tìm thấy bảng có dòng tiêu đề trong file. Hãy đảm bảo file có một hàng tiêu đề cột." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Không đọc được file Excel: " + ex.Message });
        }

        // Cột nào toàn số -> IsNumeric (căn phải, nhập ô number).
        var numeric = new bool[headers.Count];
        for (int c = 0; c < headers.Count; c++)
        {
            bool any = false, allNum = true;
            foreach (var dr in dataRows)
            {
                var v = dr.TryGetValue(c.ToString(), out var s) ? s : null;
                if (string.IsNullOrWhiteSpace(v)) continue;
                any = true;
                if (!IsNumber(v)) { allNum = false; break; }
            }
            numeric[c] = any && allNum;
        }

        // Thay thế toàn bộ bảng.
        _db.LeaveRows.RemoveRange(_db.LeaveRows);
        _db.LeaveColumns.RemoveRange(_db.LeaveColumns);

        for (int c = 0; c < headers.Count; c++)
            _db.LeaveColumns.Add(new LeaveColumn { Position = c, Header = headers[c], IsNumeric = numeric[c] });

        int pos = 0;
        foreach (var dr in dataRows)
            _db.LeaveRows.Add(new LeaveRow { Position = pos++, CellsJson = Serialize(dr) });

        await _db.SaveChangesAsync();
        return Ok(new ImportResult { Imported = dataRows.Count });
    }

    // ---- Đọc bảng từ workbook ----

    /// <summary>
    /// Quét mọi sheet, chọn dòng tiêu đề tốt nhất (khối cột chữ liền nhau dài nhất, ưu tiên
    /// dòng chứa từ khoá phép/nghỉ/tồn/còn lại). Trả về danh sách tiêu đề + dữ liệu các dòng.
    /// </summary>
    private static bool TryExtractTable(XLWorkbook wb,
        out List<string> headers, out List<Dictionary<string, string?>> dataRows)
    {
        headers = new();
        dataRows = new();

        IXLWorksheet? bestWs = null;
        int bestRow = 0, bestStartCol = 0, bestCount = 0, bestScore = int.MinValue;

        foreach (var ws in wb.Worksheets)
        {
            var used = ws.RangeUsed();
            if (used == null) continue;
            int first = used.FirstRow().RowNumber();
            int last = Math.Min(used.LastRow().RowNumber(), first + 14);

            for (int r = first; r <= last; r++)
            {
                var row = ws.Row(r);
                var firstCell = row.FirstCellUsed();
                if (firstCell == null) continue;
                int startCol = firstCell.Address.ColumnNumber;

                // Khối cột liền nhau: dừng ở ô tiêu đề trống đầu tiên.
                int count = 0, textCells = 0;
                bool hasKeyword = false;
                for (int c = startCol; ; c++)
                {
                    var cell = ws.Cell(r, c);
                    if (cell.IsEmpty()) break;
                    var s = cell.GetString().Trim();
                    if (s.Length == 0) break;
                    count++;
                    if (cell.DataType == XLDataType.Text && !IsNumber(s)) textCells++;
                    var n = Normalize(s);
                    if (n.Contains("phep") || n.Contains("nghi") || n.Contains("ton") ||
                        n.Contains("con lai") || n.Contains("team") || n.Contains("nhan vien"))
                        hasKeyword = true;
                    if (count >= 100) break; // chặn trường hợp bất thường
                }

                // Dòng tiêu đề: >=2 cột và phần lớn là chữ.
                if (count < 2 || textCells < Math.Max(2, count / 2)) continue;

                int score = count + (hasKeyword ? 1000 : 0);
                if (score > bestScore)
                {
                    bestScore = score;
                    bestWs = ws; bestRow = r; bestStartCol = startCol; bestCount = count;
                }
            }
        }

        if (bestWs == null) return false;

        for (int i = 0; i < bestCount; i++)
            headers.Add(bestWs.Cell(bestRow, bestStartCol + i).GetString().Trim());

        int lastRow = bestWs.RangeUsed()!.LastRow().RowNumber();
        bool started = false;
        for (int r = bestRow + 1; r <= lastRow; r++)
        {
            var cells = new Dictionary<string, string?>();
            bool anyValue = false;
            for (int i = 0; i < bestCount; i++)
            {
                var v = CellToString(bestWs.Cell(r, bestStartCol + i));
                cells[i.ToString()] = v;
                if (!string.IsNullOrWhiteSpace(v)) anyValue = true;
            }

            if (!anyValue)
            {
                // Bỏ qua các dòng trống ngay dưới tiêu đề (vd hàng ngày tháng của lịch);
                // nhưng khi đã có dữ liệu thì dòng trống đầu tiên = kết thúc bảng
                // (bỏ phần ghi chú bên dưới như "Các chế độ nghỉ phép").
                if (started) break;
                continue;
            }
            started = true;
            dataRows.Add(cells);
        }
        return true;
    }

    private static XLWorkbook BuildWorkbook(List<LeaveColumn> cols, List<LeaveRow> rows)
    {
        var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("PhepTon");

        if (cols.Count == 0)
        {
            ws.Cell(1, 1).Value = "Chưa có dữ liệu";
            return wb;
        }

        for (int c = 0; c < cols.Count; c++)
            ws.Cell(1, c + 1).Value = cols[c].Header;

        var headerRange = ws.Range(1, 1, 1, cols.Count);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#21303B");
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int rowIndex = 2;
        foreach (var row in rows)
        {
            var cells = Deserialize(row.CellsJson);
            for (int c = 0; c < cols.Count; c++)
            {
                var key = cols[c].Position.ToString();
                cells.TryGetValue(key, out var val);
                var cell = ws.Cell(rowIndex, c + 1);
                if (cols[c].IsNumeric && !string.IsNullOrWhiteSpace(val) &&
                    double.TryParse(val.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
                    cell.Value = d;
                else
                    cell.Value = val ?? "";
            }
            rowIndex++;
        }

        ws.Columns().AdjustToContents();
        return wb;
    }

    // ---- Helpers ----

    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = false };

    private static string Serialize(Dictionary<string, string?> cells) =>
        JsonSerializer.Serialize(cells, JsonOpts);

    private static Dictionary<string, string?> Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<Dictionary<string, string?>>(json) ?? new(); }
        catch { return new(); }
    }

    private static bool IsNumber(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        return double.TryParse(s.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out _);
    }

    private static string CellToString(IXLCell cell)
    {
        if (cell.IsEmpty()) return "";
        try
        {
            switch (cell.DataType)
            {
                case XLDataType.Number:
                    return cell.GetDouble().ToString(CultureInfo.InvariantCulture);
                case XLDataType.DateTime:
                    return cell.GetDateTime().ToString("yyyy-MM-dd");
                case XLDataType.Boolean:
                    return cell.GetString().Trim();
            }
        }
        catch { /* rơi xuống đọc chuỗi */ }
        return cell.GetString().Trim();
    }

    /// <summary>Bỏ dấu tiếng Việt, gộp khoảng trắng, thường hoá — dùng để dò từ khoá tiêu đề.</summary>
    private static string Normalize(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        s = s.Replace('\n', ' ').Replace('\r', ' ').Trim().ToLowerInvariant();
        var sb = new System.Text.StringBuilder(s.Length);
        char prev = '\0';
        foreach (var ch in s)
        {
            char c = RemoveDiacritic(ch);
            if (c == ' ' && prev == ' ') continue;
            sb.Append(c); prev = c;
        }
        return sb.ToString();
    }

    private static char RemoveDiacritic(char c)
    {
        const string from = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
        const string to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
        int idx = from.IndexOf(c);
        return idx >= 0 ? to[idx] : c;
    }
}
