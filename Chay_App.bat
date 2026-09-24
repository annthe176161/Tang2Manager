@echo off
title Tang2Manager - Quan Ly Nha Hang Tang Hai

echo ========================================================
echo   DANG KHOI DONG HE THONG QUAN LY TANG HAI
echo ========================================================
echo.

:: 1. Kiem tra dich vu SQL Server
echo [*] Kiem tra co so du lieu SQL Server...
sc query MSSQLSERVER 2>nul | findstr RUNNING >nul
if %ERRORLEVEL% neq 0 (
    echo [*] Dang khoi dong dich vu SQL Server...
    net start MSSQLSERVER >nul 2>&1
)

:: 2. Kiem tra xem Backend (port 5000) da chay chua
curl.exe -s -o NUL http://localhost:5000
if %ERRORLEVEL% equ 0 (
    echo [OK] May chu Backend dang chay san.
    goto LAUNCH_APP
)

echo [*] Dang khoi dong may chu Backend...
cd /d "D:\Tang2Manager\dist_app"
start "Tang2Manager Backend" /min "D:\Tang2Manager\dist_app\Tang2Manager.API.exe"
cd /d "D:\Tang2Manager"

:: 3. Vong lap cho may chu san sang 100% tren port 5000
echo [*] Dang ket noi voi he thong, vui long doi vai giay...
set ATTEMPTS=0

:WAIT_SERVER
curl.exe -s -o NUL http://localhost:5000
if %ERRORLEVEL% equ 0 goto LAUNCH_APP

set /a ATTEMPTS=%ATTEMPTS%+1
if %ATTEMPTS% geq 30 goto FAIL_SERVER

ping 127.0.0.1 -n 2 >nul
goto WAIT_SERVER

:FAIL_SERVER
echo.
echo [!] Khong the khoi dong may chu sau 30 giay.
echo Vui long kiem tra lai SQL Server hoac chay lai ung dung.
pause
exit /b 1

:LAUNCH_APP
echo [OK] He thong da san sang 100%!
echo [*] Dang mo giao dien Quan Ly Nha Hang...

ping 127.0.0.1 -n 2 >nul

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

ping 127.0.0.1 -n 2 >nul
exit
