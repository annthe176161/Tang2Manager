import React, { useState, useRef, useMemo } from 'react';
import type { Employee, DailyTimesheet } from '../../types';
import { downloadScheduleImage, copyScheduleImageToClipboard } from '../../utils/screenshot';
import { 
  Camera, 
  Copy, 
  Check, 
  DollarSign, 
  ArrowLeft,
  Edit2
} from 'lucide-react';

interface SalaryManagerProps {
  employees: Employee[];
}

// Initial mock daily timesheet matching user's Image 2 (for employee "An" in September)
const generateInitialTimesheet = (employeeId: number, hourlyRate: number): DailyTimesheet[] => {
  const daysInMonth = 30; // Tháng 9 có 30 ngày
  const result: DailyTimesheet[] = [];

  // Data map from user's Image 2
  const image2Sample: Record<number, { start?: string; end?: string; hours?: number; isOff?: boolean }> = {
    1: { start: '17h', end: '23h', hours: 6 },
    2: { start: '17h', end: '00h', hours: 7 },
    3: { start: '11h', end: '21h', hours: 7 },
    4: { start: '18h', end: '22h30', hours: 4.5 },
    5: { start: '10h', end: '22h30', hours: 11.5 },
    6: { start: '10h', end: '22h30', hours: 11.5 },
    7: { isOff: true, hours: 0 },
    8: { start: '17h', end: '22h30', hours: 5.5 },
    9: { isOff: true, hours: 0 },
    10: { isOff: true, hours: 0 },
    11: { isOff: true, hours: 0 },
    12: { start: '17h', end: '22h', hours: 5 },
    13: { start: '10h', end: '21h', hours: 10 },
    14: { isOff: true, hours: 0 },
    15: { isOff: true, hours: 0 },
    16: { isOff: true, hours: 0 },
    17: { start: '17h', end: '22h30', hours: 5.5 },
    18: { isOff: true, hours: 0 },
    19: { isOff: true, hours: 0 },
    20: { start: '11h', end: '22h', hours: 9 },
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const sample = image2Sample[d];
    if (sample) {
      const isOff = sample.isOff || false;
      const hours = sample.hours || 0;
      result.push({
        employeeId,
        day: d,
        dateStr: `${d}/9`,
        startTime: sample.start || '',
        endTime: sample.end || '',
        totalHours: hours,
        hourlyRate,
        dailyPay: hours * hourlyRate,
        isOff,
      });
    } else {
      result.push({
        employeeId,
        day: d,
        dateStr: `${d}/9`,
        startTime: '',
        endTime: '',
        totalHours: 0,
        hourlyRate,
        dailyPay: 0,
        isOff: false,
      });
    }
  }

  return result;
};

export const SalaryManager: React.FC<SalaryManagerProps> = ({
  employees,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear] = useState<number>(2026);
  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);

  const summaryTableRef = useRef<HTMLDivElement>(null);
  const detailTableRef = useRef<HTMLDivElement>(null);

  // Employee rates & base salaries state
  const [employeeRates, setEmployeeRates] = useState<Record<number, { hourly: number; base: number }>>({
    // Initial from Image 1: An: 40000, Quang: 35000, Hà: 35000, Linh: 30000, Hiền: 30000, Hòa: 30000, Đức: 40000 (base: 3000000)
    1: { hourly: 35000, base: 0 },       // Quang
    2: { hourly: 30000, base: 0 },       // Hiền
    3: { hourly: 40000, base: 0 },       // An (hoặc Ngọc Anh)
    4: { hourly: 30000, base: 0 },       // Linh (hoặc Minh Ánh)
    5: { hourly: 35000, base: 0 },       // Hà
    6: { hourly: 30000, base: 0 },       // Hòa
    7: { hourly: 40000, base: 3000000 }, // Đức
  });

  // Modal for editing employee rate & base salary
  const [editingRateEmp, setEditingRateEmp] = useState<{ id: number; name: string; hourly: number; base: number } | null>(null);

  // Store timesheet per employee: { [employeeId]: DailyTimesheet[] }
  const [timesheets, setTimesheets] = useState<Record<number, DailyTimesheet[]>>(() => {
    const init: Record<number, DailyTimesheet[]> = {};
    employees.forEach((emp) => {
      const rate = employeeRates[emp.id]?.hourly || 40000;
      init[emp.id] = generateInitialTimesheet(emp.id, rate);
    });
    return init;
  });

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Editing day modal
  const [editingDay, setEditingDay] = useState<DailyTimesheet | null>(null);
  const [modalStart, setModalStart] = useState('');
  const [modalEnd, setModalEnd] = useState('');
  const [modalHours, setModalHours] = useState<number>(0);
  const [modalIsOff, setModalIsOff] = useState(false);

  // Calculate hours automatically if possible
  const calculateAutoHours = (startStr: string, endStr: string): number => {
    const parseH = (s: string): number | null => {
      const clean = s.toLowerCase().trim().replace('h', ':');
      if (!clean) return null;
      if (clean === '00' || clean === '24') return 24;
      if (clean.includes(':')) {
        const parts = clean.split(':');
        const h = parseFloat(parts[0]) || 0;
        const m = parseFloat(parts[1]) || 0;
        return h + m / 60;
      }
      return parseFloat(clean) || null;
    };

    const s = parseH(startStr);
    const e = parseH(endStr);
    if (s === null || e === null) return 0;
    let diff = e - s;
    if (diff < 0) diff += 24; // qua đêm
    return Math.round(diff * 2) / 2; // làm tròn 0.5h
  };

  // Active timesheet
  const currentTimesheet = useMemo(() => {
    if (!activeEmployeeId) return [];
    if (!timesheets[activeEmployeeId]) {
      const rate = employeeRates[activeEmployeeId]?.hourly || 40000;
      return generateInitialTimesheet(activeEmployeeId, rate);
    }
    return timesheets[activeEmployeeId];
  }, [activeEmployeeId, timesheets, employeeRates]);

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId);

  // Total calculation for active employee
  const currentTotalHours = useMemo(() => {
    return currentTimesheet.reduce((sum, item) => sum + (item.isOff ? 0 : item.totalHours), 0);
  }, [currentTimesheet]);

  const currentTotalPay = useMemo(() => {
    return currentTimesheet.reduce((sum, item) => sum + (item.isOff ? 0 : item.dailyPay), 0);
  }, [currentTimesheet]);

  // Overall totals across all employees for Image 1
  const allEmployeesSalarySummary = useMemo(() => {
    return employees.map((emp) => {
      const rate = employeeRates[emp.id]?.hourly || 35000;
      const base = employeeRates[emp.id]?.base || 0;
      const ts = timesheets[emp.id] || [];
      const totalH = ts.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
      const totalSalary = totalH * rate + base;
      return {
        id: emp.id,
        name: emp.fullName,
        hourlyRate: rate,
        totalHours: totalH,
        baseSalary: base,
        totalSalary,
      };
    });
  }, [employees, employeeRates, timesheets]);

  const totalAllHours = allEmployeesSalarySummary.reduce((s, e) => s + e.totalHours, 0);
  const totalAllSalary = allEmployeesSalarySummary.reduce((s, e) => s + e.totalSalary, 0);

  // Handlers for edit day
  const handleOpenEditDay = (item: DailyTimesheet) => {
    setEditingDay(item);
    setModalStart(item.startTime);
    setModalEnd(item.endTime);
    setModalHours(item.totalHours);
    setModalIsOff(item.isOff);
  };

  const handleSaveDay = () => {
    if (!editingDay || !activeEmployeeId) return;
    const rate = employeeRates[activeEmployeeId]?.hourly || 40000;
    const hours = modalIsOff ? 0 : modalHours;
    const pay = modalIsOff ? 0 : hours * rate;

    setTimesheets((prev) => {
      const list = prev[activeEmployeeId] || [];
      const updated = list.map((d) =>
        d.day === editingDay.day
          ? {
              ...d,
              startTime: modalIsOff ? '' : modalStart,
              endTime: modalIsOff ? '' : modalEnd,
              totalHours: hours,
              dailyPay: pay,
              isOff: modalIsOff,
            }
          : d
      );
      return { ...prev, [activeEmployeeId]: updated };
    });

    setEditingDay(null);
    showToast(`Đã lưu ngày ${editingDay.day}/9 thành công!`);
  };

  // Screenshot handlers
  const handleDownload = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    await downloadScheduleImage(ref.current, name);
    showToast('Đã tải ảnh Ultra HD về máy! Gửi dạng File vào Zalo để không bị mờ.');
  };

  const handleCopy = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    await copyScheduleImageToClipboard(ref.current);
    showToast('📋 Đã copy ảnh! Khi dán vào Zalo hãy tích chọn [HD] để ảnh nét 100%.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-800 text-white px-5 py-3 rounded-xl shadow-2xl font-bold animate-in slide-in-from-top-3 text-sm">
          <Check className="w-5 h-5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar Navigation for Salary */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>Hệ Thống Tính Lương Nhà Hàng</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-300 focus:outline-hidden cursor-pointer"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Tháng {i + 1}/{selectedYear}
                  </option>
                ))}
              </select>
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {activeEmployeeId
                ? `Đang xem: Bảng chấm công chi tiết của [${activeEmployee?.fullName}]`
                : 'Bảng tổng hợp tiền lương toàn bộ nhân viên trong tháng'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeEmployeeId ? (
            <button
              onClick={() => setActiveEmployeeId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Bảng Lương Tổng</span>
            </button>
          ) : null}

          <button
            onClick={() =>
              activeEmployeeId
                ? handleCopy(detailTableRef)
                : handleCopy(summaryTableRef)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
          >
            <Copy className="w-4 h-4" />
            <span>📋 Copy Ảnh Gửi Zalo</span>
          </button>

          <button
            onClick={() =>
              activeEmployeeId
                ? handleDownload(
                    detailTableRef,
                    `Bang_Cham_Cong_${activeEmployee?.fullName}_Thang_${selectedMonth}.png`
                  )
                : handleDownload(summaryTableRef, `Bang_Luong_Tong_Thang_${selectedMonth}.png`)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Tải Ảnh Ultra HD</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: BẢNG TỔNG HỢP TIỀN LƯƠNG THÁNG (KHỚP 100% ẢNH 1 CỦA USER)        */}
      {/* ========================================================================= */}
      {!activeEmployeeId && (
        <div className="space-y-4">
          <div
            ref={summaryTableRef}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800"
          >
            {/* Top Sheet Tab "Tiền lương tháng 9 ∨ 🧮" */}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-[#245839] text-white px-3.5 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                <span>Tiền lương tháng {selectedMonth}</span>
                <span className="text-[10px] opacity-80">▼</span>
                <span>🧮</span>
              </div>
            </div>

            {/* Main Salary Summary Table */}
            <table className="w-full border-collapse border-2 border-gray-600 text-sm">
              <thead>
                <tr className="bg-[#245839] text-white font-extrabold select-none">
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[140px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tên</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[140px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Lương theo giờ</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[190px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tổng số giờ làm trong tháng</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[180px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tổng lương nhận tháng</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[140px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Lương cứng</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {allEmployeesSalarySummary.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setActiveEmployeeId(emp.id)}
                    className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                    title="Bấm để xem chi tiết chấm công 30 ngày của nhân viên này"
                  >
                    {/* Tên */}
                    <td className="border border-gray-500 py-3 px-4 text-center font-bold text-gray-900 bg-white">
                      <span>{emp.name}</span>
                    </td>

                    {/* Lương theo giờ */}
                    <td
                      className="border border-gray-500 py-3 px-4 text-center font-bold text-gray-800 hover:bg-emerald-100/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRateEmp({ id: emp.id, name: emp.name, hourly: emp.hourlyRate, base: emp.baseSalary });
                      }}
                      title="Bấm để sửa đơn giá giờ / lương cứng"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{emp.hourlyRate.toLocaleString('vi-VN')}</span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                      </div>
                    </td>

                    {/* Tổng số giờ làm trong tháng */}
                    <td className="border border-gray-500 py-3 px-4 text-center font-bold text-gray-900">
                      {emp.totalHours > 0 ? emp.totalHours : 0}
                    </td>

                    {/* Tổng lương nhận tháng */}
                    <td className="border border-gray-500 py-3 px-4 text-center font-extrabold text-emerald-800">
                      {emp.totalSalary.toLocaleString('vi-VN')}
                    </td>

                    {/* Lương cứng */}
                    <td
                      className="border border-gray-500 py-3 px-4 text-center font-bold text-gray-800 hover:bg-emerald-100/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRateEmp({ id: emp.id, name: emp.name, hourly: emp.hourlyRate, base: emp.baseSalary });
                      }}
                      title="Bấm để sửa đơn giá giờ / lương cứng"
                    >
                      {emp.baseSalary > 0 ? emp.baseSalary.toLocaleString('vi-VN') : ''}
                    </td>
                  </tr>
                ))}

                {/* Dòng Tổng (Khớp 100% hàng cuối ô đỏ Tổng trong Ảnh 1) */}
                <tr className="bg-white font-black text-sm">
                  {/* Ô đỏ Tổng */}
                  <td className="border border-gray-500 py-3 px-4 text-center bg-[#ff0000] text-white font-black text-base">
                    Tổng
                  </td>
                  <td className="border border-gray-500 py-3 px-4 text-center bg-white"></td>
                  <td className="border border-gray-500 py-3 px-4 text-center font-black text-gray-900">
                    {totalAllHours}
                  </td>
                  <td className="border border-gray-500 py-3 px-4 text-center font-black text-emerald-900 text-base">
                    {totalAllSalary.toLocaleString('vi-VN')}
                  </td>
                  <td className="border border-gray-500 py-3 px-4 text-center bg-white font-black text-gray-900">
                    {allEmployeesSalarySummary.reduce((s, e) => s + e.baseSalary, 0) > 0
                      ? allEmployeesSalarySummary
                          .reduce((s, e) => s + e.baseSalary, 0)
                          .toLocaleString('vi-VN')
                      : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center justify-between">
            <div>
              💡 <b>Mẹo quản lý:</b> Nhấp chuột trực tiếp vào hàng của nhân viên bất kỳ để mở <b>Bảng chấm công chi tiết 30 ngày</b> của nhân viên đó.
            </div>
            <div className="font-semibold text-emerald-800">Tang2Manager Payroll</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: BẢNG CHẤM CÔNG CHI TIẾT THEO NGÀY (KHỚP 100% ẢNH 2 CỦA USER)      */}
      {/* ========================================================================= */}
      {activeEmployeeId && activeEmployee && (
        <div className="space-y-4">
          <div
            ref={detailTableRef}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-lg font-black text-emerald-950 flex items-center gap-2">
                  <span>BẢNG CHẤM CÔNG CHI TIẾT — {activeEmployee.fullName.toUpperCase()}</span>
                  <span className="text-xs bg-cyan-100 text-cyan-900 px-2.5 py-0.5 rounded-full font-bold border border-cyan-300">
                    Tháng {selectedMonth}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Hệ số lương: <b>{(employeeRates[activeEmployee.id]?.hourly || 40000).toLocaleString('vi-VN')} đ/h</b>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-md border border-red-300">
                  🟥 Hàng đỏ: Ngày nghỉ
                </span>
                <span className="text-xs font-bold bg-cyan-100 text-cyan-900 px-2.5 py-1 rounded-md border border-cyan-300">
                  🟦 Tổng: {currentTotalHours} giờ = {currentTotalPay.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Table matching Image 2 with cyan header and lime date column */}
            <table className="w-full border-collapse border-2 border-gray-600 text-sm">
              <thead>
                {/* Cyan Header matching Image 2 */}
                <tr className="bg-[#00e5ff] text-black font-extrabold select-none">
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[70px]">
                    Ngày
                  </th>
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[90px]">
                    Bắt đầu
                  </th>
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[90px]">
                    Kết thúc
                  </th>
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[190px]">
                    Tổng giờ trong ngày (Tiếng)
                  </th>
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[120px]">
                    Hệ số lương
                  </th>
                  <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[130px]">
                    Tiền công ngày
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentTimesheet.map((item) => {
                  const isOff = item.isOff;
                  return (
                    <tr
                      key={item.day}
                      onClick={() => handleOpenEditDay(item)}
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      title="Bấm để chỉnh sửa giờ hoặc đánh dấu nghỉ"
                    >
                      {/* Cột Ngày: Xanh lá nhạt chuẩn như Ảnh 2 */}
                      <td className="border border-gray-600 py-1.5 px-2 text-center font-bold bg-[#a3e635]/50 text-gray-900">
                        {item.dateStr}
                      </td>

                      {/* Nếu Nghỉ (isOff): Các ô sau tô ĐỎ tươi #ff0000 như ảnh 2 */}
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
                          <td className="border border-gray-600 py-1.5 px-2 text-center font-bold text-gray-900 bg-white">
                            {item.hourlyRate}
                          </td>
                          <td className="border border-gray-600 py-1.5 px-2 text-center font-extrabold text-emerald-800 bg-white">
                            {item.dailyPay > 0 ? item.dailyPay : (item.startTime ? 0 : '')}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {/* Hàng Tổng cuối bảng (Khớp 100% hàng Tổng đỏ của Ảnh 2) */}
                <tr className="font-black text-sm">
                  {/* Ô đỏ Tổng ở cột 1 & 2 */}
                  <td
                    colSpan={3}
                    className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-black font-black text-base"
                  >
                    Tổng
                  </td>
                  <td className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-black font-black">
                    {String(currentTotalHours).replace('.', ',')}
                  </td>
                  <td className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000]"></td>
                  <td className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-black font-black text-base">
                    {currentTotalPay}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA CHẤM CÔNG NGÀY */}
      {editingDay && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingDay(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-3 flex items-center justify-between border-b pb-2">
              <span>Chấm công ngày {editingDay.dateStr}</span>
              <button onClick={() => setEditingDay(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              {/* Toggle Nghỉ */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                <div>
                  <div className="text-xs font-bold text-red-900">Nghỉ (Tô đỏ như ảnh)</div>
                  <div className="text-[11px] text-red-600">Ngày này không tính tiền công (0đ)</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalIsOff}
                    onChange={(e) => setModalIsOff(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {!modalIsOff && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu:</label>
                      <input
                        type="text"
                        value={modalStart}
                        onChange={(e) => {
                          setModalStart(e.target.value);
                          const calc = calculateAutoHours(e.target.value, modalEnd);
                          if (calc > 0) setModalHours(calc);
                        }}
                        placeholder="VD: 17h, 10h"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Giờ kết thúc:</label>
                      <input
                        type="text"
                        value={modalEnd}
                        onChange={(e) => {
                          setModalEnd(e.target.value);
                          const calc = calculateAutoHours(modalStart, e.target.value);
                          if (calc > 0) setModalHours(calc);
                        }}
                        placeholder="VD: 23h, 22h30, 00h"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tổng số tiếng làm việc:
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={modalHours}
                      onChange={(e) => setModalHours(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-black text-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  {/* Quick hints */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { s: '17h', e: '23h', h: 6 },
                      { s: '17h', e: '00h', h: 7 },
                      { s: '18h', e: '22h30', h: 4.5 },
                      { s: '10h', e: '22h30', h: 11.5 },
                      { s: '10h', e: '21h', h: 10 },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setModalStart(btn.s);
                          setModalEnd(btn.e);
                          setModalHours(btn.h);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 rounded-md text-[11px] font-bold text-slate-700"
                      >
                        {btn.s}-{btn.e} ({btn.h}h)
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleSaveDay}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  Lưu ngày làm
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA ĐƠN GIÁ LƯƠNG & LƯƠNG CỨNG */}
      {editingRateEmp && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingRateEmp(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-3 flex items-center justify-between border-b pb-2">
              <span>Cài đặt lương: {editingRateEmp.name}</span>
              <button onClick={() => setEditingRateEmp(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lương theo giờ (VNĐ/tiếng):
                </label>
                <input
                  type="number"
                  step="1000"
                  value={editingRateEmp.hourly}
                  onChange={(e) =>
                    setEditingRateEmp({
                      ...editingRateEmp,
                      hourly: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lương cứng cố định (VNĐ/tháng nếu có):
                </label>
                <input
                  type="number"
                  step="100000"
                  value={editingRateEmp.base}
                  onChange={(e) =>
                    setEditingRateEmp({
                      ...editingRateEmp,
                      base: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeRates((prev) => ({
                      ...prev,
                      [editingRateEmp.id]: {
                        hourly: editingRateEmp.hourly,
                        base: editingRateEmp.base,
                      },
                    }));
                    // update hourlyRate in existing timesheet
                    setTimesheets((prev) => {
                      const list = prev[editingRateEmp.id] || [];
                      const updated = list.map((d) => ({
                        ...d,
                        hourlyRate: editingRateEmp.hourly,
                        dailyPay: d.isOff ? 0 : d.totalHours * editingRateEmp.hourly,
                      }));
                      return { ...prev, [editingRateEmp.id]: updated };
                    });
                    setEditingRateEmp(null);
                    showToast(`Đã cập nhật mức lương cho ${editingRateEmp.name}!`);
                  }}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  Lưu mức lương
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRateEmp(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
