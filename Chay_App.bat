@echo off
chcp 65001 >nul
title Tang2Manager - Quản Lý Nhà Hàng

echo ========================================================
echo   ĐANG KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ TẦNG HAI (TANG2MANAGER)
echo ========================================================
echo.

cd /d "D:\Tang2Manager"

:: 1. Kiem tra xem Backend API (port 5000) da chay chua
netstat -ano | findstr :5000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    echo [✓] Máy chủ đã sẵn sàng.
) else (
    echo [*] Đang khởi động máy chủ Backend...
    start /min "Tang2Manager Backend" dotnet run --project backend/Tang2Manager.API/Tang2Manager.API.csproj
    
    :: Cho 3 giay de may chu khoi dong
    timeout /t 3 /nobreak >nul
)

:: 2. Mo ung dung o che do App rieng biet
echo [*] Đang mở giao diện Quản Lý Nhà Hàng...
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5000
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=http://localhost:5000
) else (
    start http://localhost:5000
)

echo.
echo [✓] Khởi động hoàn tất!
timeout /t 2 /nobreak >nul
exit
