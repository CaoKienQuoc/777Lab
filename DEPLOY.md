# Hướng dẫn deploy lên server Ubuntu (Docker Compose)

Đóng gói toàn bộ bằng Docker. Chỉ cần **Docker** trên server — không cần cài .NET hay SQL Server trực tiếp.

```
                 ┌─────────────────── server Ubuntu ───────────────────┐
  trình duyệt ──▶│  cổng 80  ──▶  container "api" (ASP.NET Core :8080)  │
  (LAN/Internet) │                        │                            │
                 │                        ▼                            │
                 │              container "db" (SQL Server :1433)       │
                 │              dữ liệu ⮕ volume mssql-data             │
                 └──────────────────────────────────────────────────────┘
```

---

## 0. Yêu cầu server
- Ubuntu 20.04 / 22.04, RAM **≥ 2 GB** (SQL Server cần tối thiểu 2GB). Kiểm tra: `free -h`
- Tài khoản có quyền `sudo`
- Nếu bật firewall, mở cổng 80: `sudo ufw allow 80/tcp`

## 1. Cài Docker (chỉ làm 1 lần)
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
**Đăng xuất rồi đăng nhập lại SSH** để quyền `docker` có hiệu lực. Kiểm tra:
```bash
docker --version
docker compose version
```

## 2. Lấy source code về server
```bash
cd ~
git clone https://github.com/CaoKienQuoc/777lab.git
cd 777lab
```

## 3. Tạo file mật khẩu DB (.env)
```bash
cp .env.example .env
nano .env        # đổi SA_PASSWORD thành mật khẩu mạnh của bạn, rồi Ctrl+O, Enter, Ctrl+X
```
> Mật khẩu SQL Server phải **≥ 8 ký tự**, có **chữ hoa + chữ thường + số + ký tự đặc biệt**, nếu không container `db` sẽ không khởi động được.

## 4. Build & chạy
```bash
docker compose up -d --build
```
Lần đầu sẽ tải image .NET + SQL Server và build app (vài phút). Xem log khởi động:
```bash
docker compose logs -f api
```
- Ban đầu `api` in vài dòng `Chưa kết nối được SQL Server... thử lại` trong lúc chờ SQL Server bật lần đầu — **bình thường**.
- Thấy dòng `Now listening on: http://[::]:8080` là app đã chạy. Nhấn `Ctrl+C` để thoát xem log (app vẫn chạy nền).

## 5. Truy cập
- Web: **http://192.168.1.119**  (thay bằng IP/tên miền server của bạn)
- Đăng nhập admin mặc định: **`admin` / `Admin@123`**

App tự tạo database, bảng và tài khoản admin ngay lần chạy đầu.

---

## Quản lý thường ngày
| Việc cần làm | Lệnh (chạy trong thư mục `777lab`) |
|---|---|
| Xem log app | `docker compose logs -f api` |
| Trạng thái container | `docker compose ps` |
| Khởi động lại app | `docker compose restart api` |
| Dừng (giữ container) | `docker compose stop` |
| Chạy lại | `docker compose start` |
| **Cập nhật code mới** | `git pull && docker compose up -d --build` |
| Tắt hẳn (giữ dữ liệu) | `docker compose down` |

> Dữ liệu DB nằm trong volume **`mssql-data`**, ảnh upload trong volume **`uploads`** — **không mất** khi rebuild hay `docker compose down`.
> ⚠️ Chỉ `docker compose down **-v**` mới xóa luôn dữ liệu.

## Sao lưu database
```bash
docker exec timesheet-db /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "MẬT_KHẨU_TRONG_FILE_ENV" -C \
  -Q "BACKUP DATABASE TimesheetBlogMeetingDb TO DISK='/var/opt/mssql/ts.bak' WITH INIT, FORMAT"
docker cp timesheet-db:/var/opt/mssql/ts.bak ./ts-backup.bak
```
(Nếu báo không tìm thấy `sqlcmd`, thử đường dẫn `/opt/mssql-tools/bin/sqlcmd` và bỏ cờ `-C`.)

---

## Ghi chú khi chạy thật
- **Đăng nhập bằng Google:** vào Google Cloud Console → OAuth client, thêm `http://192.168.1.119` (URL server) vào *Authorized JavaScript origins*. Đăng nhập bằng tài khoản admin thì không cần bước này.
- **Khóa JWT:** nên đổi — mở `docker-compose.yml`, bỏ comment dòng `Jwt__Key`, đặt một chuỗi ngẫu nhiên ≥ 32 ký tự, rồi `docker compose up -d`.
- **Cổng 80 đã bị dùng?** Sửa trong `docker-compose.yml`: `ports: "80:8080"` → `"8080:8080"`, rồi truy cập `http://192.168.1.119:8080`.
- **Muốn HTTPS / tên miền:** hiện chạy HTTP nội bộ. Cần HTTPS thì đặt thêm Nginx hoặc Caddy phía trước làm reverse proxy — cấu hình thêm khi cần.
