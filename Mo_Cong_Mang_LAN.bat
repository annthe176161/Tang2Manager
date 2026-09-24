@echo off
title Mo Cong Ket Noi Mang LAN Cho Tang2Manager
echo ========================================================
echo   DANG MO CONG 5000 TREN WINDOWS FIREWALL
echo ========================================================
echo.
netsh advfirewall firewall add rule name="Tang2Manager Port 5000" dir=in action=allow protocol=TCP localport=5000
echo.
echo ========================================================
echo   HOAN TAT! CAC THIET BI TRONG CUNG MANG WIFI
echo   CO THE TRUY CAP QUA DIA CHI:
echo   http://192.168.1.59:5000
echo ========================================================
pause
