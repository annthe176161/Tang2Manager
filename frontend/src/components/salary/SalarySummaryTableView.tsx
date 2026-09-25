import React from 'react';
import type { Employee } from '../../types';

export interface SalarySummaryItem {
  id: number;
  name: string;
  role: string;
  hourlyRate: number;
  totalHours: number;
  hoursPay: number;
  baseSalary: number;
  debtAmount: number;
  debtNote: string;
  totalSalary: number;
}

export interface SalarySummaryTableViewProps {
  selectedMonth: number;
  selectedYear: number;
  employees: Employee[];
  summaryList: SalarySummaryItem[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const SalarySummaryTableView: React.FC<SalarySummaryTableViewProps> = ({
  selectedMonth,
  selectedYear,
  employees,
  summaryList,
  containerRef,
  className = '',
}) => {
  const totalAllHours = summaryList.reduce((s, e) => s + e.totalHours, 0);
  const totalAllHoursPay = summaryList.reduce((s, e) => s + e.hoursPay, 0);
  const totalAllBaseSalary = summaryList.reduce((s, e) => s + e.baseSalary, 0);
  const totalAllDebt = summaryList.reduce((s, e) => s + e.debtAmount, 0);
  const totalAllSalary = summaryList.reduce((s, e) => s + e.totalSalary, 0);

  return (
    <div
      ref={containerRef}
      className={`bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 select-none text-slate-800 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2">
          <span>BẢNG TỔNG HỢP TIỀN LƯƠNG THÁNG {selectedMonth}/{selectedYear}</span>
          <span>🧮</span>
        </div>
      </div>

      <div className="border-b-2 border-emerald-800 pb-3 mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-emerald-950 uppercase tracking-tight">
            NHÀ HÀNG TẦNG 2 — BẢNG TỔNG HỢP TIỀN LƯƠNG NHÂN VIÊN
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Kỳ hạch toán: Tháng {selectedMonth}/{selectedYear} | Tổng nhân sự: {employees.length}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-bold block">Tổng tiền thực chi:</span>
          <span className="text-lg font-black text-emerald-900 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-300">
            {totalAllSalary.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-gray-600 text-xs">
        <thead>
          <tr className="bg-[#245839] text-white font-extrabold select-none">
            <th className="border border-gray-500 py-2 px-2 text-center w-10">STT</th>
            <th className="border border-gray-500 py-2 px-3 text-left">Họ và Tên</th>
            <th className="border border-gray-500 py-2 px-2 text-center w-24">Vị trí</th>
            <th className="border border-gray-500 py-2 px-2 text-center w-24">Lương/giờ</th>
            <th className="border border-gray-500 py-2 px-2 text-center w-20">Tổng giờ</th>
            <th className="border border-gray-500 py-2 px-3 text-center w-28">Tiền công giờ</th>
            <th className="border border-gray-500 py-2 px-3 text-center w-28">Lương cứng</th>
            <th className="border border-gray-500 py-2 px-3 text-center w-28 bg-rose-900 text-white">Công nợ / Ứng</th>
            <th className="border border-gray-500 py-2 px-3 text-center w-32 bg-emerald-900 text-white">Thực nhận</th>
            <th className="border border-gray-500 py-2 px-3 text-center w-24">Ký nhận</th>
          </tr>
        </thead>
        <tbody>
          {summaryList.map((emp, idx) => (
            <tr key={emp.id} className="border-b border-gray-300">
              <td className="border border-gray-400 py-2 px-2 text-center font-bold">{idx + 1}</td>
              <td className="border border-gray-400 py-2 px-3 text-left font-black text-gray-900">{emp.name}</td>
              <td className="border border-gray-400 py-2 px-2 text-center text-slate-600 font-semibold">{emp.role}</td>
              <td className="border border-gray-400 py-2 px-2 text-center font-bold">{emp.hourlyRate.toLocaleString('vi-VN')}</td>
              <td className="border border-gray-400 py-2 px-2 text-center font-black">
                {emp.totalHours > 0 ? String(emp.totalHours).replace('.', ',') : '0'}
              </td>
              <td className="border border-gray-400 py-2 px-3 text-center font-bold text-gray-900">
                {emp.hoursPay > 0 ? emp.hoursPay.toLocaleString('vi-VN') : '0'}
              </td>
              <td className="border border-gray-400 py-2 px-3 text-center font-bold text-gray-900">
                {emp.baseSalary > 0 ? emp.baseSalary.toLocaleString('vi-VN') : '-'}
              </td>
              <td className="border border-gray-400 py-2 px-3 text-center font-bold text-rose-600 bg-rose-50/50">
                {emp.debtAmount > 0 ? `-${emp.debtAmount.toLocaleString('vi-VN')}` : '-'}
              </td>
              <td className="border border-gray-400 py-2 px-3 text-center font-black text-emerald-900 bg-emerald-50/60 text-sm">
                {emp.totalSalary.toLocaleString('vi-VN')}
              </td>
              <td className="border border-gray-400 py-2 px-3 text-center text-[10px] text-slate-400 italic">
                {emp.totalSalary > 0 ? '(Ký tên)' : ''}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-black text-xs">
            <td colSpan={4} className="border border-gray-500 py-2.5 px-3 text-center font-extrabold uppercase">
              TỔNG CỘNG ({employees.length} NHÂN SỰ):
            </td>
            <td className="border border-gray-500 py-2.5 px-2 text-center font-black">
              {String(totalAllHours).replace('.', ',')}
            </td>
            <td className="border border-gray-500 py-2.5 px-3 text-center font-bold">
              {totalAllHoursPay.toLocaleString('vi-VN')}
            </td>
            <td className="border border-gray-500 py-2.5 px-3 text-center font-bold">
              {totalAllBaseSalary.toLocaleString('vi-VN')}
            </td>
            <td className="border border-gray-500 py-2.5 px-3 text-center font-bold text-rose-700 bg-rose-50">
              {totalAllDebt > 0 ? `-${totalAllDebt.toLocaleString('vi-VN')}` : '-'}
            </td>
            <td className="border border-gray-500 py-2.5 px-3 text-center text-emerald-900 text-sm font-black bg-emerald-100/70">
              {totalAllSalary.toLocaleString('vi-VN')} đ
            </td>
            <td className="border border-gray-500 py-2.5 px-3 text-center"></td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="font-bold text-slate-800">Người lập biểu</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-16"></div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Quản lý nhà hàng</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-16"></div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Ban Giám Đốc duyệt chi</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & đóng dấu)</div>
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
};
