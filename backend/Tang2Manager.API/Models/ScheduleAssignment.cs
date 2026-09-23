namespace Tang2Manager.API.Models;

public class ScheduleAssignment
{
    public int Id { get; set; }
    public int WeeklyScheduleId { get; set; }
    public WeeklySchedule? WeeklySchedule { get; set; }

    public int EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public int DayOfWeek { get; set; } // 1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ Nhật
    public DateTime Date { get; set; }
    public string ShiftText { get; set; } = string.Empty; // Nội dung ca: "10h - Kết ca", "10h - 15h", "Nghỉ",...
    public bool IsOff { get; set; } = false; // Nghỉ phép/off (tô đỏ ô)
    public string? Note { get; set; }
}
