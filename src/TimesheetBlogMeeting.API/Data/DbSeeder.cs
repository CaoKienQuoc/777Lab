using TimesheetBlogMeeting.API.Helpers;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Data;

/// <summary>
/// Khởi tạo dữ liệu mặc định: tài khoản admin cố định.
/// Tài khoản:  admin  /  Admin@123
/// </summary>
public static class DbSeeder
{
    public const string AdminUsername = "admin";

    public static void Seed(AppDbContext db)
    {
        if (!db.Users.Any(u => u.Username == AdminUsername))
        {
            db.Users.Add(new User
            {
                Username = AdminUsername,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("777LabAdmin@123"),
                FullName = "Quản trị viên",
                Role = "Admin",
                CreatedAt = TimeHelper.VnNow
            });
            db.SaveChanges();
        }
    }
}
