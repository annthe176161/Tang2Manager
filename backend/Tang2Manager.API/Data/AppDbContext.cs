using Microsoft.EntityFrameworkCore;
using Tang2Manager.API.Models;

namespace Tang2Manager.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<ShiftTemplate> ShiftTemplates => Set<ShiftTemplate>();
    public DbSet<WeeklySchedule> WeeklySchedules => Set<WeeklySchedule>();
    public DbSet<ScheduleAssignment> ScheduleAssignments => Set<ScheduleAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed default Shift Templates
        modelBuilder.Entity<ShiftTemplate>().HasData(
            new ShiftTemplate { Id = 1, Name = "10h - Kết ca", BgColor = "#9ca3af", TextColor = "#1f2937", IsOff = false, DisplayOrder = 1 },
            new ShiftTemplate { Id = 2, Name = "10h - 15h", BgColor = "#ffffff", TextColor = "#1f2937", IsOff = false, DisplayOrder = 2 },
            new ShiftTemplate { Id = 3, Name = "17h - Kết ca", BgColor = "#9ca3af", TextColor = "#1f2937", IsOff = false, DisplayOrder = 3 },
            new ShiftTemplate { Id = 4, Name = "17h - 22h", BgColor = "#ffffff", TextColor = "#1f2937", IsOff = false, DisplayOrder = 4 },
            new ShiftTemplate { Id = 5, Name = "19h - Kết ca", BgColor = "#9ca3af", TextColor = "#1f2937", IsOff = false, DisplayOrder = 5 },
            new ShiftTemplate { Id = 6, Name = "10h - 21h", BgColor = "#ffffff", TextColor = "#1f2937", IsOff = false, DisplayOrder = 6 },
            new ShiftTemplate { Id = 7, Name = "Nghỉ (OFF)", BgColor = "#ef4444", TextColor = "#ffffff", IsOff = true, DisplayOrder = 7 }
        );

        // Seed sample employees matching user image
        modelBuilder.Entity<Employee>().HasData(
            new Employee { Id = 1, FullName = "Quang", Role = "Phục vụ", DisplayOrder = 1 },
            new Employee { Id = 2, FullName = "Hiền", Role = "Thu ngân", DisplayOrder = 2 },
            new Employee { Id = 3, FullName = "Ngọc Anh", Role = "Phục vụ", DisplayOrder = 3 },
            new Employee { Id = 4, FullName = "Minh Ánh", Role = "Phục vụ", DisplayOrder = 4 },
            new Employee { Id = 5, FullName = "Hà", Role = "Phục vụ", DisplayOrder = 5 }
        );
    }
}
