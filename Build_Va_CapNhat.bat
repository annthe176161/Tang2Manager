@echo off
title Build & Cap Nhat Tang2Manager

echo ========================================================
echo   DANG TU DONG BUILD VA CAP NHAT HE THONG TANG2MANAGER
echo ========================================================
echo.

echo [0/3] Dang dong may chu Backend neu dang mo de cap nhat...
taskkill /F /IM Tang2Manager.API.exe 2>nul

cd /d "D:\Tang2Manager\frontend"
echo [1/3] Dang bien dich Frontend React...
call npm run build

cd /d "D:\Tang2Manager"
echo [2/3] Dang sao chep giao dien vao Backend wwwroot...
powershell -Command "if (Test-Path 'backend/Tang2Manager.API/wwwroot') { Remove-Item -Recurse -Force 'backend/Tang2Manager.API/wwwroot' }; Copy-Item -Recurse -Force 'frontend/dist' 'backend/Tang2Manager.API/wwwroot'"

echo [3/3] Dang xuat ban ban chay Release vao dist_app...
dotnet publish backend/Tang2Manager.API/Tang2Manager.API.csproj -c Release -o D:\Tang2Manager\dist_app

echo.
echo ========================================================
echo   CAP NHAT HOAN TAT THANH CONG!
echo ========================================================
echo Ban co the chay bieu tuong Tang2Manager ngoai Desktop hoac Chay_App.bat de su dung!
pause
