using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tang2Manager.API.Data;
using Tang2Manager.API.Models;

namespace Tang2Manager.API.Controllers;

public class PayrollRecordDto
{
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Nhân viên";
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal DebtAmount { get; set; }
    public string? DebtNote { get; set; }
    public decimal RestaurantDebtAmount { get; set; }
    public string? RestaurantDebtNote { get; set; }
    public decimal TotalHours { get; set; }
    public decimal TotalSalary { get; set; }
    public string? TimesheetDetailsJson { get; set; }
}

public class SavePayrollRequestDto
{
    public int EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal DebtAmount { get; set; }
    public string? DebtNote { get; set; }
    public decimal RestaurantDebtAmount { get; set; }
    public string? RestaurantDebtNote { get; set; }
    public decimal TotalHours { get; set; }
    public decimal TotalSalary { get; set; }
    public string? TimesheetDetailsJson { get; set; }
}

public class ClearPayrollRequestDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public int? EmployeeId { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class SalaryController : ControllerBase
{
    private readonly AppDbContext _context;

    public SalaryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PayrollRecordDto>>> GetSalary([FromQuery] int month, [FromQuery] int year)
    {
        if (month < 1 || month > 12 || year < 2000)
        {
            return BadRequest("Tháng hoặc năm không hợp lệ.");
        }

        var activeEmployees = await _context.Employees
            .Where(e => e.IsActive)
            .OrderBy(e => e.DisplayOrder)
            .ThenBy(e => e.Id)
            .ToListAsync();

        var existingRecords = await _context.MonthlyPayrolls
            .Where(p => p.Year == year && p.Month == month)
            .ToDictionaryAsync(p => p.EmployeeId);

        var result = new List<PayrollRecordDto>();

        foreach (var emp in activeEmployees)
        {
            if (existingRecords.TryGetValue(emp.Id, out var rec))
            {
                result.Add(new PayrollRecordDto
                {
                    EmployeeId = emp.Id,
                    FullName = emp.FullName,
                    Role = emp.Role,
                    Year = year,
                    Month = month,
                    HourlyRate = rec.HourlyRate,
                    BaseSalary = rec.BaseSalary,
                    DebtAmount = rec.DebtAmount,
                    DebtNote = rec.DebtNote,
                    RestaurantDebtAmount = rec.RestaurantDebtAmount,
                    RestaurantDebtNote = rec.RestaurantDebtNote,
                    TotalHours = rec.TotalHours,
                    TotalSalary = rec.TotalSalary,
                    TimesheetDetailsJson = rec.TimesheetDetailsJson
                });
            }
            else
            {
                result.Add(new PayrollRecordDto
                {
                    EmployeeId = emp.Id,
                    FullName = emp.FullName,
                    Role = emp.Role,
                    Year = year,
                    Month = month,
                    HourlyRate = emp.HourlyRate,
                    BaseSalary = emp.BaseSalary,
                    DebtAmount = 0m,
                    DebtNote = string.Empty,
                    RestaurantDebtAmount = 0m,
                    RestaurantDebtNote = string.Empty,
                    TotalHours = 0m,
                    TotalSalary = emp.BaseSalary,
                    TimesheetDetailsJson = null
                });
            }
        }

        return Ok(result);
    }

    [HttpPost("save")]
    public async Task<IActionResult> SavePayroll([FromBody] List<SavePayrollRequestDto> requests)
    {
        if (requests == null || requests.Count == 0)
        {
            return BadRequest("Danh sách lưu trống.");
        }

        foreach (var req in requests)
        {
            var record = await _context.MonthlyPayrolls
                .FirstOrDefaultAsync(p => p.EmployeeId == req.EmployeeId && p.Year == req.Year && p.Month == req.Month);

            if (record != null)
            {
                record.HourlyRate = req.HourlyRate;
                record.BaseSalary = req.BaseSalary;
                record.DebtAmount = req.DebtAmount;
                record.DebtNote = req.DebtNote;
                record.RestaurantDebtAmount = req.RestaurantDebtAmount;
                record.RestaurantDebtNote = req.RestaurantDebtNote;
                record.TotalHours = req.TotalHours;
                record.TotalSalary = req.TotalSalary;
                record.TimesheetDetailsJson = req.TimesheetDetailsJson;
                record.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.MonthlyPayrolls.Add(new MonthlyPayroll
                {
                    EmployeeId = req.EmployeeId,
                    Year = req.Year,
                    Month = req.Month,
                    HourlyRate = req.HourlyRate,
                    BaseSalary = req.BaseSalary,
                    DebtAmount = req.DebtAmount,
                    DebtNote = req.DebtNote,
                    RestaurantDebtAmount = req.RestaurantDebtAmount,
                    RestaurantDebtNote = req.RestaurantDebtNote,
                    TotalHours = req.TotalHours,
                    TotalSalary = req.TotalSalary,
                    TimesheetDetailsJson = req.TimesheetDetailsJson,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã lưu bảng lương và công nợ vào Database thành công!" });
    }

    [HttpPost("clear")]
    public async Task<IActionResult> ClearPayroll([FromBody] ClearPayrollRequestDto request)
    {
        if (request.Year < 2000 || request.Month < 1 || request.Month > 12)
        {
            return BadRequest("Tháng hoặc năm không hợp lệ.");
        }

        IQueryable<MonthlyPayroll> query = _context.MonthlyPayrolls
            .Where(p => p.Year == request.Year && p.Month == request.Month);

        if (request.EmployeeId.HasValue && request.EmployeeId.Value > 0)
        {
            query = query.Where(p => p.EmployeeId == request.EmployeeId.Value);
        }

        var records = await query.ToListAsync();
        foreach (var rec in records)
        {
            rec.TotalHours = 0m;
            rec.TotalSalary = rec.BaseSalary - rec.DebtAmount + rec.RestaurantDebtAmount;
            rec.TimesheetDetailsJson = null;
            rec.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã làm sạch dữ liệu giờ làm trong Database thành công!" });
    }
}
