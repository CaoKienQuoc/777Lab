using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Services;

public class LeaveMonthlyRenewalService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LeaveMonthlyRenewalService> _logger;
    private readonly double _monthlyAccrual;

    public LeaveMonthlyRenewalService(
        IServiceScopeFactory scopeFactory,
        ILogger<LeaveMonthlyRenewalService> logger,
        IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _monthlyAccrual = config.GetValue<double>("Leave:MonthlyAccrual", 1.0);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Kiểm tra ngay khi khởi động (phòng trường hợp server tắt đúng ngày mùng 1)
        await RunDailyCheckAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            // Tính thời gian ngủ đến nửa đêm hôm sau
            var now = DateTime.Now;
            var nextMidnight = now.Date.AddDays(1);
            var delay = nextMidnight - now;
            if (delay <= TimeSpan.Zero) delay = TimeSpan.FromMinutes(5);

            try { await Task.Delay(delay, stoppingToken); }
            catch (OperationCanceledException) { break; }

            await RunDailyCheckAsync(stoppingToken);
        }
    }

    private async Task RunDailyCheckAsync(CancellationToken ct)
    {
        if (DateTime.Now.Day != 1) return;
        var (updated, msg) = await DoRenewalAsync(force: false, ct);
        if (updated > 0)
            _logger.LogInformation("LeaveMonthlyRenewal: {Message}", msg);
    }

    /// <summary>
    /// Cộng phép tháng cho toàn bộ nhân viên.
    /// force=true: bỏ qua kiểm tra "đã chạy tháng này chưa" (dùng cho admin trigger thủ công).
    /// </summary>
    public async Task<(int Updated, string Message)> DoRenewalAsync(bool force, CancellationToken ct = default)
    {
        var yearMonth = DateTime.Now.ToString("yyyy-MM");

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rt = scope.ServiceProvider.GetRequiredService<IRealtimeNotifier>();

        var alreadyLogged = await db.LeaveRenewalLogs.AnyAsync(l => l.YearMonth == yearMonth, ct);
        if (!force && alreadyLogged)
            return (0, $"Đã cộng phép cho tháng {yearMonth} rồi.");

        var cols = await db.LeaveColumns.ToListAsync(ct);
        var col2 = cols.FirstOrDefault(c => IsCol2(c.Header));
        if (col2 == null) return (0, "Không tìm thấy cột tổng phép (2) trong bảng.");

        var col1 = cols.FirstOrDefault(c => IsCol1(c.Header));
        var col3 = cols.FirstOrDefault(c => IsCol3(c.Header));
        var colR = cols.FirstOrDefault(c => IsColResult(c.Header));

        var rows = await db.LeaveRows.ToListAsync(ct);
        foreach (var row in rows)
        {
            var cells = DeserializeCells(row.CellsJson);
            var k2 = col2.Position.ToString();
            var cur2 = ParseNum(cells.TryGetValue(k2, out var v2) ? v2 : null);
            var new2 = cur2 + _monthlyAccrual;
            cells[k2] = FormatNum(new2);

            // Cập nhật "Còn lại" nếu có đủ các cột công thức
            if (col1 != null && col3 != null && colR != null)
            {
                var v1 = ParseNum(cells.TryGetValue(col1.Position.ToString(), out var s1) ? s1 : null);
                var v3 = ParseNum(cells.TryGetValue(col3.Position.ToString(), out var s3) ? s3 : null);
                cells[colR.Position.ToString()] = FormatNum(v1 + new2 - v3);
            }

            row.CellsJson = SerializeCells(cells);
        }

        if (!alreadyLogged)
            db.LeaveRenewalLogs.Add(new LeaveRenewalLog { YearMonth = yearMonth });

        await db.SaveChangesAsync(ct);
        if (rows.Count > 0) await rt.NotifyAsync("leave", "updated");

        var msg = $"Đã cộng {_monthlyAccrual} ngày phép cho {rows.Count} nhân viên (tháng {yearMonth}).";
        _logger.LogInformation("{Message}", msg);
        return (rows.Count, msg);
    }

    // Nhận diện vai trò cột theo hậu tố công thức trong tiêu đề
    private static bool IsCol1(string h) => Regex.IsMatch(h, @"\(\s*1\s*\)\s*$") && !h.Contains("1+2");
    private static bool IsCol2(string h) => Regex.IsMatch(h, @"\(\s*2\s*\)\s*$");
    private static bool IsCol3(string h) => Regex.IsMatch(h, @"\(\s*3\s*\)\s*$") && !h.Contains("1+2");
    private static bool IsColResult(string h) => h.Contains("1+2");

    private static double ParseNum(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return 0;
        return double.TryParse(s.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : 0;
    }

    private static string FormatNum(double d) =>
        (Math.Round(d * 1000) / 1000).ToString(CultureInfo.InvariantCulture);

    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = false };

    private static string SerializeCells(Dictionary<string, string?> cells) =>
        JsonSerializer.Serialize(cells, JsonOpts);

    private static Dictionary<string, string?> DeserializeCells(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<Dictionary<string, string?>>(json) ?? new(); }
        catch { return new(); }
    }
}
