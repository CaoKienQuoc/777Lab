/* =============================================================================
   schema.sql  —  Script SQL THAM KHẢO (KHÔNG bắt buộc chạy)
   -----------------------------------------------------------------------------
   Ứng dụng dùng Entity Framework Core với EnsureCreated(): khi chạy "dotnet run"
   lần đầu, chương trình sẽ TỰ ĐỘNG tạo database, các bảng và tài khoản admin.
   Bạn KHÔNG cần chạy file này.

   File chỉ để tham khảo cấu trúc bảng, hoặc để tạo tay nếu muốn.
   Tài khoản admin mặc định:  admin / Admin@123  (do ứng dụng tự seed lúc khởi động,
   vì mật khẩu được lưu dưới dạng băm BCrypt nên không tạo bằng SQL thuần ở đây).
   ============================================================================= */

IF DB_ID('TimesheetBlogMeetingDb') IS NULL
BEGIN
    CREATE DATABASE [TimesheetBlogMeetingDb];
END
GO

USE [TimesheetBlogMeetingDb];
GO

-- ---------------------------------------------------------------------------
-- Bảng Users
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users
(
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Username      NVARCHAR(100)  NOT NULL,
    PasswordHash  NVARCHAR(200)  NOT NULL,
    FullName      NVARCHAR(150)  NOT NULL,
    Role          NVARCHAR(20)   NOT NULL DEFAULT N'Customer',
    CreatedAt     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Tên đăng nhập là duy nhất
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Username')
    CREATE UNIQUE INDEX IX_Users_Username ON dbo.Users(Username);
GO

-- ---------------------------------------------------------------------------
-- Bảng BlogPosts
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.BlogPosts', 'U') IS NULL
CREATE TABLE dbo.BlogPosts
(
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Title      NVARCHAR(300)  NOT NULL,
    Content    NVARCHAR(MAX)  NOT NULL,
    ImageUrl   NVARCHAR(400)  NULL,
    AuthorId   INT            NOT NULL,
    CreatedAt  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BlogPosts_Users FOREIGN KEY (AuthorId)
        REFERENCES dbo.Users(Id) ON DELETE CASCADE
);
GO

-- ---------------------------------------------------------------------------
-- Bảng TimesheetEntries (chấm công)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.TimesheetEntries', 'U') IS NULL
CREATE TABLE dbo.TimesheetEntries
(
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeName  NVARCHAR(150)  NOT NULL,
    WorkDate      DATETIME2      NOT NULL,
    CheckIn       NVARCHAR(10)   NULL,
    CheckOut      NVARCHAR(10)   NULL,
    WorkHours     FLOAT          NOT NULL DEFAULT 0,
    Note          NVARCHAR(300)  NULL
);
GO

-- ---------------------------------------------------------------------------
-- Bảng Meetings (lịch họp)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.Meetings', 'U') IS NULL
CREATE TABLE dbo.Meetings
(
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Title        NVARCHAR(250)  NOT NULL,
    Description  NVARCHAR(1000) NULL,
    MeetingDate  DATETIME2      NOT NULL,
    StartTime    NVARCHAR(10)   NOT NULL,
    EndTime      NVARCHAR(10)   NOT NULL,
    CreatedById  INT            NOT NULL,
    CreatedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Meetings_Users FOREIGN KEY (CreatedById)
        REFERENCES dbo.Users(Id) ON DELETE CASCADE
);
GO
