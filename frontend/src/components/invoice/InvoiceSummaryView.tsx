import React from 'react';
import type { InvoiceCategory, InvoiceItem } from '../../types';
import { Trash2 } from 'lucide-react';

export interface InvoiceSummaryViewProps {
  categories: InvoiceCategory[];
  categoryItems?: Record<number, InvoiceItem[]>;
  selectedMonth: number;
  selectedYear: number;
  onSelectCategory?: (id: number) => void;
  onDeleteCategory?: (id: number, name: string, e: React.MouseEvent) => void;
  onTogglePaid?: (id: number, e: React.MouseEvent) => void;
  onEditFixedAmount?: (cat: InvoiceCategory) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  hideActions?: boolean;
}

export const InvoiceSummaryView: React.FC<InvoiceSummaryViewProps> = ({
  categories,
  categoryItems = {},
  selectedMonth,
  selectedYear,
  onSelectCategory,
  onDeleteCategory,
  onTogglePaid,
  onEditFixedAmount,
  containerRef,
  className = '',
  hideActions = false,
}) => {
  const getCategoryTotal = (cat: InvoiceCategory) => {
    const items = categoryItems[cat.id];
    if (items !== undefined && items.length > 0) {
      return items.reduce(
        (sum, i) => sum + (i.totalPayment > 0 ? i.totalPayment : i.amount - (i.depositFee || 0)),
        0
      );
    }
    return cat.fixedAmount || cat.totalAmount || 0;
  };

  const grandTotal = categories.reduce((sum, c) => sum + getCategoryTotal(c), 0);

  return (
    <div
      ref={containerRef}
      className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800 max-w-4xl mx-auto ${className}`}
    >
      {/* Header cho in ấn & chụp ảnh gửi sếp */}
      <div className="mb-4 pb-3 border-b-2 border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
            T2
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              NHÀ HÀNG TẦNG 2 • QUẢN LÝ TÀI CHÍNH
            </div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">
              BẢNG TỔNG HỢP CHI PHÍ HÓA ĐƠN & NHẬP HÀNG
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Kỳ hạch toán: Tháng {selectedMonth}/{selectedYear} • Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
          <div className="text-[11px] text-slate-500 font-semibold">Tình trạng thanh toán</div>
          <div className="text-sm font-black text-emerald-700">
            {categories.filter((c) => c.isPaid).length}/{categories.length} Hạng mục đã duyệt chi
          </div>
          <div className="text-xs font-bold text-slate-700">
            Tổng chi phí: <span className="text-emerald-800 font-black">{grandTotal.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* Top Sheet Tab "T9_2026 ∨ 🧮" matching Image 1 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
          <span>T{selectedMonth}_{selectedYear}</span>
          <span className="text-[10px] opacity-80">▼</span>
          <span>🧮</span>
        </div>
      </div>

      {/* Main Table Matching Image 1 */}
      <table className="w-full border-collapse border-2 border-gray-600 text-sm">
        <thead>
          <tr className="bg-[#245839] text-white font-extrabold select-none">
            {/* 순번 (STT) */}
            <th className="border border-gray-500 py-3 px-3 text-center w-16">
              <div className="flex items-center justify-center gap-1">
                <span>순번</span>
                <span className="text-[10px] opacity-75">▼</span>
              </div>
            </th>

            {/* 품목 (Hạng mục) */}
            <th className="border border-gray-500 py-3 px-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <span>품목</span>
                <span className="text-[10px] opacity-75">▼</span>
              </div>
            </th>

            {/* 금액 (Số tiền) */}
            <th className="border border-gray-500 py-3 px-4 text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1">
                <span>금액</span>
                <span className="text-[10px] opacity-75">▼</span>
              </div>
            </th>

            {/* 결제 (Thanh toán) */}
            <th className="border border-gray-500 py-3 px-3 text-center w-20">
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">☑</span>
                <span>결제</span>
                <span className="text-[10px] opacity-75">▼</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, idx) => {
            const total = getCategoryTotal(cat);
            const isChecked = cat.isPaid;
            return (
              <tr
                key={cat.id}
                onClick={() => onSelectCategory?.(cat.id)}
                className={`hover:bg-emerald-50/60 transition-colors ${onSelectCategory ? 'cursor-pointer' : ''}`}
                title="Bấm để xem và sửa chi tiết hóa đơn của hạng mục này"
              >
                {/* 순번 (STT) */}
                <td className="border border-gray-500 py-2.5 px-3 text-center font-bold text-gray-900 bg-white">
                  {idx + 1}
                </td>

                {/* 품목 (Hạng mục) */}
                <td className="border border-gray-500 py-2.5 px-4 text-center font-bold text-gray-900 bg-white group">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex-1 text-center">{cat.name}</span>
                    {!hideActions && onDeleteCategory && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteCategory(cat.id, cat.name, e)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition print:hidden screenshot-exclude shrink-0"
                        title={`Xóa mục [${cat.name}] khỏi danh sách`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>

                {/* 금액 (Số tiền) */}
                <td
                  className="border border-gray-500 py-2.5 px-4 text-center font-bold text-gray-900 bg-white"
                  onClick={(e) => {
                    if (!categoryItems[cat.id] || categoryItems[cat.id].length === 0) {
                      e.stopPropagation();
                      onEditFixedAmount?.(cat);
                    }
                  }}
                >
                  {total > 0 ? (
                    total.toLocaleString('vi-VN')
                  ) : (
                    <span className="text-slate-400 text-xs italic font-normal hover:text-emerald-700">
                      (Bấm để xem / nhập tiền)
                    </span>
                  )}
                </td>

                {/* 결제 (Checkbox thanh toán - Khớp ô vuông checkbox trong ảnh 1) */}
                <td
                  className="border border-gray-500 py-2.5 px-3 text-center bg-white"
                  onClick={(e) => onTogglePaid?.(cat.id, e)}
                >
                  <div className="flex items-center justify-center">
                    {isChecked ? (
                      <div className="w-5 h-5 bg-emerald-700 text-white rounded-sm flex items-center justify-center text-xs font-black shadow-xs">
                        ✓
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-700 rounded-sm hover:border-emerald-600 bg-white transition"></div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Hàng Tổng cuối bảng (Khớp 100% hàng đỏ chữ Tổng & ô vàng ở Ảnh 1) */}
          <tr className="bg-white font-black text-sm">
            {/* Ô ĐỎ TƯƠI [Tổng] kéo dài cột 1 và 2 */}
            <td
              colSpan={2}
              className="border border-gray-500 py-3 px-4 text-center bg-[#ff0000] text-black font-black text-base"
            >
              Tổng
            </td>

            {/* Ô VÀNG TƯƠI [Tổng số tiền] */}
            <td className="border border-gray-500 py-3 px-4 text-center bg-[#ffff00] text-black font-black text-base">
              {grandTotal.toLocaleString('vi-VN')}
            </td>

            {/* Cột 결제 cuối */}
            <td className="border border-gray-500 py-3 px-3 text-center bg-white"></td>
          </tr>
        </tbody>
      </table>

      {/* Chữ ký xác nhận gửi sếp */}
      <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="font-bold text-slate-700">Người lập biểu</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-14"></div>
        </div>
        <div>
          <div className="font-bold text-slate-700">Quản lý thu mua / Bếp</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-14"></div>
        </div>
        <div>
          <div className="font-bold text-slate-700">Ban Giám Đốc phê duyệt</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & đóng dấu)</div>
          <div className="h-14"></div>
        </div>
      </div>
    </div>
  );
};
