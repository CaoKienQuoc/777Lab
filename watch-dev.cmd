@echo off
title 777LAB - Dev server (auto-build)
echo ============================================================
echo  777LAB DEV SERVER - tu dong build lai khi ban sua/luu code
echo  URL: http://localhost:5000        (nhan Ctrl+C de dung)
echo ============================================================
echo.
echo [1/2] Giai phong cong 5000 (dung app cu dang chay neu co)...
powershell -NoProfile -Command "$p=(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).OwningProcess; if($p){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; 'Da dung PID ' + $p } else { 'Cong 5000 dang trong.' }"
echo.
echo [2/2] Khoi dong dotnet watch (lan dau build hoi lau, sau do tu reload moi khi luu code)...
echo.
cd /d "%~dp0src\TimesheetBlogMeeting.API"
set ASPNETCORE_URLS=http://127.0.0.1:5000
dotnet watch run
