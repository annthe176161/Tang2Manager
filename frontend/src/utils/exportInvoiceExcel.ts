import * as XLSX from 'xlsx';
import type { InvoiceCategory, InvoiceItem } from '../types';

export const exportInvoiceToExcel = (
  month: number,
  year: number,
  categories: InvoiceCategory[],
  categoryItems: Record<number, InvoiceItem[]>,
  activeCategoryId?: number | null
) => {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString('vi-VN');

  // Helper to calculate total for a category
  const getCatTotal = (cat: InvoiceCategory): number => {
    const items = categoryItems[cat.id];
    if (items && items.length > 0) {
      return items.reduce((sum, it) => sum + (it.totalPayment || it.amount || 0), 0);
    }
    return cat.fixedAmount || 0;
  };

  const grandTotal = categories.reduce((sum, cat) => sum + getCatTotal(cat), 0);
  const paidCount = categories.filter((c) => c.isPaid).length;

  // ==========================================
  // SHEET 1: BẢNG TỔNG HỢP HÓA ĐƠN THÁNG
  // ==========================================
  const sheet1Data: (string | number)[][] = [
    ['NHÀ HÀNG TẦNG 2 - BẢNG TỔNG HỢP CHI PHÍ HÓA ĐƠN & NHẬP HÀNG'],
    [`Kỳ hạch toán: Tháng ${month} năm ${year} | Ngày xuất file: ${dateStr}`],
    [''], // blank line
    [
      'STT (순번)',
      'Mã Hạng Mục',
      'Hạng Mục / Nhà Cung Cấp (품목)',
      'Phân Loại',
      'Số Lượng Mục',
      'Tổng Số Tiền (금액) (VNĐ)',
      'Thanh Toán (결제)',
      'Ghi Chú',
    ],
  ];

  categories.forEach((cat, index) => {
    const items = categoryItems[cat.id] || [];
    const total = getCatTotal(cat);
    sheet1Data.push([
      index + 1,
      `HD${String(cat.id).padStart(2, '0')}`,
      cat.name,
      cat.categoryType === 'Supplier' ? 'Nhà phân phối (NCC)' : 'Chi tiêu hàng ngày',
      items.length > 0 ? `${items.length} mặt hàng` : 'Định mức',
      total,
      cat.isPaid ? 'ĐÃ THANH TOÁN (✓)' : 'CHƯA THANH TOÁN (⏳)',
      cat.fixedAmount && items.length === 0 ? 'Số tiền cố định' : '',
    ]);
  });

  // Hàng Tổng Cộng
  sheet1Data.push([
    'TỔNG CỘNG',
    '',
    `Toàn bộ ${categories.length} hạng mục hóa đơn`,
    '',
    '',
    grandTotal,
    `${paidCount}/${categories.length} hạng mục đã thanh toán`,
    '',
  ]);

  // Chữ ký xác nhận gửi sếp
  sheet1Data.push(
    [''],
    [''],
    ['', 'Người Lập Biểu', '', 'Quản Lý Thu Mua / Bếp', '', '', 'Ban Giám Đốc Phê Duyệt', ''],
    ['', '(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '', '(Ký và ghi rõ họ tên)', '']
  );

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  ws1['!cols'] = [
    { wch: 12 }, // STT
    { wch: 14 }, // Mã HM
    { wch: 38 }, // Hạng mục
    { wch: 24 }, // Phân loại
    { wch: 18 }, // Số lượng mục
    { wch: 26 }, // Tổng số tiền
    { wch: 28 }, // Thanh toán
    { wch: 22 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws1, `Tong_Hop_T${month}_${year}`);

  // ==========================================
  // SHEET 2: CHI TIẾT TẤT CẢ MẶT HÀNG NHẬP
  // ==========================================
  const sheet2Data: (string | number)[][] = [
    ['NHÀ HÀNG TẦNG 2 - BẢNG KÊ CHI TIẾT TẤT CẢ MẶT HÀNG NHẬP KHO & HÓA ĐƠN'],
    [`Kỳ hạch toán: Tháng ${month} năm ${year} | Ngày xuất file: ${dateStr}`],
    [''],
    [
      'STT',
      'Hạng Mục / Nhà Cung Cấp',
      'Ngày',
      'Tên Mặt Hàng',
      'Đơn Vị Tính',
      'Số Lượng',
      'Đơn Giá (VNĐ)',
      'Thuế Suất (%)',
      'Tiền Thuế GTGT (VNĐ)',
      'Thành Tiền (VNĐ)',
      'Tổng Thanh Toán (VNĐ)',
      'Ghi Chú',
    ],
  ];

  let sttAll = 1;
  let totalQtyAll = 0;
  let totalTaxAll = 0;
  let totalAmountAll = 0;
  let totalPaymentAll = 0;

  categories.forEach((cat) => {
    const items = categoryItems[cat.id] || [];
    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const tax = Number(item.taxAmount) || 0;
      const amt = Number(item.amount) || 0;
      const pay = Number(item.totalPayment) || amt;

      totalQtyAll += qty;
      totalTaxAll += tax;
      totalAmountAll += amt;
      totalPaymentAll += pay;

      sheet2Data.push([
        sttAll++,
        cat.name,
        item.dateStr || '',
        item.itemName,
        item.unit || 'kg',
        qty,
        item.unitPrice,
        item.taxRate ? `${item.taxRate}%` : '0%',
        tax > 0 ? tax : 0,
        amt,
        pay,
        item.note || '',
      ]);
    });
  });

  // Hàng Tổng Cộng cho Sheet 2
  sheet2Data.push([
    'TỔNG CỘNG',
    '',
    '',
    `${sttAll - 1} mặt hàng đã nhập`,
    '',
    Math.round(totalQtyAll * 100) / 100,
    '',
    '',
    totalTaxAll,
    totalAmountAll,
    totalPaymentAll,
    '',
  ]);

  sheet2Data.push(
    [''],
    [''],
    ['', 'Người Lập Biểu', '', 'Quản Lý Thu Mua / Bếp', '', '', 'Ban Giám Đốc Phê Duyệt', ''],
    ['', '(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '', '(Ký và ghi rõ họ tên)', '']
  );

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  ws2['!cols'] = [
    { wch: 8 },  // STT
    { wch: 32 }, // Hạng mục
    { wch: 12 }, // Ngày
    { wch: 34 }, // Tên hàng
    { wch: 14 }, // ĐVT
    { wch: 14 }, // Số lượng
    { wch: 18 }, // Đơn giá
    { wch: 16 }, // Thuế suất
    { wch: 20 }, // Tiền thuế
    { wch: 20 }, // Thành tiền
    { wch: 22 }, // Tổng thanh toán
    { wch: 20 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_Tat_Ca_Hang');

  // ==========================================
  // SHEET 3 (NẾU ĐANG XEM 1 HẠNG MỤC CỤ THỂ)
  // ==========================================
  if (activeCategoryId) {
    const activeCat = categories.find((c) => c.id === activeCategoryId);
    if (activeCat) {
      const activeItems = categoryItems[activeCat.id] || [];
      const cleanName = activeCat.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
      
      const isDetergent = activeCat.id === 11 || activeCat.name.includes('주방세제') || activeCat.name.includes('Nước rửa') || activeCat.name.includes('lau sàn');
      
      const sheet3Data: (string | number)[][] = [
        [`NHÀ HÀNG TẦNG 2 - BẢNG KÊ CHI TIẾT HÓA ĐƠN: ${activeCat.name.toUpperCase()}`],
        [`Kỳ hạch toán: Tháng ${month} năm ${year} | Trạng thái: ${activeCat.isPaid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}`],
        [''],
        isDetergent
          ? [
              'STT',
              'NGÀY',
              'TÊN HÀNG',
              'ĐVT',
              'SỐ LƯỢNG',
              'ĐƠN GIÁ (VNĐ)',
              '# THÀNH TIỀN (VNĐ)',
              'Trả vỏ (VNĐ)',
              'Tổng (VNĐ)',
            ]
          : [
              'STT',
              'Ngày',
              'Tên Mặt Hàng',
              'Đơn Vị Tính',
              'Số Lượng',
              'Đơn Giá (VNĐ)',
              'Thuế Suất (%)',
              'Tiền Thuế GTGT (VNĐ)',
              'Thành Tiền (VNĐ)',
              'Tổng Thanh Toán (VNĐ)',
              'Ghi Chú',
            ],
      ];

      let subTotalQty = 0;
      let subTotalTax = 0;
      let subTotalAmt = 0;
      let subTotalPay = 0;
      let subTotalDeposit = 0;

      activeItems.forEach((item, idx) => {
        const qty = Number(item.quantity) || 0;
        const tax = Number(item.taxAmount) || 0;
        const amt = Number(item.amount) || 0;
        const deposit = Number(item.depositFee) || 0;
        const pay = Number(item.totalPayment) || (deposit > 0 ? amt - deposit : amt);

        subTotalQty += qty;
        subTotalTax += tax;
        subTotalAmt += amt;
        subTotalPay += pay;
        subTotalDeposit += deposit;

        if (isDetergent) {
          sheet3Data.push([
            idx + 1,
            item.dateStr || '',
            item.itemName,
            item.unit || 'Can',
            qty,
            item.unitPrice,
            amt,
            deposit > 0 ? deposit : '',
            pay,
          ]);
        } else {
          sheet3Data.push([
            idx + 1,
            item.dateStr || '',
            item.itemName,
            item.unit || 'kg',
            qty,
            item.unitPrice,
            item.taxRate ? `${item.taxRate}%` : '0%',
            tax > 0 ? tax : 0,
            amt,
            pay,
            item.note || '',
          ]);
        }
      });

      if (isDetergent) {
        sheet3Data.push([
          'TỔNG CỘNG',
          '',
          `${activeItems.length} mặt hàng`,
          '',
          Math.round(subTotalQty * 100) / 100,
          '',
          subTotalAmt,
          subTotalDeposit > 0 ? subTotalDeposit : '',
          subTotalPay > 0 ? subTotalPay : getCatTotal(activeCat),
        ]);
      } else {
        sheet3Data.push([
          'TỔNG CỘNG',
          '',
          `${activeItems.length} mặt hàng`,
          '',
          Math.round(subTotalQty * 100) / 100,
          '',
          '',
          subTotalTax,
          subTotalAmt,
          subTotalPay > 0 ? subTotalPay : getCatTotal(activeCat),
          '',
        ]);
      }

      sheet3Data.push(
        [''],
        [''],
        ['', 'Người Lập Biểu', '', 'Quản Lý Thu Mua / Bếp', '', '', 'Ban Giám Đốc Phê Duyệt', ''],
        ['', '(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '', '(Ký và ghi rõ họ tên)', '']
      );

      const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
      ws3['!cols'] = [
        { wch: 8 },  // STT
        { wch: 12 }, // Ngày
        { wch: 34 }, // Tên hàng
        { wch: 14 }, // ĐVT
        { wch: 14 }, // Số lượng
        { wch: 18 }, // Đơn giá
        { wch: 16 }, // Thuế suất
        { wch: 20 }, // Tiền thuế
        { wch: 20 }, // Thành tiền
        { wch: 22 }, // Tổng thanh toán
        { wch: 20 }, // Ghi chú
      ];

      XLSX.utils.book_append_sheet(wb, ws3, cleanName || 'Chi_Tiet_Muc');
    }
  }

  // Tên file xuất Excel
  const activeCatObj = activeCategoryId ? categories.find((c) => c.id === activeCategoryId) : null;
  const fileName = activeCatObj
    ? `Hoa_Don_${activeCatObj.name.replace(/[^a-zA-Z0-9]/g, '_')}_Thang_${month}_${year}.xlsx`
    : `Tong_Hop_Hoa_Don_Nha_Hang_Tang2_Thang_${month}_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
};
