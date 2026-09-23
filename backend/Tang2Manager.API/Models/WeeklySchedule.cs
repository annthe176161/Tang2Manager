namespace Tang2Manager.API.Models;

public class WeeklySchedule
{
    public int Id { get; set; }
    public DateTime WeekStartDate { get; set; } // Thứ 2 đầu tuần (Date only)
    public DateTime WeekEndDate { get; set; }   // Chủ nhật cuối tuần
    public int WeekNumber { get; set; }
    public int Year { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ScheduleAssignment> Assignments { get; set; } = new List<ScheduleAssignment>();
}
