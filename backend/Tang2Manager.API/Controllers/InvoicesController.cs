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
    public async Task<ActionResult<IEnumerable<object>>> GetCategories()
    {
        var categories = await _context.InvoiceCategories
            .Include(c => c.Items)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.CategoryType,
                c.IsPaid,
                c.DisplayOrder,
                c.FixedAmount,
                TotalAmount = c.Items.Any() 
                    ? c.Items.Sum(i => i.TotalPayment > 0 ? i.TotalPayment : i.Amount) 
                    : c.FixedAmount,
                ItemCount = c.Items.Count
            })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpPut("categories/{id}/toggle-payment")]
    public async Task<IActionResult> TogglePayment(int id)
    {
        var cat = await _context.InvoiceCategories.FindAsync(id);
        if (cat == null) return NotFound();

        cat.IsPaid = !cat.IsPaid;
        await _context.SaveChangesAsync();
        return Ok(new { cat.Id, cat.IsPaid });
    }

    [HttpPut("categories/{id}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] InvoiceCategory updateDto)
    {
        var cat = await _context.InvoiceCategories.FindAsync(id);
        if (cat == null) return NotFound();

        cat.Name = updateDto.Name;
        cat.IsPaid = updateDto.IsPaid;
        cat.FixedAmount = updateDto.FixedAmount;
        cat.CategoryType = updateDto.CategoryType;
        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpGet("items/{categoryId}")]
    public async Task<ActionResult<IEnumerable<InvoiceItem>>> GetItemsByCategory(int categoryId)
    {
        var items = await _context.InvoiceItems
            .Where(i => i.CategoryId == categoryId)
            .OrderBy(i => i.DisplayOrder)
            .ThenBy(i => i.Id)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("items")]
    public async Task<ActionResult<InvoiceItem>> CreateItem([FromBody] InvoiceItem item)
    {
        // Force Id to 0 so SQL Server IDENTITY generates primary key
        item.Id = 0;
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
        return CreatedAtAction(nameof(GetItemsByCategory), new { categoryId = item.CategoryId }, item);
    }

    [HttpPost("items/batch")]
    public async Task<ActionResult<IEnumerable<InvoiceItem>>> CreateBatchItems([FromBody] List<InvoiceItem> items)
    {
        if (items == null || !items.Any()) return BadRequest("No items provided");

        foreach (var item in items)
        {
            item.Id = 0; // Force Id to 0 so SQL Server IDENTITY generates primary key
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
}
