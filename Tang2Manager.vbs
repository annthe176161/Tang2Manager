Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Kiem tra xem may chu da chay chua bang HTTP request
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.open "GET", "http://localhost:5000", False
http.setTimeouts 1000, 1000, 1000, 1000
http.send

' Neu chua chay thi khoi dong may chu backend an hoan toan (khong hien cua so den)
If Err.Number <> 0 Or http.Status <> 200 Then
    Err.Clear
    WshShell.CurrentDirectory = "D:\Tang2Manager\dist_app"
    WshShell.Run """D:\Tang2Manager\dist_app\Tang2Manager.API.exe""", 0, False
    
    ' Vong lap kiem tra cho den khi may chu san sang tra ve HTTP 200
    For i = 1 To 20
        WScript.Sleep 1000
        http.open "GET", "http://localhost:5000", False
        http.setTimeouts 1000, 1000, 1000, 1000
        http.send
        If Err.Number = 0 Then
            If http.Status = 200 Then Exit For
        End If
        Err.Clear
    Next
End If
On Error GoTo 0

' 2. Mo ung dung tren trinh duyet o che do Desktop App (rieng biet, khong thanh dia chi)
edgePath86 = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
chromePath86 = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe")

If fso.FileExists(edgePath86) Then
    WshShell.Run """" & edgePath86 & """ --app=http://localhost:5000"
ElseIf fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:5000"
ElseIf fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://localhost:5000"
ElseIf fso.FileExists(chromePath86) Then
    WshShell.Run """" & chromePath86 & """ --app=http://localhost:5000"
Else
    WshShell.Run "http://localhost:5000"
End If
