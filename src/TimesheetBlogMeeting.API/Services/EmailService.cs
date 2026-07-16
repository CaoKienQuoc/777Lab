using System.Net;
using System.Net.Mail;
using System.Text;

namespace TimesheetBlogMeeting.API.Services;

/// <summary>Cấu hình SMTP, nạp từ section "Email" (appsettings + biến môi trường Email__*).</summary>
public class EmailSettings
{
    public bool Enabled { get; set; } = false;
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;     // tài khoản đăng nhập SMTP (email Gmail)
    public string Password { get; set; } = string.Empty; // App Password 16 ký tự của Gmail
    public string From { get; set; } = string.Empty;     // địa chỉ gửi; rỗng -> dùng User
    public string FromName { get; set; } = "Blog 777LAB";
    public string AppUrl { get; set; } = string.Empty;   // link "Xem trên hệ thống" (tuỳ chọn)
}

public interface IEmailService
{
    /// <summary>Gửi email thông báo có bài blog mới. Chạy NỀN (fire-and-forget) — không chặn request đăng bài.</summary>
    void QueueBlogNotification(string title, string content, DateTime postedAt, IReadOnlyCollection<string> recipients);
}

public class EmailService : IEmailService
{
    private readonly EmailSettings _s;
    private readonly ILogger<EmailService> _logger;

    public EmailService(EmailSettings settings, ILogger<EmailService> logger)
    {
        _s = settings;
        _logger = logger;
    }

    public void QueueBlogNotification(string title, string content, DateTime postedAt, IReadOnlyCollection<string> recipients)
    {
        if (!_s.Enabled)
        {
            _logger.LogInformation("Email đang TẮT (Email:Enabled=false) — bỏ qua gửi thông báo blog.");
            return;
        }

        var list = recipients
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (list.Count == 0) return;

        var subject = $"[Blog 777LAB] {title}";
        var body = BuildHtml(title, content, postedAt);

        // Chạy nền: lỗi gửi mail KHÔNG ảnh hưởng tới việc đăng bài.
        _ = Task.Run(() => SendAsync(subject, body, list));
    }

    private async Task SendAsync(string subject, string htmlBody, List<string> recipients)
    {
        try
        {
            var from = string.IsNullOrWhiteSpace(_s.From) ? _s.User : _s.From;

            using var msg = new MailMessage
            {
                From = new MailAddress(from, _s.FromName, Encoding.UTF8),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8
            };
            // Người nhận để ở BCC (bảo vệ riêng tư); "To" gửi về chính địa chỉ gửi.
            msg.To.Add(from);
            foreach (var r in recipients) msg.Bcc.Add(r);

            using var client = new SmtpClient(_s.Host, _s.Port)
            {
                EnableSsl = true,                       // STARTTLS (Gmail cổng 587)
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Credentials = new NetworkCredential(_s.User, _s.Password)
            };

            await client.SendMailAsync(msg);
            _logger.LogInformation("Đã gửi email thông báo blog tới {Count} người nhận.", recipients.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gửi email thông báo blog thất bại.");
        }
    }

    private string BuildHtml(string title, string content, DateTime postedAt)
    {
        static string Enc(string s) => WebUtility.HtmlEncode(s ?? string.Empty);

        var sb = new StringBuilder();
        sb.Append("<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;color:#222\">");
        sb.Append($"<h2 style=\"color:#1f6feb;margin:0 0 8px\">{Enc(title)}</h2>");
        sb.Append($"<p style=\"color:#555;margin:0 0 16px\"><b>Thời gian đăng:</b> {postedAt:dd/MM/yyyy HH:mm}</p>");
        sb.Append($"<div style=\"white-space:pre-wrap;line-height:1.6\">{Enc(content)}</div>");
        if (!string.IsNullOrWhiteSpace(_s.AppUrl))
            sb.Append($"<p style=\"margin-top:22px\"><a href=\"{Enc(_s.AppUrl)}\" style=\"background:#1f6feb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none\">Xem trên hệ thống</a></p>");
        sb.Append("<hr style=\"border:none;border-top:1px solid #eee;margin:24px 0 8px\">");
        sb.Append("<p style=\"color:#999;font-size:12px\">Email tự động từ hệ thống nội bộ 777LAB. Vui lòng không trả lời email này.</p>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
