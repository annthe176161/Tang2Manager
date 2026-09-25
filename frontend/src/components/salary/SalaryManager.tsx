import React, { useState, useRef, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import type { Employee, DailyTimesheet, MonthlyPayrollRecord } from '../../types';
import { downloadScheduleImage, copyScheduleImageToClipboard, captureElementToBlob } from '../../utils/screenshot';
import { exportSalaryToExcel } from '../../utils/exportSalaryExcel';
import { salaryApi } from '../../services/api';
import { 
  Camera, 
  Copy, 
  Check, 
  DollarSign, 
  ArrowLeft,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Database,
  Archive,
  Loader2
} from 'lucide-react';

interface SalaryManagerProps {
  employees: Employee[];
}

// Initial mock daily timesheet matching user's Image 2 (for employee "An" in September 2026)
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

// Calculate accurate days in month (handling leap years like Feb 2028: 29 days, Feb 2027: 28 days)
const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

const createPeriodTimesheet = (
  employeeId: number,
  hourlyRate: number,
  month: number,
  year: number,
  withSample: boolean = false
): DailyTimesheet[] => {
  const daysInMonth = getDaysInMonth(month, year);
  const result: DailyTimesheet[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    if (withSample && image2Sample[d]) {
      const sample = image2Sample[d];
      const isOff = sample.isOff || false;
      const hours = sample.hours || 0;
      result.push({
        employeeId,
        day: d,
        dateStr: `${d}/${month}`,
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
        dateStr: `${d}/${month}`,
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

const getStorageKey = (year: number, month: number) => `tang2_salary_timesheets_${year}_${month}`;

export const SalaryManager: React.FC<SalaryManagerProps> = ({
  employees,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem('tang2_salary_selected_month');
    return saved ? Number(saved) : 9;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('tang2_salary_selected_year');
    return saved ? Number(saved) : 2026;
  });
  const [activeEmployeeId, setActiveEmployeeId] = useState<number | null>(null);
  const [isDbSynced, setIsDbSynced] = useState<boolean>(true);

  const summaryTableRef = useRef<HTMLDivElement>(null);
  const detailTableRef = useRef<HTMLDivElement>(null);

  // ZIP export states and offscreen refs
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [zipTargetEmployee, setZipTargetEmployee] = useState<Employee | null>(null);
  const offscreenSummaryRef = useRef<HTMLDivElement>(null);
  const offscreenSlipRef = useRef<HTMLDivElement>(null);

  // Employee rates & base salaries state initialized from localStorage or employees
  const [employeeRates, setEmployeeRates] = useState<Record<number, { hourly: number; base: number }>>(() => {
    try {
      const saved = localStorage.getItem('tang2_salary_employee_rates');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    const rates: Record<number, { hourly: number; base: number }> = {};
    employees.forEach((emp) => {
      rates[emp.id] = {
        hourly: emp.hourlyRate || 35000,
        base: emp.baseSalary || 0,
      };
    });
    return rates;
  });

  // Employee debts / advances per period
  const [employeeDebts, setEmployeeDebts] = useState<Record<number, { amount: number; note: string }>>(() => {
    try {
      const saved = localStorage.getItem(`tang2_salary_debts_${selectedYear}_${selectedMonth}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  // Modal for editing employee rate, base salary & debt
  const [editingRateEmp, setEditingRateEmp] = useState<{
    id: number;
    name: string;
    hourly: number;
    base: number;
    debt: number;
    debtNote: string;
  } | null>(null);

  // Modal for confirming clear data
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Helper to load timesheets for a given month & year
  const loadTimesheetsForPeriod = (
    month: number,
    year: number,
    currentEmployees: Employee[],
    rates: Record<number, { hourly: number; base: number }>
  ): Record<number, DailyTimesheet[]> => {
    const daysInMonth = getDaysInMonth(month, year);
    const key = getStorageKey(year, month);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure every employee has an entry and length matches daysInMonth
        currentEmployees.forEach((emp) => {
          if (!parsed[emp.id] || parsed[emp.id].length !== daysInMonth) {
            const rate = rates[emp.id]?.hourly || emp.hourlyRate || 35000;
            parsed[emp.id] = createPeriodTimesheet(emp.id, rate, month, year, false);
          }
        });
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    const init: Record<number, DailyTimesheet[]> = {};
    currentEmployees.forEach((emp, index) => {
      const rate = rates[emp.id]?.hourly || emp.hourlyRate || 35000;
      const withSample = month === 9 && year === 2026 && (emp.fullName.toLowerCase().includes('an') || index === 0);
      init[emp.id] = createPeriodTimesheet(emp.id, rate, month, year, withSample);
    });
    return init;
  };

  // Store timesheet per employee: { [employeeId]: DailyTimesheet[] }
  const [timesheets, setTimesheets] = useState<Record<number, DailyTimesheet[]>>(() => {
    return loadTimesheetsForPeriod(selectedMonth, selectedYear, employees, employeeRates);
  });

  // Save to SQL Server Database & local cache
  const persistToDb = async (
    ts: Record<number, DailyTimesheet[]>,
    rates: Record<number, { hourly: number; base: number }>,
    debts: Record<number, { amount: number; note: string }>
  ) => {
    const requests = employees.map((emp) => {
      const rate = rates[emp.id]?.hourly || emp.hourlyRate || 35000;
      const base = rates[emp.id]?.base || 0;
      const debt = debts[emp.id]?.amount || 0;
      const note = debts[emp.id]?.note || '';
      const list = ts[emp.id] || [];
      const totalH = list.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
      const totalSalary = totalH * rate + base - debt;

      return {
        employeeId: emp.id,
        year: selectedYear,
        month: selectedMonth,
        hourlyRate: rate,
        baseSalary: base,
        debtAmount: debt,
        debtNote: note,
        totalHours: totalH,
        totalSalary,
        timesheetDetailsJson: JSON.stringify(list),
      };
    });

    try {
      await salaryApi.savePayroll(requests);
      setIsDbSynced(true);
    } catch (e) {
      console.error('Failed to sync to database:', e);
      setIsDbSynced(false);
    }
  };

  // Save timesheets state & localStorage helper
  const saveTimesheets = (updated: Record<number, DailyTimesheet[]>) => {
    setTimesheets(updated);
    try {
      const key = getStorageKey(selectedYear, selectedMonth);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    persistToDb(updated, employeeRates, employeeDebts);
  };

  // Load from SQL Server Database when month/year changes
  const loadFromDatabase = async (m: number, y: number) => {
    try {
      const dbRecords = await salaryApi.getPayroll(m, y);
      if (dbRecords && Array.isArray(dbRecords) && dbRecords.length > 0) {
        const newRates: Record<number, { hourly: number; base: number }> = {};
        const newDebts: Record<number, { amount: number; note: string }> = {};
        const newTimesheets: Record<number, DailyTimesheet[]> = {};

        dbRecords.forEach((rec: MonthlyPayrollRecord) => {
          newRates[rec.employeeId] = {
            hourly: rec.hourlyRate,
            base: rec.baseSalary,
          };
          newDebts[rec.employeeId] = {
            amount: rec.debtAmount || 0,
            note: rec.debtNote || '',
          };

          if (rec.timesheetDetailsJson) {
            try {
              const parsed = JSON.parse(rec.timesheetDetailsJson);
              if (Array.isArray(parsed) && parsed.length === getDaysInMonth(m, y)) {
                newTimesheets[rec.employeeId] = parsed;
              }
            } catch (err) {
              console.error(err);
            }
          }
        });

        setEmployeeRates((prev) => ({ ...prev, ...newRates }));
        setEmployeeDebts((prev) => ({ ...prev, ...newDebts }));
        if (Object.keys(newTimesheets).length > 0) {
          setTimesheets((prev) => {
            const merged = { ...prev };
            Object.keys(newTimesheets).forEach((k) => {
              const id = Number(k);
              merged[id] = newTimesheets[id];
            });
            return merged;
          });
        }
        setIsDbSynced(true);
      }
    } catch (err) {
      console.warn('Backend DB not reachable, using local data:', err);
      setIsDbSynced(false);
    }
  };

  // When selectedMonth or selectedYear changes, switch data
  useEffect(() => {
    try {
      localStorage.setItem('tang2_salary_selected_month', String(selectedMonth));
      localStorage.setItem('tang2_salary_selected_year', String(selectedYear));
    } catch (e) {
      console.error(e);
    }
    setTimesheets(loadTimesheetsForPeriod(selectedMonth, selectedYear, employees, employeeRates));
    loadFromDatabase(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // Save rates to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('tang2_salary_employee_rates', JSON.stringify(employeeRates));
    } catch (e) {
      console.error(e);
    }
  }, [employeeRates]);

  // Sync if employees list changes
  useEffect(() => {
    setEmployeeRates((prev) => {
      const updated = { ...prev };
      employees.forEach((emp) => {
        if (!updated[emp.id]) {
          updated[emp.id] = {
            hourly: emp.hourlyRate || 35000,
            base: emp.baseSalary || 0,
          };
        }
      });
      return updated;
    });

    setTimesheets((prev) => {
      const daysCount = getDaysInMonth(selectedMonth, selectedYear);
      let changed = false;
      const updated = { ...prev };
      employees.forEach((emp) => {
        if (!updated[emp.id] || updated[emp.id].length !== daysCount) {
          const rate = emp.hourlyRate || 35000;
          updated[emp.id] = createPeriodTimesheet(emp.id, rate, selectedMonth, selectedYear, false);
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(getStorageKey(selectedYear, selectedMonth), JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      }
      return updated;
    });
  }, [employees, selectedMonth, selectedYear]);

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

  const yearsList = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  // Active timesheet
  const currentTimesheet = useMemo(() => {
    if (!activeEmployeeId) return [];
    if (!timesheets[activeEmployeeId]) {
      const rate = employeeRates[activeEmployeeId]?.hourly || 40000;
      return createPeriodTimesheet(activeEmployeeId, rate, selectedMonth, selectedYear, false);
    }
    return timesheets[activeEmployeeId];
  }, [activeEmployeeId, timesheets, employeeRates, selectedMonth, selectedYear]);

  const activeEmployee = employees.find((e) => e.id === activeEmployeeId);

  // Total calculation for active employee
  const currentTotalHours = useMemo(() => {
    return currentTimesheet.reduce((sum, item) => sum + (item.isOff ? 0 : item.totalHours), 0);
  }, [currentTimesheet]);

  const currentTotalPay = useMemo(() => {
    return currentTimesheet.reduce((sum, item) => sum + (item.isOff ? 0 : item.dailyPay), 0);
  }, [currentTimesheet]);

  // Overall totals across all employees including debt
  const allEmployeesSalarySummary = useMemo(() => {
    return employees.map((emp) => {
      const rate = employeeRates[emp.id]?.hourly || 35000;
      const base = employeeRates[emp.id]?.base || 0;
      const debt = employeeDebts[emp.id]?.amount || 0;
      const debtNote = employeeDebts[emp.id]?.note || '';
      const ts = timesheets[emp.id] || [];
      const totalH = ts.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
      const hoursPay = totalH * rate;
      const totalSalary = hoursPay + base - debt;
      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.role || 'Nhân viên',
        hourlyRate: rate,
        totalHours: totalH,
        hoursPay,
        baseSalary: base,
        debtAmount: debt,
        debtNote,
        totalSalary,
      };
    });
  }, [employees, employeeRates, timesheets, employeeDebts]);

  const totalAllHours = allEmployeesSalarySummary.reduce((s, e) => s + e.totalHours, 0);
  const totalAllHoursPay = allEmployeesSalarySummary.reduce((s, e) => s + e.hoursPay, 0);
  const totalAllBaseSalary = allEmployeesSalarySummary.reduce((s, e) => s + e.baseSalary, 0);
  const totalAllDebt = allEmployeesSalarySummary.reduce((s, e) => s + e.debtAmount, 0);
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

    const list = timesheets[activeEmployeeId] || [];
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
    saveTimesheets({ ...timesheets, [activeEmployeeId]: updated });

    setEditingDay(null);
    showToast(`Đã lưu ngày ${editingDay.day}/${selectedMonth} vào Database thành công!`);
  };

  // Clear / Reset Timesheet Data
  const handleClearData = async () => {
    try {
      await salaryApi.clearPayroll(selectedYear, selectedMonth, activeEmployeeId || undefined);
    } catch (e) {
      console.error('Failed to clear in database:', e);
    }

    if (activeEmployeeId) {
      const rate = employeeRates[activeEmployeeId]?.hourly || 35000;
      const empty = createPeriodTimesheet(activeEmployeeId, rate, selectedMonth, selectedYear, false);
      saveTimesheets({
        ...timesheets,
        [activeEmployeeId]: empty,
      });
      showToast(`Đã xóa sạch giờ làm của ${activeEmployee?.fullName} Tháng ${selectedMonth}/${selectedYear} trong Database!`);
    } else {
      const updated: Record<number, DailyTimesheet[]> = {};
      employees.forEach((emp) => {
        const rate = employeeRates[emp.id]?.hourly || 35000;
        updated[emp.id] = createPeriodTimesheet(emp.id, rate, selectedMonth, selectedYear, false);
      });
      saveTimesheets(updated);
      showToast(`Đã xóa sạch dữ liệu chấm công toàn bộ nhân viên Tháng ${selectedMonth}/${selectedYear} trong Database!`);
    }
    setShowClearModal(false);
  };

  // Export Excel handler for boss
  const handleExportExcel = () => {
    exportSalaryToExcel(
      selectedMonth,
      selectedYear,
      allEmployeesSalarySummary,
      timesheets,
      employees
    );
    showToast(`Đã xuất file Excel bảng lương Tháng ${selectedMonth}/${selectedYear} gửi sếp thành công!`);
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

  // Tải tất cả ảnh hóa đơn tính lương nhân viên & bảng tổng hợp vào 1 file ZIP gửi sếp
  const handleExportAllSalaryImagesZip = async () => {
    if (isExportingZip) return;
    setIsExportingZip(true);
    setZipProgress({ current: 0, total: employees.length + 1, name: 'Bắt đầu khởi tạo...' });

    try {
      const zip = new JSZip();

      // 1. Chụp Bảng Tổng Hợp Tiền Lương
      setZipProgress({ current: 0, total: employees.length + 1, name: 'Bảng Tổng Hợp Tiền Lương' });
      await new Promise((r) => setTimeout(r, 80));

      const summaryEl = offscreenSummaryRef.current || summaryTableRef.current;
      if (summaryEl) {
        const summaryBlob = await captureElementToBlob(summaryEl, 2.5);
        if (summaryBlob) {
          zip.file(`00_Bang_Tong_Hop_Luong_Thang_${selectedMonth}_${selectedYear}.png`, summaryBlob);
        }
      }

      // 2. Chụp chi tiết phiếu chấm công của từng nhân viên
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        setZipProgress({
          current: i + 1,
          total: employees.length + 1,
          name: `Phiếu lương [${emp.fullName}]`,
        });
        setZipTargetEmployee(emp);

        // Chờ React render phiếu của nhân viên này vào offscreen container
        await new Promise((r) => setTimeout(r, 100));

        if (offscreenSlipRef.current) {
          const slipBlob = await captureElementToBlob(offscreenSlipRef.current, 2.5);
          if (slipBlob) {
            const idxStr = String(i + 1).padStart(2, '0');
            const safeName = emp.fullName.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
            zip.file(
              `${idxStr}_Phieu_Luong_${safeName}_Thang_${selectedMonth}_${selectedYear}.png`,
              slipBlob
            );
          }
        }
      }

      // 3. Nén file ZIP
      setZipProgress({
        current: employees.length + 1,
        total: employees.length + 1,
        name: 'Đang nén toàn bộ ảnh vào file ZIP...',
      });
      const zipContent = await zip.generateAsync({ type: 'blob' });

      // 4. Tải file về máy
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tron_Bo_Anh_Bang_Luong_Nha_Hang_Tang2_Thang_${selectedMonth}_${selectedYear}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`📦 Đã tải trọn bộ ${employees.length + 1} ảnh bảng lương (.ZIP) gửi sếp thành công!`);
    } catch (err) {
      console.error('Lỗi khi nén file ZIP ảnh bảng lương:', err);
      showToast('⚠️ Có lỗi khi tạo file ZIP, vui lòng thử lại.');
    } finally {
      setIsExportingZip(false);
      setZipProgress(null);
      setZipTargetEmployee(null);
    }
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tier 1: Header & Period Selector */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Tính Lương Nhà Hàng
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <Database className={`w-3.5 h-3.5 ${isDbSynced ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>{isDbSynced ? 'Đã lưu SQL Server' : 'Đang đồng bộ...'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeEmployeeId
                  ? `Đang xem: Bảng chấm công chi tiết của [${activeEmployee?.fullName}]`
                  : `Bảng tổng hợp tiền lương tháng ${selectedMonth}/${selectedYear} (${employees.length} nhân sự)`}
              </p>
            </div>
          </div>

          {/* Period Selector (Kỳ lương) */}
          <div className="inline-flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
            <span className="text-xs font-bold text-slate-600 pl-2">Kỳ lương:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
            <span className="text-slate-300 font-bold">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 2: Action Controls & Quick Summary */}
        <div className="px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            {activeEmployeeId ? (
              <button
                onClick={() => setActiveEmployeeId(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Quay lại Bảng Lương Tổng</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium flex-wrap">
                <span className="font-bold text-slate-700">Tổng thực trả:</span>
                <span className="text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {totalAllSalary.toLocaleString('vi-VN')} đ
                </span>
                {totalAllDebt > 0 && (
                  <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Đã trừ công nợ: {totalAllDebt.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Unified, Clean, Professional */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Xuất Excel gửi sếp */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99]"
              title="Xuất bảng lương tổng hợp và chấm công chi tiết ra file Excel (.xlsx) gửi sếp"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Xuất Excel gửi sếp</span>
            </button>

            {/* Copy ảnh Zalo */}
            <button
              onClick={() =>
                activeEmployeeId
                  ? handleCopy(detailTableRef)
                  : handleCopy(summaryTableRef)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition"
              title="Copy ảnh bảng lương gửi qua Zalo"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Copy Ảnh</span>
            </button>

            {/* Tải ảnh HD */}
            <button
              onClick={() =>
                activeEmployeeId
                  ? handleDownload(
                      detailTableRef,
                      `Bang_Cham_Cong_${activeEmployee?.fullName}_Thang_${selectedMonth}_${selectedYear}.png`
                    )
                  : handleDownload(summaryTableRef, `Bang_Luong_Tong_Thang_${selectedMonth}_${selectedYear}.png`)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition"
              title="Tải ảnh sắc nét Ultra HD về máy"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải Ảnh HD</span>
            </button>

            {/* Tải tất cả ảnh vào 1 file ZIP gửi sếp */}
            <button
              onClick={handleExportAllSalaryImagesZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              title="Tải trọn bộ ảnh bảng lương tổng & phiếu chấm công tất cả nhân viên nén trong 1 file ZIP gửi sếp"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-amber-100" />
              )}
              <span>{isExportingZip ? 'Đang Nén ZIP...' : 'Tải Tất Cả Ảnh (.ZIP)'}</span>
            </button>

            {/* Xóa / Làm sạch dữ liệu */}
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition"
              title={activeEmployeeId ? 'Xóa giờ làm nhân viên này về 0' : 'Làm sạch giờ làm tháng này để bắt đầu tháng mới'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{activeEmployeeId ? 'Xóa Giờ' : 'Làm Sạch Tháng'}</span>
            </button>
          </div>
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
                <span>Tiền lương tháng {selectedMonth}/{selectedYear}</span>
                <span className="text-[10px] opacity-80">▼</span>
                <span>🧮</span>
              </div>
            </div>

            {/* Main Salary Summary Table */}
            <table className="w-full border-collapse border-2 border-gray-600 text-sm">
              <thead>
                <tr className="bg-[#245839] text-white font-extrabold select-none">
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[120px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tên</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-2 text-center min-w-[90px]">
                    <span>Bộ phận</span>
                  </th>
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[120px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Lương/giờ</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tổng giờ</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Thành tiền giờ</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[120px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Lương cứng</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-3 text-center min-w-[140px] bg-rose-900/30">
                    <div className="flex items-center justify-center gap-1.5 text-amber-200">
                      <span>Công nợ / Ứng</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[170px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Tổng lương thực lĩnh</span>
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
                    title={`Bấm để xem chi tiết chấm công ${daysInMonth} ngày của nhân viên này`}
                  >
                    {/* Tên */}
                    <td className="border border-gray-500 py-3 px-3 text-center font-bold text-gray-900 bg-white">
                      <span>{emp.name}</span>
                    </td>

                    {/* Bộ phận */}
                    <td className="border border-gray-500 py-3 px-2 text-center bg-white">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${emp.role === 'Bếp' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Lương theo giờ */}
                    <td
                      className="border border-gray-500 py-3 px-3 text-center font-bold text-gray-800 hover:bg-emerald-100/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRateEmp({
                          id: emp.id,
                          name: emp.name,
                          hourly: emp.hourlyRate,
                          base: emp.baseSalary,
                          debt: emp.debtAmount,
                          debtNote: emp.debtNote || '',
                        });
                      }}
                      title="Bấm để sửa đơn giá giờ / lương cứng / công nợ"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{emp.hourlyRate.toLocaleString('vi-VN')}</span>
                        <Edit2 className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                      </div>
                    </td>

                    {/* Tổng số giờ làm trong tháng */}
                    <td className="border border-gray-500 py-3 px-3 text-center font-bold text-gray-900">
                      {emp.totalHours > 0 ? emp.totalHours : 0}
                    </td>

                    {/* Thành tiền giờ làm */}
                    <td className="border border-gray-500 py-3 px-3 text-center font-bold text-slate-800">
                      {emp.hoursPay.toLocaleString('vi-VN')}
                    </td>

                    {/* Lương cứng */}
                    <td
                      className="border border-gray-500 py-3 px-3 text-center font-bold text-gray-800 hover:bg-emerald-100/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRateEmp({
                          id: emp.id,
                          name: emp.name,
                          hourly: emp.hourlyRate,
                          base: emp.baseSalary,
                          debt: emp.debtAmount,
                          debtNote: emp.debtNote || '',
                        });
                      }}
                      title="Bấm để sửa lương cứng / công nợ"
                    >
                      {emp.baseSalary > 0 ? emp.baseSalary.toLocaleString('vi-VN') : ''}
                    </td>

                    {/* Cột Công nợ / Tạm ứng */}
                    <td
                      className="border border-gray-500 py-3 px-3 text-center font-bold hover:bg-rose-100/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRateEmp({
                          id: emp.id,
                          name: emp.name,
                          hourly: emp.hourlyRate,
                          base: emp.baseSalary,
                          debt: emp.debtAmount,
                          debtNote: emp.debtNote || '',
                        });
                      }}
                      title="Bấm để sửa công nợ / tạm ứng"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center gap-1">
                          {emp.debtAmount > 0 ? (
                            <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-xs">
                              -{emp.debtAmount.toLocaleString('vi-VN')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">0</span>
                          )}
                          <Edit2 className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                        </div>
                        {emp.debtNote ? (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px] mt-0.5" title={emp.debtNote}>
                            ({emp.debtNote})
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Tổng lương nhận tháng */}
                    <td className="border border-gray-500 py-3 px-4 text-center font-extrabold text-emerald-800 bg-emerald-50/50">
                      {emp.totalSalary.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}

                {/* Dòng Tổng (Khớp 100% hàng cuối ô đỏ Tổng trong Ảnh 1) */}
                <tr className="bg-white font-black text-sm">
                  {/* Ô đỏ Tổng */}
                  <td colSpan={2} className="border border-gray-500 py-3 px-4 text-center bg-[#ff0000] text-white font-black text-base">
                    Tổng
                  </td>
                  <td className="border border-gray-500 py-3 px-2 text-center bg-white"></td>
                  <td className="border border-gray-500 py-3 px-3 text-center font-black text-gray-900">
                    {totalAllHours}
                  </td>
                  <td className="border border-gray-500 py-3 px-3 text-center font-black text-slate-800">
                    {totalAllHoursPay.toLocaleString('vi-VN')}
                  </td>
                  <td className="border border-gray-500 py-3 px-3 text-center font-black text-slate-800">
                    {totalAllBaseSalary > 0 ? totalAllBaseSalary.toLocaleString('vi-VN') : ''}
                  </td>
                  <td className="border border-gray-500 py-3 px-3 text-center font-black text-rose-700">
                    {totalAllDebt > 0 ? `-${totalAllDebt.toLocaleString('vi-VN')}` : '0'}
                  </td>
                  <td className="border border-gray-500 py-3 px-4 text-center font-black text-emerald-950 text-base bg-emerald-100/70">
                    {totalAllSalary.toLocaleString('vi-VN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center justify-between">
            <div>
              💡 <b>Mẹo quản lý:</b> Nhấp chuột trực tiếp vào hàng của nhân viên bất kỳ để mở <b>Bảng chấm công chi tiết {daysInMonth} ngày</b> của nhân viên đó.
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
                    Tháng {selectedMonth}/{selectedYear}
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

      {/* MODAL: CHỈNH SỬA ĐƠN GIÁ LƯƠNG, LƯƠNG CỨNG & CÔNG NỢ */}
      {editingRateEmp && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingRateEmp(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-3 flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-1.5">
                <span>Cài đặt lương & công nợ:</span>
                <span className="text-emerald-700 underline">{editingRateEmp.name}</span>
              </span>
              <button onClick={() => setEditingRateEmp(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </h3>

            <div className="space-y-3.5">
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

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-rose-900">
                    Công nợ / Tạm ứng trong tháng (VNĐ):
                  </label>
                  <span className="text-[11px] text-rose-600 font-semibold">(Trừ vào tổng lương)</span>
                </div>
                <input
                  type="number"
                  step="50000"
                  value={editingRateEmp.debt}
                  onChange={(e) =>
                    setEditingRateEmp({
                      ...editingRateEmp,
                      debt: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-rose-300 font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-white"
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Lý do / Ghi chú công nợ:
                  </label>
                  <input
                    type="text"
                    value={editingRateEmp.debtNote}
                    onChange={(e) =>
                      setEditingRateEmp({
                        ...editingRateEmp,
                        debtNote: e.target.value,
                      })
                    }
                    placeholder="VD: Ứng lương ngày 15/9, phạt rơi vỡ..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    const newRates = {
                      ...employeeRates,
                      [editingRateEmp.id]: {
                        hourly: editingRateEmp.hourly,
                        base: editingRateEmp.base,
                      },
                    };
                    const newDebts = {
                      ...employeeDebts,
                      [editingRateEmp.id]: {
                        amount: editingRateEmp.debt,
                        note: editingRateEmp.debtNote,
                      },
                    };
                    setEmployeeRates(newRates);
                    setEmployeeDebts(newDebts);
                    try {
                      localStorage.setItem(`tang2_salary_debts_${selectedYear}_${selectedMonth}`, JSON.stringify(newDebts));
                    } catch (e) {
                      console.error(e);
                    }

                    // update hourlyRate in existing timesheet
                    const list = timesheets[editingRateEmp.id] || [];
                    const updatedTimesheet = list.map((d) => ({
                      ...d,
                      hourlyRate: editingRateEmp.hourly,
                      dailyPay: d.isOff ? 0 : d.totalHours * editingRateEmp.hourly,
                    }));
                    const updatedAllTimesheets = { ...timesheets, [editingRateEmp.id]: updatedTimesheet };
                    setTimesheets(updatedAllTimesheets);

                    persistToDb(updatedAllTimesheets, newRates, newDebts);
                    setEditingRateEmp(null);
                    showToast(`Đã lưu lương & công nợ cho ${editingRateEmp.name} vào Database!`);
                  }}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  Lưu cài đặt
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

      {/* MODAL: XÁC NHẬN XÓA DỮ LIỆU CHẤM CÔNG */}
      {showClearModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {activeEmployeeId ? 'Xóa Giờ Làm Nhân Viên' : 'Xóa Dữ Liệu Chấm Công Tháng'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Kỳ lương: Tháng {selectedMonth}/{selectedYear}
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-5 text-xs font-medium text-rose-900 leading-relaxed space-y-2">
              {activeEmployeeId ? (
                <div>
                  Bạn có chắc chắn muốn xóa toàn bộ giờ làm & ngày công của nhân viên{' '}
                  <strong className="font-bold underline">{activeEmployee?.fullName}</strong> trong{' '}
                  <strong>Tháng {selectedMonth}/{selectedYear}</strong> về 0?
                  <div className="text-[11px] text-rose-700 mt-1.5 font-semibold">
                    ✓ Mức lương theo giờ ({(employeeRates[activeEmployeeId]?.hourly || 35000).toLocaleString('vi-VN')} đ/h) vẫn được giữ nguyên.
                  </div>
                </div>
              ) : (
                <div>
                  Bạn có chắc chắn muốn xóa toàn bộ giờ làm & ngày công của{' '}
                  <strong className="font-bold underline">TẤT CẢ NHÂN VIÊN</strong> trong{' '}
                  <strong>Tháng {selectedMonth}/{selectedYear}</strong> về 0?
                  <div className="text-[11px] text-rose-700 mt-1.5 font-semibold">
                    ✓ Thao tác này giúp bạn làm sạch bảng công để bắt đầu nhập tháng mới. Đơn giá lương/giờ của từng nhân viên vẫn được giữ nguyên.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIẾN ĐỘ XUẤT ZIP */}
      {isExportingZip && zipProgress && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Archive className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Đang Tạo Trọn Bộ Ảnh (.ZIP)</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {zipProgress.name} ({zipProgress.current}/{zipProgress.total})
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(5, Math.round((zipProgress.current / zipProgress.total) * 100))}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400">
              Đang tự động chụp Ultra HD bảng tổng hợp & từng phiếu lương nhân viên gửi sếp...
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFSCREEN CONTAINER FOR ZIP EXPORT (ALWAYS IN DOM, RENDERED OFF-SCREEN)   */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1050px',
          zIndex: -9999,
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
        }}
      >
        {/* 1. Offscreen Summary Table */}
        <div
          ref={offscreenSummaryRef}
          className="bg-white p-6 rounded-2xl border border-slate-300 select-none text-slate-800"
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
                <th className="border border-gray-500 py-2 px-3 text-center w-28 bg-rose-900">Công nợ / Ứng</th>
                <th className="border border-gray-500 py-2 px-3 text-center w-32 bg-emerald-900">Thực nhận</th>
                <th className="border border-gray-500 py-2 px-3 text-center w-24">Ký nhận</th>
              </tr>
            </thead>
            <tbody>
              {allEmployeesSalarySummary.map((emp, idx) => (
                <tr key={emp.id} className="border-b border-gray-300">
                  <td className="border border-gray-400 py-2 px-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-gray-400 py-2 px-3 text-left font-black text-gray-900">{emp.name}</td>
                  <td className="border border-gray-400 py-2 px-2 text-center text-slate-600 font-semibold">{emp.role}</td>
                  <td className="border border-gray-400 py-2 px-2 text-center font-bold">{emp.hourlyRate.toLocaleString('vi-VN')}</td>
                  <td className="border border-gray-400 py-2 px-2 text-center font-black">{emp.totalHours > 0 ? String(emp.totalHours).replace('.', ',') : '0'}</td>
                  <td className="border border-gray-400 py-2 px-3 text-center font-bold text-gray-900">{emp.hoursPay > 0 ? emp.hoursPay.toLocaleString('vi-VN') : '0'}</td>
                  <td className="border border-gray-400 py-2 px-3 text-center font-bold text-gray-900">{emp.baseSalary > 0 ? emp.baseSalary.toLocaleString('vi-VN') : '-'}</td>
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

        {/* 2. Offscreen Employee Timesheet Slip */}
        {zipTargetEmployee && (() => {
          const emp = zipTargetEmployee;
          const ts = timesheets[emp.id] || createPeriodTimesheet(emp.id, employeeRates[emp.id]?.hourly || 35000, selectedMonth, selectedYear, false);
          const rate = employeeRates[emp.id]?.hourly || emp.hourlyRate || 35000;
          const base = employeeRates[emp.id]?.base || 0;
          const debt = employeeDebts[emp.id]?.amount || 0;
          const debtNote = employeeDebts[emp.id]?.note || '';
          const totalH = ts.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
          const hoursPay = totalH * rate;
          const totalSalary = hoursPay + base - debt;

          return (
            <div
              ref={offscreenSlipRef}
              className="bg-white p-6 rounded-2xl border border-slate-300 select-none text-slate-800 mt-6"
            >
              {/* Header info */}
              <div className="flex justify-between items-start pb-3 mb-3 border-b-2 border-emerald-800">
                <div>
                  <div className="bg-[#245839] text-white px-3 py-1 text-xs font-bold rounded-md inline-block mb-1.5">
                    NHÀ HÀNG TẦNG 2 — PHIẾU CHẤM CÔNG & LƯƠNG CHI TIẾT
                  </div>
                  <h3 className="text-xl font-black text-emerald-950 uppercase tracking-tight">
                    {emp.fullName} ({emp.role || 'Nhân viên'})
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Kỳ lương: Tháng {selectedMonth}/{selectedYear} | Đơn giá: <b>{rate.toLocaleString('vi-VN')} đ/h</b>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs font-bold text-slate-600">
                    Tổng giờ làm: <b className="text-slate-900">{String(totalH).replace('.', ',')} giờ</b>
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    Lương giờ: <b className="text-slate-900">{hoursPay.toLocaleString('vi-VN')} đ</b>
                  </div>
                  {base > 0 && (
                    <div className="text-xs font-bold text-slate-600">
                      Lương cứng: <b className="text-slate-900">+{base.toLocaleString('vi-VN')} đ</b>
                    </div>
                  )}
                  {debt > 0 && (
                    <div className="text-xs font-bold text-rose-600">
                      Công nợ / Ứng: <b>-{debt.toLocaleString('vi-VN')} đ</b> {debtNote ? `(${debtNote})` : ''}
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
                  {ts.map((item) => {
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
        })()}
      </div>
    </div>
  );
};
