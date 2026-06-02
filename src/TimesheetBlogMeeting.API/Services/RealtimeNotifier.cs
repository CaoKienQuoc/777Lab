using Microsoft.AspNetCore.SignalR;
using TimesheetBlogMeeting.API.Hubs;

namespace TimesheetBlogMeeting.API.Services;

/// <summary>
/// Phát thông báo real-time cho mọi client khi một loại dữ liệu thay đổi.
/// </summary>
public interface IRealtimeNotifier
{
    /// <param name="resource">blog | leave | timesheet | meeting | users</param>
    /// <param name="action">created | updated | deleted | imported | cleared</param>
    Task NotifyAsync(string resource, string action);
}

public class RealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<AppHub> _hub;

    public RealtimeNotifier(IHubContext<AppHub> hub) => _hub = hub;

    public Task NotifyAsync(string resource, string action) =>
        _hub.Clients.All.SendAsync("resourceChanged", new { resource, action });
}
