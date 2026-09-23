$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Tang2Manager.lnk")
$Shortcut.TargetPath = "D:\Tang2Manager\Chay_App.bat"
$Shortcut.WorkingDirectory = "D:\Tang2Manager"
$Shortcut.Description = "Tang2Manager - Quan Ly Nha Hang Tang Hai"
$Shortcut.IconLocation = "shell32.dll,44"
$Shortcut.Save()
Write-Host "Da tao bieu tuong Tang2Manager tren Man hinh Desktop thanh cong!" -ForegroundColor Green
