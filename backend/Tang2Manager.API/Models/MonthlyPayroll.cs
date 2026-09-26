namespace Tang2Manager.API.Models;

public class MonthlyPayroll
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal HourlyRate { get; set; } = 35000m;
    public decimal BaseSalary { get; set; } = 0m;
    public decimal DebtAmount { get; set; } = 0m;
    public string? DebtNote { get; set; }
    public decimal RestaurantDebtAmount { get; set; } = 0m;
    public string? RestaurantDebtNote { get; set; }
    public decimal TotalHours { get; set; } = 0m;
    public decimal TotalSalary { get; set; } = 0m;
    public string? TimesheetDetailsJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}
