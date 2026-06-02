using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TimesheetBlogMeeting.API.Hubs;

/// <summary>
/// Hub real-time chung cho toàn ứng dụng. Server đẩy sự kiện "resourceChanged"
/// xuống mọi client mỗi khi có thao tác thay đổi dữ liệu (blog, phép tồn, chấm công,
/// lịch họp, người dùng) để client tự cập nhật ngay, tránh hiển thị chậm hoặc
/// thao tác trùng lặp. Chỉ dùng server → client nên không có method cho client gọi lên.
/// Yêu cầu đã đăng nhập (JWT) mới được kết nối.
/// </summary>
[Authorize]
public class AppHub : Hub
{
}
