namespace Tang2Manager.API.Models;

public class MonthlyCategoryRecord
{
    public int CategoryId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal FixedAmount { get; set; } = 0;
    public bool IsPaid { get; set; } = false;

    public InvoiceCategory? Category { get; set; }
}
