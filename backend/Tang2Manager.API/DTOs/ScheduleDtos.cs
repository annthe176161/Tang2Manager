namespace Tang2Manager.API.DTOs;

public class EmployeeDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "Nhân viên";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class SaveAssignmentDto
{
    public int EmployeeId { get; set; }
    public int DayOfWeek { get; set; }
    public DateTime Date { get; set; }
    public string ShiftText { get; set; } = string.Empty;
    public bool IsOff { get; set; }
    public string? Note { get; set; }
}

public class SaveWeeklyScheduleDto
{
    public DateTime WeekStartDate { get; set; }
    public string? Note { get; set; }
    public List<SaveAssignmentDto> Assignments { get; set; } = new();
}

public class WeeklyScheduleViewDto
{
    public int Id { get; set; }
    public DateTime WeekStartDate { get; set; }
    public DateTime WeekEndDate { get; set; }
    public int WeekNumber { get; set; }
    public int Year { get; set; }
    public string? Note { get; set; }
    public List<EmployeeDto> Employees { get; set; } = new();
    public List<AssignmentViewDto> Assignments { get; set; } = new();
}

public class AssignmentViewDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int DayOfWeek { get; set; }
    public DateTime Date { get; set; }
    public string ShiftText { get; set; } = string.Empty;
    public bool IsOff { get; set; }
    public string? Note { get; set; }
}
