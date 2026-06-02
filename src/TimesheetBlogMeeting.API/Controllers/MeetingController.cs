using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.DTOs;
using TimesheetBlogMeeting.API.Helpers;
using TimesheetBlogMeeting.API.Models;
using TimesheetBlogMeeting.API.Services;

namespace TimesheetBlogMeeting.API.Controllers;

/// <summary>
/// Lịch họp. Mọi người dùng đăng nhập đều có thể tạo lịch họp của mình.
/// Chỉ người tạo hoặc admin mới được sửa/xoá. Hệ thống tự kiểm tra trùng khung giờ.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MeetingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotifier _rt;

    public MeetingController(AppDbContext db, IRealtimeNotifier rt)
    {
        _db = db;
        _rt = rt;
    }

    private Guid CurrentUserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(raw, out var guid)) return guid;
            throw new UnauthorizedAccessException("Token không hợp lệ. Vui lòng đăng nhập lại.");
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MeetingResponse>>> GetAll()
    {
        var meetings = await _db.Meetings
            .Include(m => m.CreatedBy)
            .OrderBy(m => m.MeetingDate).ThenBy(m => m.StartTime)
            .Select(m => ToResponse(m))
            .ToListAsync();
        return Ok(meetings);
    }

    [HttpPost]
    public async Task<ActionResult<MeetingResponse>> Create(MeetingRequest request)
    {
        if (!TryParseTime(request.StartTime, out var start) || !TryParseTime(request.EndTime, out var end))
            return BadRequest(new { message = "Giờ không hợp lệ (định dạng HH:mm)." });
        if (end <= start)
            return BadRequest(new { message = "Giờ kết thúc phải sau giờ bắt đầu." });

        var conflict = await HasConflictAsync(request.MeetingDate.Date, start, end, null);
        if (conflict != null)
            return Conflict(new { message = $"Trùng lịch với cuộc họp \"{conflict.Title}\" ({conflict.StartTime}–{conflict.EndTime})." });

        var meeting = new Meeting
        {
            Title = request.Title.Trim(),
            Description = request.Description,
            MeetingDate = request.MeetingDate.Date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            CreatedById = CurrentUserId,
            CreatedAt = TimeHelper.VnNow
        };

        _db.Meetings.Add(meeting);
        await _db.SaveChangesAsync();
        await _db.Entry(meeting).Reference(m => m.CreatedBy).LoadAsync();
        await _rt.NotifyAsync("meeting", "created");
        return CreatedAtAction(nameof(GetAll), ToResponse(meeting));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MeetingResponse>> Update(Guid id, MeetingRequest request)
    {
        var meeting = await _db.Meetings.Include(m => m.CreatedBy).FirstOrDefaultAsync(m => m.Id == id);
        if (meeting == null) return NotFound(new { message = "Không tìm thấy lịch họp." });
        if (meeting.CreatedById != CurrentUserId) return Forbid();

        if (!TryParseTime(request.StartTime, out var start) || !TryParseTime(request.EndTime, out var end))
            return BadRequest(new { message = "Giờ không hợp lệ (định dạng HH:mm)." });
        if (end <= start)
            return BadRequest(new { message = "Giờ kết thúc phải sau giờ bắt đầu." });

        var conflict = await HasConflictAsync(request.MeetingDate.Date, start, end, id);
        if (conflict != null)
            return Conflict(new { message = $"Trùng lịch với cuộc họp \"{conflict.Title}\" ({conflict.StartTime}–{conflict.EndTime})." });

        meeting.Title = request.Title.Trim();
        meeting.Description = request.Description;
        meeting.MeetingDate = request.MeetingDate.Date;
        meeting.StartTime = request.StartTime;
        meeting.EndTime = request.EndTime;

        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("meeting", "updated");
        return Ok(ToResponse(meeting));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var meeting = await _db.Meetings.FindAsync(id);
        if (meeting == null) return NotFound(new { message = "Không tìm thấy lịch họp." });
        if (meeting.CreatedById != CurrentUserId) return Forbid();

        _db.Meetings.Remove(meeting);
        await _db.SaveChangesAsync();
        await _rt.NotifyAsync("meeting", "deleted");
        return NoContent();
    }

    // ---- Helpers ----

    private async Task<Meeting?> HasConflictAsync(DateTime date, TimeSpan start, TimeSpan end, Guid? excludeId)
    {
        var sameDay = await _db.Meetings
            .Where(m => m.MeetingDate == date && (excludeId == null || m.Id != excludeId))
            .ToListAsync();

        foreach (var m in sameDay)
        {
            if (TryParseTime(m.StartTime, out var s) && TryParseTime(m.EndTime, out var e))
            {
                // Trùng nếu start < e && s < end
                if (start < e && s < end)
                    return m;
            }
        }
        return null;
    }

    private static bool TryParseTime(string value, out TimeSpan result)
    {
        return TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out result)
            || TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out result);
    }

    private static MeetingResponse ToResponse(Meeting m) => new()
    {
        Id = m.Id,
        Title = m.Title,
        Description = m.Description,
        MeetingDate = m.MeetingDate,
        StartTime = m.StartTime,
        EndTime = m.EndTime,
        CreatedById = m.CreatedById,
        CreatedByName = m.CreatedBy?.FullName ?? "",
        CreatedAt = m.CreatedAt
    };
}
