# Bản Tin Nội Bộ — Blog · Chấm công · Lịch họp

Website nội bộ gồm **3 mục**, có phân quyền **Admin / Customer**:

1. **Blog** — người dùng đăng bài viết (tiêu đề, nội dung, hình ảnh). Danh sách hiển thị kiểu trang tin tức, mỗi bài ngăn cách bởi một đường gạch.
2. **Chấm công** — ai cũng xem được bảng chấm công và tải về Excel. Riêng **admin** có thể **import file Excel** hoặc **nhập trực tiếp**, sửa, xoá.
3. **Lịch họp** — người dùng tự đăng ký họp: chọn ngày trên **lịch dương**, rồi chọn **khung giờ** trống trong ngày. Hệ thống tự kiểm tra **trùng giờ**.

Công nghệ: **C# / ASP.NET Core 8 Web API**, **SQL Server** (Entity Framework Core), frontend **HTML/CSS/JavaScript thuần** (do API phục vụ luôn, không cần chạy server riêng).

---

## 1. Yêu cầu cài đặt

- [.NET SDK 8.0](https://dotnet.microsoft.com/download/dotnet/8.0) trở lên
- **SQL Server** (một trong các lựa chọn):
  - SQL Server Express / Developer (miễn phí), hoặc
  - **LocalDB** (đi kèm Visual Studio), hoặc
  - SQL Server chạy bằng Docker
- (Tuỳ chọn) Visual Studio 2022 hoặc VS Code

> Không cần cài công cụ `dotnet-ef` hay chạy migration. Ứng dụng dùng `EnsureCreated()` để **tự tạo database, bảng và tài khoản admin** ngay lần chạy đầu tiên.

---

## 2. Cấu hình chuỗi kết nối SQL Server

Mở file: `src/TimesheetBlogMeeting.API/appsettings.json` và chỉnh `DefaultConnection` cho phù hợp máy bạn.

**Mặc định (SQL Server cục bộ, đăng nhập Windows):**
```
Server=localhost;Database=TimesheetBlogMeetingDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

**Nếu dùng LocalDB:**
```
Server=(localdb)\\MSSQLLocalDB;Database=TimesheetBlogMeetingDb;Trusted_Connection=True;MultipleActiveResultSets=true
```

**Nếu dùng tài khoản SQL (user/password), ví dụ Docker:**
```
Server=localhost,1433;Database=TimesheetBlogMeetingDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;MultipleActiveResultSets=true
```

---

## 3. Chạy ứng dụng

Mở terminal tại thư mục dự án:

```bash
cd src/TimesheetBlogMeeting.API
dotnet restore
dotnet run
```

Lần chạy đầu, ứng dụng sẽ tự tạo database `TimesheetBlogMeetingDb` và tài khoản admin.

Khi thấy log báo đang lắng nghe ở cổng 5000, mở trình duyệt:

- **Trang web:** http://localhost:5000
- **Swagger (tài liệu API, chỉ ở môi trường Development):** http://localhost:5000/swagger

---

## 4. Đăng nhập

Tài khoản **admin cố định** (đã được tạo sẵn trong database):

| Tên đăng nhập | Mật khẩu   | Vai trò |
|---------------|------------|---------|
| `admin`       | `Admin@123`| Admin   |

- **Admin** có toàn quyền: thêm/sửa/xoá **tài khoản người dùng**, đăng/sửa/xoá mọi bài blog, quản lý chấm công (import/nhập/sửa/xoá), tạo/xoá lịch họp.
- **Customer** (do admin tạo): đăng & quản lý bài blog của mình, **xem** chấm công, tự đăng ký lịch họp.

> Tài khoản `admin` gốc không thể bị xoá và không thể đổi vai trò.

---

## 5. Hướng dẫn nhanh từng mục

### Mục 1 — Blog
- Bấm **“+ Đăng bài mới”**, nhập tiêu đề, nội dung và (tuỳ chọn) chọn ảnh.
- Bấm vào một bài để xem chi tiết. Chủ bài viết hoặc admin có thể **sửa / xoá**.
- Ảnh được lưu trong `wwwroot/uploads`.

### Mục 2 — Chấm công
- **Customer:** xem bảng và bấm **“Xuất Excel”** để tải về.
- **Admin:**
  - **“+ Thêm dòng”** để nhập trực tiếp.
  - **“Import Excel”** để nạp từ file (có tuỳ chọn xoá dữ liệu cũ trước khi nạp).
  - **“Tải file mẫu”** để lấy đúng định dạng Excel.
  - Sửa / xoá từng dòng.

**Định dạng file Excel import** (dòng đầu là tiêu đề cột; chương trình tự nhận cột theo từ khoá):

| Họ tên | Ngày | Giờ vào | Giờ ra | Số giờ | Ghi chú |
|--------|------|---------|--------|--------|---------|
| Nguyễn Văn A | 2026-05-30 | 08:00 | 17:00 | 8 | ... |

Bắt buộc tối thiểu phải có cột **Họ tên** và **Ngày**. Tải “file mẫu” để chắc chắn đúng định dạng.

### Mục 3 — Lịch họp
- Chọn một **ngày** trên lịch (số đỏ là số cuộc họp đã có trong ngày).
- Trong bảng bên phải, bấm chọn **khung giờ bắt đầu** rồi **khung giờ kết thúc** (mỗi ô 30 phút, từ 08:00 đến 18:00). Ô gạch ngang là giờ đã bị đặt.
- Nhập tiêu đề (và mô tả nếu cần) rồi bấm **“Đặt lịch họp”**.
- Nếu khung giờ trùng với cuộc họp khác, hệ thống sẽ báo lỗi và không cho đặt.
- Người tạo hoặc admin có thể **huỷ** cuộc họp.

---

## 6. Cấu trúc dự án

```
TimesheetBlogMeeting/
├─ TimesheetBlogMeeting.sln
├─ README.md
├─ database/
│  └─ schema.sql            # Script SQL tham khảo (KHÔNG bắt buộc chạy)
└─ src/
   └─ TimesheetBlogMeeting.API/
      ├─ Program.cs          # Cấu hình DB, JWT, CORS, Swagger, phục vụ frontend
      ├─ appsettings.json    # Chuỗi kết nối + cấu hình JWT
      ├─ Controllers/        # Auth, Users, Blog, Timesheet, Meeting
      ├─ Models/             # User, BlogPost, TimesheetEntry, Meeting
      ├─ DTOs/               # Các lớp request/response
      ├─ Data/               # AppDbContext + DbSeeder (tạo admin)
      ├─ Services/           # TokenService (sinh JWT)
      └─ wwwroot/            # FRONTEND
         ├─ login.html, index.html
         ├─ css/style.css
         ├─ js/              # api, login, app, blog, timesheet, meeting, users
         └─ uploads/         # ảnh bài blog
```

---

## 7. Tổng quan API (tham khảo qua Swagger)

| Nhóm | Endpoint chính | Quyền |
|------|----------------|-------|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` | Công khai / đã đăng nhập |
| Users | `GET/POST/PUT/DELETE /api/users` | Admin |
| Blog | `GET/POST/PUT/DELETE /api/blog` | Đăng nhập (chủ bài hoặc admin mới sửa/xoá) |
| Chấm công | `GET /api/timesheet`, `/export`, `/template` | Đăng nhập |
| | `POST/PUT/DELETE /api/timesheet`, `/import`, `/clear` | Admin |
| Lịch họp | `GET/POST/PUT/DELETE /api/meeting` | Đăng nhập (người tạo hoặc admin mới sửa/xoá) |

Mọi request (trừ login) cần header `Authorization: Bearer {token}`. Frontend tự xử lý việc này sau khi đăng nhập.

---

## 8. Một số giả định & lưu ý

- Mật khẩu được lưu dạng **băm BCrypt**, không lưu plaintext.
- Token JWT mặc định hết hạn sau **8 giờ** (chỉnh trong `appsettings.json`).
- Khoá ký JWT (`Jwt:Key`) trong `appsettings.json` chỉ dùng cho môi trường thử nghiệm — khi triển khai thật hãy đổi sang khoá bí mật riêng.
- Giờ vào/ra và giờ họp lưu dạng chuỗi `"HH:mm"`; khung giờ họp giới hạn 08:00–18:00, bước 30 phút (có thể chỉnh trong `wwwroot/js/meeting.js`).
- Khi xoá một người dùng, các bài blog và lịch họp do người đó tạo cũng bị xoá theo (ràng buộc cascade).
- CORS đang để `AllowAll` cho tiện phát triển; nên siết lại khi triển khai thật.
