namespace Tang2Manager.API.Models;

public class ShiftTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Ví dụ: "10h - Kết ca", "10h - 15h", "17h - Kết ca", "Nghỉ"
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public string BgColor { get; set; } = "#ffffff"; // Màu nền ô (VD: #ef4444 cho nghỉ đỏ)
    public string TextColor { get; set; } = "#000000";
    public bool IsOff { get; set; } = false; // Đánh dấu là ca Nghỉ
    public int DisplayOrder { get; set; } = 0;
}
