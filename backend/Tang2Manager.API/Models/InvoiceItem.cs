using System.Text.Json.Serialization;

namespace Tang2Manager.API.Models;

public class InvoiceItem
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    
    [JsonIgnore]
    public InvoiceCategory? Category { get; set; }

    public string DateStr { get; set; } = string.Empty; // Ví dụ: "1/9", "3/9"
    public string ItemName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty; // kg, chai, thùng...
    public decimal Quantity { get; set; } = 0;
    public decimal UnitPrice { get; set; } = 0;
    public decimal TaxRate { get; set; } = 0; // % ví dụ 5%
    public decimal TaxAmount { get; set; } = 0;
    public decimal Amount { get; set; } = 0; // Thành tiền trước thuế
    public decimal TotalPayment { get; set; } = 0; // Tổng thanh toán sau thuế
    public decimal DepositFee { get; set; } = 0; // Tiền trả vỏ (Gas)
    public decimal ShipFee { get; set; } = 0; // Phí ship (Khấu_Má)
    public int DisplayOrder { get; set; } = 0;
    public string? Note { get; set; }
    public int Month { get; set; } = 9;
    public int Year { get; set; } = 2026;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
