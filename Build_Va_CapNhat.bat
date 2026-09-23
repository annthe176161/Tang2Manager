@echo off
chcp 65001 >nul
title Build & Cập Nhật Tang2Manager

echo ========================================================
echo   ĐANG TỰ ĐỘNG BUILD VÀ CẬP NHẬT GIAO DIỆN MỚI
echo ========================================================
echo.

cd /d "D:\Tang2Manager\frontend"
echo [1/3] Đang biên dịch Frontend React...
call npm run build

cd /d "D:\Tang2Manager"
echo [2/3] Đang sao chép giao diện vào Backend wwwroot...
powershell -Command "if (Test-Path 'backend/Tang2Manager.API/wwwroot') { Remove-Item -Recurse -Force 'backend/Tang2Manager.API/wwwroot' }; Copy-Item -Recurse -Force 'frontend/dist' 'backend/Tang2Manager.API/wwwroot'"

echo [3/3] Hoàn tất!
echo.
echo Giao diện mới đã được đóng gói thành công vào Backend! Bạn có thể chạy Chay_App.bat để mở.
pause
