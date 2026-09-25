import React, { useMemo } from 'react';
import type { InvoiceCategory, InvoiceItem } from '../../types';
import { Edit2, Trash2 } from 'lucide-react';

export interface InvoiceDetailViewProps {
  category: InvoiceCategory;
  items: InvoiceItem[];
  selectedMonth: number;
  selectedYear: number;
  onEdit?: (item: InvoiceItem) => void;
  onDelete?: (id: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  hideActions?: boolean;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({
  category,
  items,
  selectedMonth,
  selectedYear,
  onEdit,
  onDelete,
  containerRef,
  className = '',
  hideActions = false,
}) => {
  void hideActions;
  const activeCategory = category;
  const currentItems = items;

  const handleOpenEditModal = (item: InvoiceItem) => {
    onEdit?.(item);
  };

  const handleDeleteItem = (id: number) => {
    onDelete?.(id);
  };

  const activeCategoryTotal = useMemo(() => {
    return currentItems.reduce(
      (sum, i) => sum + (i.totalPayment > 0 ? i.totalPayment : (i.amount - (i.depositFee || 0))),
      0
    );
  }, [currentItems]);

  const groupedDailyItems = useMemo(() => {
    const groups: { dateStr: string; items: InvoiceItem[]; dayTotal: number }[] = [];
    const dateMap = new Map<string, InvoiceItem[]>();

    currentItems.forEach((item) => {
      const d = item.dateStr || 'Khác';
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(item);
    });

    dateMap.forEach((itemList, dateStr) => {
      const dayTotal = itemList.reduce(
        (s, i) => s + sumSafe(i),
        0
      );
      groups.push({ dateStr, items: itemList, dayTotal });
    });

    function sumSafe(i: InvoiceItem) {
      return i.totalPayment > 0 ? i.totalPayment : (i.amount - (i.depositFee || 0));
    }

    return groups;
  }, [currentItems]);

  return (
          <div
            ref={containerRef}
            className={`bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800 ${className}`}
          >
            {/* Header cho in ấn & chụp ảnh gửi sếp */}
            <div className="mb-4 pb-3 border-b-2 border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-800 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  T2
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-blue-800">
                    NHÀ HÀNG TẦNG 2 • HÓA ĐƠN CHI TIẾT
                  </div>
                  <h1 className="text-lg font-black text-slate-900 leading-tight">
                    {activeCategory.name.toUpperCase()}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Kỳ hạch toán: Tháng {selectedMonth}/{selectedYear} • {currentItems.length} mặt hàng đã ghi nhận
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Tình trạng thanh toán</div>
                <div className={`text-sm font-black ${activeCategory.isPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {activeCategory.isPaid ? '✓ ĐÃ THANH TOÁN' : '⏳ CHƯA THANH TOÁN'}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  Tổng chi phí: <span className="text-blue-900 font-black">{activeCategoryTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Header Title Banner */}
            <div className="mb-3">
              {activeCategory.id === 4 ? (
                // Yellow NPP AN PHÁT Header Banner (Khớp Ảnh 4)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NPP AN PHÁT
                </div>
              ) : activeCategory.id === 3 ? (
                // Yellow NNP KEYFOOD Header Banner (Khớp Ảnh 4)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NNP KEYFOOD
                </div>
              ) : activeCategory.id === 12 || activeCategory.name.includes('베트남 술') ? (
                // Green Rượu Việt Header Tab (Khớp Ảnh 1 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Rượu Việt</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 2 || activeCategory.name.includes('가스') ? (
                // Green Gas du lịch Header Tab (Khớp Ảnh 3 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Gas du lịch</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 5 || activeCategory.name.includes('막창') ? (
                // Green Khấu_Má Header Tab (Khớp Ảnh 5 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Khấu_Má</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 10 || activeCategory.name.includes('원마켓') ? (
                // Green One Market Header Tab (Khớp Ảnh 1 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>One Market</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 6 || activeCategory.name.includes('과일') ? (
                // Green Rượu Soju hoa quả Header Tab (Khớp Ảnh 2 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Rượu Soju hoa quả</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 8 || activeCategory.name.includes('고사리') ? (
                // Green Dương sỉ _ Bột ớt Header Tab (Khớp Ảnh 3 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Dương sỉ _ Bột ớt</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 7 || activeCategory.name.includes('옥수수') ? (
                // Green Ngô hộp Header Tab (Khớp Ảnh 4 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Ngô hộp</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 9 || activeCategory.name.includes('음료수') ? (
                // Blue Đồ uống Banner (Khớp Ảnh 5 đợt 2)
                <div className="inline-block bg-[#3b82f6] text-white px-4 py-1 font-bold text-sm rounded-md mb-2">
                  HÓA ĐƠN: ĐỒ UỐNG & NƯỚC NGỌT (음료수)
                </div>
              ) : activeCategory.id === 11 || activeCategory.name.includes('주방세제') || activeCategory.name.includes('Nước rửa') || activeCategory.name.includes('lau sàn') ? (
                // Green Nước rửa bát_Nước lau sàn Header Tab (Khớp 100% Ảnh người dùng vừa gửi)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Nước rửa bát_Nước lau sàn</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : (
                <div className="inline-block bg-emerald-800 text-white px-4 py-1 font-bold text-sm rounded-md mb-2">
                  HÓA ĐƠN: {activeCategory.name.toUpperCase()}
                </div>
              )}
            </div>

            {/* CASE A: NPP AN PHÁT (Có thuế suất GTGT 5% & Tổng thanh toán - Khớp Ảnh 4) */}
            {activeCategory.id === 4 ? (
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-12">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[220px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-16">ĐƠN VỊ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-24">THUẾ SUẤT %</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[120px]">TIỀN THUẾ GTGT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[130px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[140px]">TỔNG THANH TOÁN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition">
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.dateStr}</td>
                      <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-semibold">{item.unit || 'kg'}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {String(item.quantity).replace('.', ',')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.taxRate}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.taxAmount > 0 ? item.taxAmount.toLocaleString('vi-VN') : ''}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-extrabold text-blue-900">
                        {item.totalPayment.toLocaleString('vi-VN')}
                      </td>
                      {/* Cột Tổng tháng hiển thị ở hàng đầu tiên */}
                      {idx === 0 ? (
                        <td
                          rowSpan={currentItems.length}
                          className="border border-gray-500 py-2 px-3 text-center font-black text-red-600 bg-red-50 text-base align-middle"
                        >
                          {activeCategoryTotal.toLocaleString('vi-VN')}
                        </td>
                      ) : null}
                      <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:text-blue-600 rounded text-slate-500"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 hover:text-red-600 rounded text-slate-500"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeCategory.id === 3 ? (
              // CASE B: NPP KEYFOOD (Không thuế GTGT, có tổng tháng - Khớp Ảnh 4)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-12">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[260px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-16">ĐƠN VỊ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition">
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.dateStr}</td>
                      <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-semibold">{item.unit || 'kg'}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {String(item.quantity).replace('.', ',')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-blue-900">
                        {item.amount.toLocaleString('vi-VN')}
                      </td>
                      {idx === 0 ? (
                        <td
                          rowSpan={currentItems.length}
                          className="border border-gray-500 py-2 px-3 text-center font-black text-red-600 bg-red-50 text-base align-middle"
                        >
                          {activeCategoryTotal.toLocaleString('vi-VN')}
                        </td>
                      ) : null}
                      <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:text-blue-600 rounded text-slate-500"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 hover:text-red-600 rounded text-slate-500"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeCategory.id === 12 || activeCategory.name.includes('베트남 술') ? (
              // CASE C: RƯỢU VIỆT (Khớp 100% Ảnh 1)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tên hàng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn vị</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Giá đơn vị</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thành tiền</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu rượu trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Can'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.note || (item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') : '30L')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG Thành Tiền ở Ảnh 1) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={4} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 2 || activeCategory.name.includes('가스') ? (
              // CASE D: GAS DU LỊCH (Khớp 100% Ảnh 3)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN SẢN PHẨM</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TIỀN TRẢ VỎ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu gas trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Thùng'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-bold text-slate-700">
                          {(item.depositFee || 0) > 0 ? (item.depositFee || 0).toLocaleString('vi-VN') : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng ở Ảnh 3) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-bold text-slate-700 bg-white">
                      {currentItems.reduce((s, i) => s + (i.depositFee || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.depositFee || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 5 || activeCategory.name.includes('막창') ? (
              // CASE E: KHẤU MÁ (Khớp 100% Ảnh 5)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN SẢN PHẨM</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SHIP</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu khấu - má trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold text-slate-700">
                          {(item.shipFee || 0) > 0 ? (item.shipFee || 0).toLocaleString('vi-VN') : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG 3.672.000 ở Ảnh 5) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={4} className="border-0 py-2"></td>
                    <td colSpan={2} className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 10 || activeCategory.name.includes('원마켓') ? (
              // CASE F: ONE MARKET (Khớp 100% Ảnh 1 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>Ngày (일자)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[280px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Mã vạch / Tên hàng hóa (품목 (규격))</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng (수량)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn giá (단가)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thành tiền (금액)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thuế (세액)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ffff00] text-black font-black min-w-[130px]">
                      Tổng cộng (합계)
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white font-black min-w-[130px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDailyItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu One Market trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    groupedDailyItems.map((group, groupIdx) => (
                      <React.Fragment key={group.dateStr || groupIdx}>
                        {group.items.map((item, itemIdx) => (
                          <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold text-gray-900">
                              {itemIdx === 0 ? item.dateStr : ''}
                            </td>
                            <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">
                              {item.itemName}
                            </td>
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                              {String(item.quantity).replace('.', ',')}
                            </td>
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                              {item.unitPrice.toLocaleString('vi-VN')}
                            </td>
                            <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                              {item.amount.toLocaleString('vi-VN')}
                            </td>
                            <td className="border border-gray-500 py-2 px-2 text-center font-bold">
                              {item.taxAmount > 0 ? item.taxAmount.toLocaleString('vi-VN') : 0}
                            </td>
                            {/* Cột Tổng cộng (합계) của ngày hiển thị ở hàng cuối cùng của ngày */}
                            {itemIdx === group.items.length - 1 ? (
                              <td className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-[#ffff00]/30">
                                {group.dayTotal.toLocaleString('vi-VN')}
                              </td>
                            ) : (
                              <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                            )}
                            {/* Cột Tổng tháng hiển thị rowSpan ở hàng đầu tiên của bảng */}
                            {groupIdx === 0 && itemIdx === 0 ? (
                              <td
                                rowSpan={currentItems.length}
                                className="border border-gray-500 py-2 px-4 text-center font-black text-black bg-[#ffff00] text-base align-middle"
                              >
                                {activeCategoryTotal.toLocaleString('vi-VN')}
                              </td>
                            ) : null}
                            <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1 hover:text-blue-600 rounded text-slate-500"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 hover:text-red-600 rounded text-slate-500"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeCategory.id === 6 || activeCategory.name.includes('과일') ? (
              // CASE G: RƯỢU SOJU HOA QUẢ (Khớp 100% Ảnh 2 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[180px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Danh mục sản phẩm</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Sản phẩm</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn giá</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tổng thành tiền</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Soju hoa quả trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-semibold text-gray-700">{item.note || 'Soju hoa quả'}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Chai'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 2) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={5} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 8 || activeCategory.name.includes('고사리') ? (
              // CASE H: DƯƠNG SỈ _ BỘT ỚT (Khớp 100% Ảnh 3 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[240px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN MẶT HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Dương sỉ _ Bột ớt trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold text-gray-900">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 3) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={3} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 7 || activeCategory.name.includes('옥수수') ? (
              // CASE I: NGÔ HỘP (Khớp 100% Ảnh 4 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>MÃ HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN VỊ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Ngô hộp trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold text-slate-700">{item.note || '671'}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Hộp'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 4) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 9 || activeCategory.name.includes('음료수') ? (
              // CASE J: ĐỒ UỐNG & NƯỚC NGỌT (Khớp 100% Ảnh 5 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[260px]">TÊN SẢN PHẨM</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-20">%VAT</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[160px]">GHI CHÚ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white min-w-[130px]">
                      TỔNG TIỀN
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Đồ uống trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr || ''}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center font-bold">
                          {item.taxRate > 0 ? `${item.taxRate}%` : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-left text-xs text-slate-600">{item.note || ''}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice > 0 ? item.unitPrice.toLocaleString('vi-VN') : '0'}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-blue-900">
                          {item.amount > 0 ? item.amount.toLocaleString('vi-VN') : ''}
                        </td>
                        {idx === currentItems.length - 1 ? (
                          <td
                            rowSpan={1}
                            className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white"
                          >
                            {activeCategoryTotal.toLocaleString('vi-VN')}
                          </td>
                        ) : (
                          <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                        )}
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô TRẮNG ở Ảnh 5) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-white font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 11 || activeCategory.name.includes('주방세제') || activeCategory.name.includes('Nước rửa') || activeCategory.name.includes('lau sàn') ? (
              // CASE L: NƯỚC RỬA BÁT _ NƯỚC LAU SÀN (Khớp 100% Ảnh người dùng vừa gửi)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#235c43] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>📅 NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span># THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Trả vỏ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tổng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Nước rửa bát - Nước lau sàn trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => {
                      const finalItemTotal = item.totalPayment > 0 ? item.totalPayment : (item.amount - (item.depositFee || 0));
                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                          <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Can'}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {String(item.quantity).replace('.', ',')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {item.unitPrice.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-bold text-gray-900">
                            {item.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-semibold text-rose-600">
                            {(item.depositFee || 0) > 0 ? (item.depositFee || 0).toLocaleString('vi-VN') : ''}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                            {finalItemTotal.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:text-blue-600 rounded text-slate-500"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 hover:text-red-600 rounded text-slate-500"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG Thành Tiền) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900 bg-slate-50">
                      {currentItems.reduce((s, i) => s + (i.amount || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-3 text-center font-bold text-rose-700 bg-slate-50">
                      {currentItems.reduce((s, i) => s + (i.depositFee || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.depositFee || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              // CASE C: CHI TIẾT THEO NGÀY (Khớp 100% Ảnh 2 - Rau củ / Chi tiêu ngày)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[130px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng ngày
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDailyItems.map((group, groupIdx) => (
                    <React.Fragment key={group.dateStr || groupIdx}>
                      {group.items.map((item, itemIdx) => (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition">
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{itemIdx + 1}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {itemIdx === 0 ? item.dateStr : ''}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">
                            {item.itemName}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {String(item.quantity).replace('.', ',')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {item.unitPrice.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-bold text-gray-900">
                            {item.amount.toLocaleString('vi-VN')}
                          </td>
                          {/* Ô tổng ngày ở hàng cuối cùng của ngày đó */}
                          {itemIdx === group.items.length - 1 ? (
                            <td
                              rowSpan={1}
                              className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white"
                            >
                              {group.dayTotal.toLocaleString('vi-VN')}
                            </td>
                          ) : (
                            <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                          )}
                          <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:text-blue-600 rounded text-slate-500"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 hover:text-red-600 rounded text-slate-500"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Thanh phân cách MÀU VÀNG giữa các ngày (Khớp 100% Ảnh 2) */}
                      {groupIdx < groupedDailyItems.length - 1 && (
                        <tr className="bg-[#ffff00] h-4">
                          <td colSpan={8} className="border border-gray-400 bg-[#ffff00] py-1"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Hàng tổng cộng của toàn bộ hạng mục */}
                  <tr className="bg-slate-100 font-black text-sm">
                    <td colSpan={5} className="border border-gray-500 py-2.5 px-4 text-right">
                      TỔNG CỘNG THÁNG {selectedMonth}:
                    </td>
                    <td colSpan={2} className="border border-gray-500 py-2.5 px-4 text-center text-emerald-900 text-base font-black">
                      {activeCategoryTotal.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude bg-slate-100"></td>
                  </tr>
                </tbody>
              </table>
            )}

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
