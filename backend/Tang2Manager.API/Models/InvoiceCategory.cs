namespace Tang2Manager.API.Models;

public class InvoiceCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Ví dụ: "야채 (Rau)", "가스 (Gas)", "삼겹살 - 쪽갈비 - 소갈비 - AN PHÁT"
    public string CategoryType { get; set; } = "Daily"; // "Daily" (hàng ngày như rau) hoặc "Supplier" (NPP như An Phát, Keyfood)
    public bool IsPaid { get; set; } = false; // Checkbox 결제 (Thanh toán)
    public int DisplayOrder { get; set; } = 0;
    public decimal FixedAmount { get; set; } = 0; // Số tiền nếu nhập trực tiếp
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<InvoiceItem> Items { get; set; } = new();
}
