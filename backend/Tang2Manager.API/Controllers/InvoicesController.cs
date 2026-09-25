using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tang2Manager.API.Data;
using Tang2Manager.API.Models;

namespace Tang2Manager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _context;

    public InvoicesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<object>>> GetCategories([FromQuery] int month = 9, [FromQuery] int year = 2026)
    {
        var categories = await _context.InvoiceCategories
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        var monthlyRecords = await _context.MonthlyCategoryRecords
            .Where(m => m.Year == year && m.Month == month)
            .ToDictionaryAsync(m => m.CategoryId);

        var itemsByCat = await _context.InvoiceItems
            .Where(i => i.Year == year && i.Month == month)
            .GroupBy(i => i.CategoryId)
            .ToDictionaryAsync(g => g.Key, g => g.ToList());

        var result = categories.Select(c =>
        {
            var hasMonthRecord = monthlyRecords.TryGetValue(c.Id, out var mRec);
            var isPaid = hasMonthRecord ? mRec!.IsPaid : c.IsPaid;
            var fixedAmount = hasMonthRecord ? mRec!.FixedAmount : c.FixedAmount;

            var items = itemsByCat.TryGetValue(c.Id, out var list) ? list : new List<InvoiceItem>();
            var totalAmount = items.Any()
                ? items.Sum(i => i.TotalPayment > 0 ? i.TotalPayment : i.Amount)
                : fixedAmount;

            return new
            {
                c.Id,
                c.Name,
                c.CategoryType,
                IsPaid = isPaid,
                c.DisplayOrder,
                FixedAmount = fixedAmount,
                TotalAmount = totalAmount,
                ItemCount = items.Count
            };
        });

        return Ok(result);
    }

    [HttpPut("categories/{id}/toggle-payment")]
    public async Task<IActionResult> TogglePayment(int id, [FromQuery] int month = 9, [FromQuery] int year = 2026)
    {
        var cat = await _context.InvoiceCategories.FindAsync(id);
        if (cat == null) return NotFound();

        var mRec = await _context.MonthlyCategoryRecords
            .FirstOrDefaultAsync(m => m.CategoryId == id && m.Year == year && m.Month == month);

        if (mRec == null)
        {
            mRec = new MonthlyCategoryRecord
            {
                CategoryId = id,
                Year = year,
                Month = month,
                FixedAmount = cat.FixedAmount,
                IsPaid = !cat.IsPaid
            };
            _context.MonthlyCategoryRecords.Add(mRec);
        }
        else
        {
            mRec.IsPaid = !mRec.IsPaid;
        }

        await _context.SaveChangesAsync();
        return Ok(new { cat.Id, mRec.IsPaid });
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] InvoiceCategory updateDto, [FromQuery] int month = 9, [FromQuery] int year = 2026)
    {
        var cat = await _context.InvoiceCategories.FindAsync(id);
        if (cat == null) return NotFound();

        cat.Name = updateDto.Name;
        cat.CategoryType = updateDto.CategoryType;

        // Lưu trạng thái và số tiền riêng cho tháng/năm này
        var mRec = await _context.MonthlyCategoryRecords
            .FirstOrDefaultAsync(m => m.CategoryId == id && m.Year == year && m.Month == month);

        if (mRec == null)
        {
            mRec = new MonthlyCategoryRecord
            {
                CategoryId = id,
                Year = year,
                Month = month,
                FixedAmount = updateDto.FixedAmount,
                IsPaid = updateDto.IsPaid
            };
            _context.MonthlyCategoryRecords.Add(mRec);
        }
        else
        {
            mRec.FixedAmount = updateDto.FixedAmount;
            mRec.IsPaid = updateDto.IsPaid;
        }

        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpPost("categories")]
    public async Task<ActionResult<InvoiceCategory>> CreateCategory([FromBody] InvoiceCategory category)
    {
        category.Id = 0; // SQL Server identity
        if (string.IsNullOrWhiteSpace(category.Name))
        {
            return BadRequest("Tên hạng mục hóa đơn không được để trống.");
        }
        if (string.IsNullOrWhiteSpace(category.CategoryType))
        {
            category.CategoryType = "Daily";
        }
        var maxOrder = await _context.InvoiceCategories.MaxAsync(c => (int?)c.DisplayOrder) ?? 0;
        category.DisplayOrder = maxOrder + 1;
        category.IsPaid = false;

        _context.InvoiceCategories.Add(category);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCategories), new { id = category.Id }, category);
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var cat = await _context.InvoiceCategories.Include(c => c.Items).FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null) return NotFound();

        _context.InvoiceCategories.Remove(cat);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("items/{categoryId}")]
    public async Task<ActionResult<IEnumerable<InvoiceItem>>> GetItemsByCategory(int categoryId, [FromQuery] int month = 9, [FromQuery] int year = 2026)
    {
        var items = await _context.InvoiceItems
            .Where(i => i.CategoryId == categoryId && i.Year == year && i.Month == month)
            .OrderBy(i => i.DisplayOrder)
            .ThenBy(i => i.Id)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("items")]
    public async Task<ActionResult<InvoiceItem>> CreateItem([FromBody] InvoiceItem item)
    {
        item.Id = 0;
        if (item.Month <= 0) item.Month = 9;
        if (item.Year <= 0) item.Year = 2026;

        item.Amount = item.Quantity * item.UnitPrice;
        if (item.TaxRate > 0)
        {
            item.TaxAmount = Math.Round(item.Amount * (item.TaxRate / 100m));
            item.TotalPayment = item.Amount + item.TaxAmount;
        }
        else
        {
            item.TaxAmount = 0;
            item.TotalPayment = item.Amount;
        }
        item.CreatedAt = DateTime.UtcNow;

        _context.InvoiceItems.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetItemsByCategory), new { categoryId = item.CategoryId, month = item.Month, year = item.Year }, item);
    }

    [HttpPost("items/batch")]
    public async Task<ActionResult<IEnumerable<InvoiceItem>>> CreateBatchItems([FromBody] List<InvoiceItem> items, [FromQuery] int month = 9, [FromQuery] int year = 2026)
    {
        if (items == null || !items.Any()) return BadRequest("No items provided");

        foreach (var item in items)
        {
            item.Id = 0;
            item.Month = item.Month > 0 ? item.Month : month;
            item.Year = item.Year > 0 ? item.Year : year;
            item.Amount = item.Quantity * item.UnitPrice;
            if (item.TaxRate > 0)
            {
                item.TaxAmount = Math.Round(item.Amount * (item.TaxRate / 100m));
                item.TotalPayment = item.Amount + item.TaxAmount;
            }
            else
            {
                item.TaxAmount = 0;
                item.TotalPayment = item.Amount;
            }
            item.CreatedAt = DateTime.UtcNow;
            _context.InvoiceItems.Add(item);
        }

        await _context.SaveChangesAsync();
        return Ok(items);
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] InvoiceItem item)
    {
        if (id != item.Id) return BadRequest();

        var existing = await _context.InvoiceItems.FindAsync(id);
        if (existing == null) return NotFound();

        existing.DateStr = item.DateStr;
        existing.ItemName = item.ItemName;
        existing.Unit = item.Unit;
        existing.Quantity = item.Quantity;
        existing.UnitPrice = item.UnitPrice;
        existing.TaxRate = item.TaxRate;
        existing.Note = item.Note;

        // Auto-recalculate
        existing.Amount = existing.Quantity * existing.UnitPrice;
        if (existing.TaxRate > 0)
        {
            existing.TaxAmount = Math.Round(existing.Amount * (existing.TaxRate / 100m));
            existing.TotalPayment = existing.Amount + existing.TaxAmount;
        }
        else
        {
            existing.TaxAmount = 0;
            existing.TotalPayment = existing.Amount;
        }

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("items/{id}")]
    public async Task<IActionResult> DeleteItem(int id)
    {
        var item = await _context.InvoiceItems.FindAsync(id);
        if (item == null) return NotFound();

        _context.InvoiceItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Xóa thông tin tổng giá và các mặt hàng của tháng đang chọn.
    /// TUYỆT ĐỐI KHÔNG XÓA HẠNG MỤC và KHÔNG XÓA DỮ LIỆU CÁC THÁNG KHÁC.
    /// </summary>
    [HttpDelete("clear")]
    public async Task<IActionResult> ClearInvoiceData([FromQuery] int month, [FromQuery] int year, [FromQuery] int? categoryId)
    {
        if (month <= 0) month = 9;
        if (year <= 0) year = 2026;

        if (categoryId.HasValue)
        {
            // Chỉ xóa các mặt hàng của mục này trong đúng tháng và năm đang chọn
            var items = await _context.InvoiceItems
                .Where(i => i.CategoryId == categoryId.Value && i.Month == month && i.Year == year)
                .ToListAsync();
            _context.InvoiceItems.RemoveRange(items);

            // Đặt lại số tiền của mục này trong tháng này về 0
            var mRec = await _context.MonthlyCategoryRecords
                .FirstOrDefaultAsync(m => m.CategoryId == categoryId.Value && m.Month == month && m.Year == year);
            if (mRec != null)
            {
                mRec.FixedAmount = 0;
                mRec.IsPaid = false;
            }
            else
            {
                _context.MonthlyCategoryRecords.Add(new MonthlyCategoryRecord
                {
                    CategoryId = categoryId.Value,
                    Year = year,
                    Month = month,
                    FixedAmount = 0,
                    IsPaid = false
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã làm sạch toàn bộ mặt hàng của mục ID {categoryId.Value} trong Tháng {month}/{year} (Giữ nguyên mục)!" });
        }
        else
        {
            // Chỉ xóa các mặt hàng thuộc đúng tháng và năm đang chọn
            var items = await _context.InvoiceItems
                .Where(i => i.Month == month && i.Year == year)
                .ToListAsync();
            _context.InvoiceItems.RemoveRange(items);

            // Đặt lại toàn bộ số tiền của các mục trong tháng này về 0
            var allCats = await _context.InvoiceCategories.ToListAsync();
            var mRecs = await _context.MonthlyCategoryRecords
                .Where(m => m.Month == month && m.Year == year)
                .ToListAsync();

            foreach (var cat in allCats)
            {
                var existing = mRecs.FirstOrDefault(r => r.CategoryId == cat.Id);
                if (existing != null)
                {
                    existing.FixedAmount = 0;
                    existing.IsPaid = false;
                }
                else
                {
                    _context.MonthlyCategoryRecords.Add(new MonthlyCategoryRecord
                    {
                        CategoryId = cat.Id,
                        Year = year,
                        Month = month,
                        FixedAmount = 0,
                        IsPaid = false
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã xóa sạch tổng giá Tháng {month}/{year} trong Database SQL Server (Giữ nguyên toàn bộ danh mục)!" });
        }
    }
}
