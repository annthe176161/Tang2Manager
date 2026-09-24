using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tang2Manager.API.Data;
using Tang2Manager.API.DTOs;
using Tang2Manager.API.Models;

namespace Tang2Manager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchedulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SchedulesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("shift-templates")]
    public async Task<ActionResult<IEnumerable<ShiftTemplate>>> GetShiftTemplates()
    {
        return await _context.ShiftTemplates
            .OrderBy(s => s.DisplayOrder)
            .ToListAsync();
    }

    [HttpGet("by-date")]
    public async Task<ActionResult<WeeklyScheduleViewDto>> GetScheduleByDate([FromQuery] DateTime? date)
    {
        var targetDate = (date ?? DateTime.Today).Date;
        // Find Monday of this week
        int diff = (7 + (int)targetDate.DayOfWeek - (int)DayOfWeek.Monday) % 7;
        var monday = targetDate.AddDays(-1 * diff).Date;
        var sunday = monday.AddDays(6).Date;

        var schedule = await _context.WeeklySchedules
            .Include(s => s.Assignments)
            .ThenInclude(a => a.Employee)
            .FirstOrDefaultAsync(s => s.WeekStartDate.Date == monday);

        var activeEmployees = await _context.Employees
            .Where(e => e.IsActive)
            .OrderBy(e => e.DisplayOrder)
            .Select(e => new EmployeeDto
            {
                Id = e.Id,
                FullName = e.FullName,
                PhoneNumber = e.PhoneNumber,
                Role = e.Role,
                IsActive = e.IsActive,
                DisplayOrder = e.DisplayOrder
            })
            .ToListAsync();

        var culture = CultureInfo.CurrentCulture;
        int weekNum = culture.Calendar.GetWeekOfYear(monday, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);

        if (schedule == null)
        {
            return Ok(new WeeklyScheduleViewDto
            {
                Id = 0,
                WeekStartDate = monday,
                WeekEndDate = sunday,
                WeekNumber = weekNum,
                Year = monday.Year,
                Note = "",
                Employees = activeEmployees,
                Assignments = new List<AssignmentViewDto>()
            });
        }

        var assignmentDtos = schedule.Assignments.Select(a => new AssignmentViewDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            EmployeeName = a.Employee?.FullName ?? "",
            DayOfWeek = a.DayOfWeek,
            Date = a.Date.ToString("yyyy-MM-dd"),
            ShiftText = a.ShiftText,
            IsOff = a.IsOff,
            CustomColor = a.CustomColor,
            Note = a.Note
        }).ToList();

        return Ok(new WeeklyScheduleViewDto
        {
            Id = schedule.Id,
            WeekStartDate = schedule.WeekStartDate,
            WeekEndDate = schedule.WeekEndDate,
            WeekNumber = schedule.WeekNumber,
            Year = schedule.Year,
            Note = schedule.Note,
            Employees = activeEmployees,
            Assignments = assignmentDtos
        });
    }

    [HttpPost("save")]
    public async Task<ActionResult<WeeklyScheduleViewDto>> SaveSchedule([FromBody] SaveWeeklyScheduleDto dto)
    {
        var monday = dto.WeekStartDate.Date;
        var sunday = monday.AddDays(6).Date;
        var culture = CultureInfo.CurrentCulture;
        int weekNum = culture.Calendar.GetWeekOfYear(monday, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);

        var schedule = await _context.WeeklySchedules
            .Include(s => s.Assignments)
            .FirstOrDefaultAsync(s => s.WeekStartDate.Date == monday);

        if (schedule == null)
        {
            schedule = new WeeklySchedule
            {
                WeekStartDate = monday,
                WeekEndDate = sunday,
                WeekNumber = weekNum,
                Year = monday.Year,
                Note = dto.Note
            };
            _context.WeeklySchedules.Add(schedule);
        }
        else
        {
            schedule.Note = dto.Note;
            _context.ScheduleAssignments.RemoveRange(schedule.Assignments);
        }

        await _context.SaveChangesAsync();

        foreach (var item in dto.Assignments)
        {
            DateTime cellDate;
            if (!string.IsNullOrWhiteSpace(item.Date) && DateTime.TryParse(item.Date, out var parsedDate))
            {
                cellDate = parsedDate.Date;
            }
            else
            {
                int offset = item.DayOfWeek == 0 ? 6 : item.DayOfWeek - 1;
                cellDate = monday.AddDays(offset);
            }

            schedule.Assignments.Add(new ScheduleAssignment
            {
                WeeklyScheduleId = schedule.Id,
                EmployeeId = item.EmployeeId,
                DayOfWeek = item.DayOfWeek,
                Date = cellDate,
                ShiftText = item.ShiftText ?? "",
                IsOff = item.IsOff,
                CustomColor = item.CustomColor,
                Note = item.Note
            });
        }

        await _context.SaveChangesAsync();

        return await GetScheduleByDate(monday);
    }
}
