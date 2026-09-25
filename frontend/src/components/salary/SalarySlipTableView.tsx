import React from 'react';
import type { Employee, DailyTimesheet } from '../../types';

export interface SalarySlipTableViewProps {
  employee: Employee;
  timesheet: DailyTimesheet[];
  hourlyRate: number;
  baseSalary: number;
  debtAmount: number;
  debtNote: string;
  selectedMonth: number;
  selectedYear: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const SalarySlipTableView: React.FC<SalarySlipTableViewProps> = ({
  employee,
  timesheet,
  hourlyRate,
  baseSalary,
  debtAmount,
  debtNote,
  selectedMonth,
  selectedYear,
  containerRef,
  className = '',
}) => {
  const totalH = timesheet.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
  const hoursPay = totalH * hourlyRate;
  const totalSalary = hoursPay + baseSalary - debtAmount;

  return (
    <div
      ref={containerRef}
      className={`bg-white p-6 rounded-2xl border border-slate-300 select-none text-slate-800 ${className}`}
    >
      {/* Header info */}
      <div className="flex justify-between items-start pb-3 mb-3 border-b-2 border-emerald-800">
        <div>
          <div className="bg-[#245839] text-white px-3 py-1 text-xs font-bold rounded-md inline-block mb-1.5">
            NHÀ HÀNG TẦNG 2 — PHIẾU CHẤM CÔNG & LƯƠNG CHI TIẾT
          </div>
          <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight">
            {employee.fullName} ({employee.role || 'Nhân viên'})
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Kỳ lương: Tháng {selectedMonth}/{selectedYear} | Đơn giá: <b>{hourlyRate.toLocaleString('vi-VN')} đ/h</b>
          </p>
        </div>

        <div className="text-right space-y-1">
          <div className="text-xs font-bold text-slate-600">
            Tổng giờ làm: <b className="text-slate-900">{String(totalH).replace('.', ',')} giờ</b>
          </div>
          <div className="text-xs font-bold text-slate-600">
            Lương giờ: <b className="text-slate-900">{hoursPay.toLocaleString('vi-VN')} đ</b>
          </div>
          {baseSalary > 0 && (
            <div className="text-xs font-bold text-slate-600">
              Lương cứng: <b className="text-slate-900">+{baseSalary.toLocaleString('vi-VN')} đ</b>
            </div>
          )}
          {debtAmount > 0 && (
            <div className="text-xs font-bold text-rose-600">
              Công nợ / Ứng: <b>-{debtAmount.toLocaleString('vi-VN')} đ</b> {debtNote ? `(${debtNote})` : ''}
            </div>
          )}
          <div className="pt-1">
            <span className="text-xs font-black text-emerald-900 bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-300 text-sm">
              THỰC NHẬN: {totalSalary.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* Table matching Image 2 with cyan header and lime date column */}
      <table className="w-full border-collapse border-2 border-gray-600 text-xs">
        <thead>
          <tr className="bg-[#00e5ff] text-black font-extrabold select-none">
            <th className="border border-gray-600 py-2 px-2 text-center w-16">Ngày</th>
            <th className="border border-gray-600 py-2 px-2 text-center w-24">Bắt đầu</th>
            <th className="border border-gray-600 py-2 px-2 text-center w-24">Kết thúc</th>
            <th className="border border-gray-600 py-2 px-3 text-center min-w-[140px]">Tổng giờ (Tiếng)</th>
            <th className="border border-gray-600 py-2 px-2 text-center w-24">Hệ số lương</th>
            <th className="border border-gray-600 py-2 px-3 text-center w-28">Tiền công ngày</th>
          </tr>
        </thead>
        <tbody>
          {timesheet.map((item) => {
            const isOff = item.isOff;
            return (
              <tr key={item.day}>
                <td className="border border-gray-600 py-1.5 px-2 text-center font-bold bg-[#a3e635]/50 text-gray-900">
                  {item.dateStr}
                </td>
                {isOff ? (
                  <>
                    <td className="border border-gray-600 py-1.5 px-2 text-center bg-[#ff0000]"></td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center bg-[#ff0000]"></td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center bg-[#ff0000]"></td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center bg-[#ff0000] text-black font-bold">
                      {item.hourlyRate}
                    </td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center bg-[#ff0000] text-black font-bold">
                      0
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-gray-600 py-1.5 px-2 text-center font-bold text-gray-900 bg-white">
                      {item.startTime}
                    </td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center font-bold text-gray-900 bg-white">
                      {item.endTime}
                    </td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center font-bold text-gray-900 bg-white">
                      {item.totalHours > 0 ? String(item.totalHours).replace('.', ',') : ''}
                    </td>
                    <td className="border border-gray-600 py-2 px-2 text-center font-bold text-gray-900 bg-white">
                      {item.hourlyRate}
                    </td>
                    <td className="border border-gray-600 py-1.5 px-2 text-center font-extrabold text-emerald-800 bg-white">
                      {item.dailyPay > 0 ? item.dailyPay.toLocaleString('vi-VN') : ''}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          <tr className="font-black text-xs">
            <td
              colSpan={3}
              className="border border-gray-600 py-2 px-3 text-center bg-[#ff0000] text-black font-black text-sm"
            >
              Tổng
            </td>
            <td className="border border-gray-600 py-2 px-3 text-center bg-[#ff0000] text-black font-black">
              {String(totalH).replace('.', ',')}
            </td>
            <td className="border border-gray-600 py-2 px-3 text-center bg-[#ff0000]"></td>
            <td className="border border-gray-600 py-2 px-3 text-center bg-[#ff0000] text-black font-black text-sm">
              {hoursPay.toLocaleString('vi-VN')}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="mt-6 pt-3 border-t border-slate-300 grid grid-cols-2 gap-4 text-center text-xs">
        <div>
          <div className="font-bold text-slate-800">Nhân viên xác nhận</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-12"></div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Quản lý / Người duyệt</div>
          <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
          <div className="h-12"></div>
        </div>
      </div>
    </div>
  );
};
