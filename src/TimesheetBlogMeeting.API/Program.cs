using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TimesheetBlogMeeting.API.Data;
using TimesheetBlogMeeting.API.Hubs;
using TimesheetBlogMeeting.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Đảm bảo WebRootPath luôn trỏ đến thư mục wwwroot
if (string.IsNullOrEmpty(builder.Environment.WebRootPath))
    builder.Environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

// ---------------------------------------------------------------------------
// 1. Database (SQL Server) + Entity Framework Core
// ---------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ---------------------------------------------------------------------------
// 2. Dịch vụ sinh JWT
// ---------------------------------------------------------------------------
builder.Services.AddSingleton<TokenService>();

// ---------------------------------------------------------------------------
// 3. Xác thực bằng JWT Bearer + phân quyền theo Role
// ---------------------------------------------------------------------------
var jwtSection = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSection["Key"]!);

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // SignalR gửi JWT qua query string (?access_token=...) vì WebSocket
        // không gửi được header Authorization. Chỉ áp dụng cho đường dẫn hub.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// 4. Controllers + CORS + Swagger
// ---------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRealtimeNotifier, RealtimeNotifier>();

// Email (SMTP) — gửi thông báo khi có blog mới
var emailSettings = builder.Configuration.GetSection("Email").Get<EmailSettings>() ?? new EmailSettings();
builder.Services.AddSingleton(emailSettings);
builder.Services.AddSingleton<IEmailService, EmailService>();

// Background job: tự động cộng phép đầu mỗi tháng
builder.Services.AddSingleton<LeaveMonthlyRenewalService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<LeaveMonthlyRenewalService>());

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Timesheet - Blog - Meeting API", Version = "v1" });

    // Cho phép nhập JWT token trong giao diện Swagger
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập: Bearer {token}"
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// 5. Tạo database (nếu chưa có) và seed tài khoản admin
// ---------------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Khi chạy bằng Docker/Compose, SQL Server có thể chưa sẵn sàng ngay lúc app
    // khởi động. Thử kết nối lại vài lần trước khi bỏ cuộc (chạy local không bị
    // ảnh hưởng vì lần thử đầu tiên đã thành công ngay).
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            db.Database.EnsureCreated();   // Tạo DB + bảng theo model nếu chưa tồn tại
            break;
        }
        catch (Exception ex) when (attempt < 12)
        {
            Console.WriteLine($"[DB] Chưa kết nối được SQL Server (lần {attempt}/12): {ex.Message}. Thử lại sau 5 giây...");
            Thread.Sleep(5000);
        }
    }

    // EnsureCreated() KHÔNG thêm bảng mới vào database đã tồn tại từ trước.
    // Bảng "Phép tồn" dùng cột ĐỘNG: 1 bảng định nghĩa cột + 1 bảng dữ liệu dòng (JSON).
    // Đồng thời bỏ bảng LeaveBalances cũ (thiết kế cột cố định) nếu còn tồn tại.
    db.Database.ExecuteSqlRaw(@"
IF COL_LENGTH(N'[BlogPosts]', N'ScheduledAt') IS NULL
BEGIN
    ALTER TABLE [BlogPosts] ADD [ScheduledAt] datetime2 NULL;
END");
    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'[LeaveBalances]', N'U') IS NOT NULL DROP TABLE [LeaveBalances];
IF OBJECT_ID(N'[LeaveColumns]', N'U') IS NULL
BEGIN
    CREATE TABLE [LeaveColumns] (
        [Id] uniqueidentifier NOT NULL,
        [Position] int NOT NULL,
        [Header] nvarchar(200) NOT NULL,
        [IsNumeric] bit NOT NULL,
        CONSTRAINT [PK_LeaveColumns] PRIMARY KEY ([Id])
    );
END
IF OBJECT_ID(N'[LeaveRows]', N'U') IS NULL
BEGIN
    CREATE TABLE [LeaveRows] (
        [Id] uniqueidentifier NOT NULL,
        [Position] int NOT NULL,
        [CellsJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_LeaveRows] PRIMARY KEY ([Id])
    );
END
IF OBJECT_ID(N'[TimesheetPeople]', N'U') IS NULL
BEGIN
    CREATE TABLE [TimesheetPeople] (
        [Id] uniqueidentifier NOT NULL,
        [Position] int NOT NULL,
        [Name] nvarchar(200) NOT NULL,
        [StatsJson] nvarchar(max) NOT NULL,
        [DaysJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_TimesheetPeople] PRIMARY KEY ([Id])
    );
END
IF OBJECT_ID(N'[LeaveRenewalLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [LeaveRenewalLogs] (
        [Id] int NOT NULL IDENTITY(1,1),
        [YearMonth] nvarchar(7) NOT NULL,
        [RanAt] datetime2 NOT NULL,
        CONSTRAINT [PK_LeaveRenewalLogs] PRIMARY KEY ([Id])
    );
END
IF OBJECT_ID(N'[RegulationPosts]', N'U') IS NULL
BEGIN
    CREATE TABLE [RegulationPosts] (
        [Id] uniqueidentifier NOT NULL,
        [Title] nvarchar(300) NOT NULL,
        [Content] nvarchar(max) NOT NULL,
        [ImageUrl] nvarchar(400) NULL,
        [AuthorId] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ScheduledAt] datetime2 NULL,
        CONSTRAINT [PK_RegulationPosts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RegulationPosts_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users]([Id]) ON DELETE CASCADE
    );
END");

    DbSeeder.Seed(db);             // Tạo tài khoản admin cố định
}

// Tạo thư mục uploads nếu chưa có
var uploadsPath = Path.Combine(app.Environment.WebRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);

// ---------------------------------------------------------------------------
// 6. Pipeline
// ---------------------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Phục vụ frontend tĩnh trong wwwroot (login.html, index.html, css, js, uploads)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<AppHub>("/hubs/app");

app.Run();
