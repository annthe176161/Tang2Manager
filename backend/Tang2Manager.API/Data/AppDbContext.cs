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
    public DbSet<InvoiceCategory> InvoiceCategories => Set<InvoiceCategory>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<MonthlyPayroll> MonthlyPayrolls => Set<MonthlyPayroll>();
    public DbSet<MonthlyCategoryRecord> MonthlyCategoryRecords => Set<MonthlyCategoryRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
        });

        modelBuilder.Entity<InvoiceCategory>(entity =>
        {
            entity.Property(e => e.FixedAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.Property(e => e.Quantity).HasPrecision(18, 2);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.TaxRate).HasPrecision(18, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.TotalPayment).HasPrecision(18, 2);
            entity.Property(e => e.DepositFee).HasPrecision(18, 2);
            entity.Property(e => e.ShipFee).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MonthlyCategoryRecord>(entity =>
        {
            entity.HasKey(e => new { e.CategoryId, e.Year, e.Month });
            entity.Property(e => e.FixedAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<MonthlyPayroll>(entity =>
        {
            entity.HasIndex(e => new { e.EmployeeId, e.Year, e.Month }).IsUnique();
            entity.Property(e => e.HourlyRate).HasPrecision(18, 2);
            entity.Property(e => e.BaseSalary).HasPrecision(18, 2);
            entity.Property(e => e.DebtAmount).HasPrecision(18, 2);
            entity.Property(e => e.RestaurantDebtAmount).HasPrecision(18, 2);
            entity.Property(e => e.TotalHours).HasPrecision(18, 2);
            entity.Property(e => e.TotalSalary).HasPrecision(18, 2);
        });

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
            new Employee { Id = 1, FullName = "Quang", Role = "Nhân viên", HourlyRate = 35000m, BaseSalary = 0m, DisplayOrder = 1 },
            new Employee { Id = 2, FullName = "Hiền", Role = "Nhân viên", HourlyRate = 30000m, BaseSalary = 0m, DisplayOrder = 2 },
            new Employee { Id = 3, FullName = "Ngọc Anh", Role = "Nhân viên", HourlyRate = 35000m, BaseSalary = 0m, DisplayOrder = 3 },
            new Employee { Id = 4, FullName = "Minh Ánh", Role = "Nhân viên", HourlyRate = 35000m, BaseSalary = 0m, DisplayOrder = 4 },
            new Employee { Id = 5, FullName = "Hà", Role = "Bếp", HourlyRate = 35000m, BaseSalary = 0m, DisplayOrder = 5 },
            new Employee { Id = 6, FullName = "An", Role = "Nhân viên", HourlyRate = 40000m, BaseSalary = 0m, DisplayOrder = 6 }
        );

        // Seed 12 invoice categories matching user Image 1
        modelBuilder.Entity<InvoiceCategory>().HasData(
            new InvoiceCategory { Id = 1, Name = "야채 (Rau)", CategoryType = "Daily", DisplayOrder = 1 },
            new InvoiceCategory { Id = 2, Name = "가스 (Gas)", CategoryType = "Daily", DisplayOrder = 2 },
            new InvoiceCategory { Id = 3, Name = "삼겹살 - 쪽갈비 - KEYFOOD", CategoryType = "Supplier", DisplayOrder = 3 },
            new InvoiceCategory { Id = 4, Name = "삼겹살 - 쪽갈비 - 소갈비 - AN PHÁT", CategoryType = "Supplier", DisplayOrder = 4 },
            new InvoiceCategory { Id = 5, Name = "항정살 - 막창 (Khấu heo - Má heo)", CategoryType = "Supplier", DisplayOrder = 5 },
            new InvoiceCategory { Id = 6, Name = "과일 소주 (Rượu Soju hoa quả)", CategoryType = "Supplier", DisplayOrder = 6 },
            new InvoiceCategory { Id = 7, Name = "옥수수 (Ngô)", CategoryType = "Daily", DisplayOrder = 7 },
            new InvoiceCategory { Id = 8, Name = "고사리 - 고추 (Dương xỉ - Bột ớt)", CategoryType = "Daily", DisplayOrder = 8 },
            new InvoiceCategory { Id = 9, Name = "음료수 (Nước ngọt - Đồ uống)", CategoryType = "Supplier", DisplayOrder = 9 },
            new InvoiceCategory { Id = 10, Name = "원마켓 (One Market)", CategoryType = "Supplier", DisplayOrder = 10 },
            new InvoiceCategory { Id = 11, Name = "주방세제 - 바닥세정제 (Nước rửa bát - Nước lau sàn)", CategoryType = "Daily", DisplayOrder = 11 },
            new InvoiceCategory { Id = 12, Name = "베트남 술 (Rượu Việt)", CategoryType = "Supplier", DisplayOrder = 12 }
        );
    }
}
