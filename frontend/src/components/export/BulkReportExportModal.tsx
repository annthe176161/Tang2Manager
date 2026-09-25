import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import type { Employee, DailyTimesheet, InvoiceCategory, InvoiceItem } from '../../types';
import { employeeApi, invoiceApi } from '../../services/api';
import { captureElementToBlob } from '../../utils/screenshot';
import { SalarySummaryTableView, type SalarySummaryItem } from '../salary/SalarySummaryTableView';
import { SalarySlipTableView } from '../salary/SalarySlipTableView';
import { InvoiceSummaryView } from '../invoice/InvoiceSummaryView';
import { InvoiceDetailView } from '../invoice/InvoiceDetailView';
import {
  Archive,
  CheckCircle2,
  X,
  Sparkles,
  DollarSign,
  Receipt,
  Download,
  FolderArchive,
} from 'lucide-react';

export interface BulkReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: number;
  selectedYear: number;
  initialScope?: 'all' | 'salary' | 'invoice';
  // Optional preloaded data
  employees?: Employee[];
  timesheets?: Record<number, DailyTimesheet[]>;
  employeeRates?: Record<number, { hourly: number; base: number }>;
  employeeDebts?: Record<number, { amount: number; note: string }>;
  categories?: InvoiceCategory[];
  categoryItems?: Record<number, InvoiceItem[]>;
}

const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

export const BulkReportExportModal: React.FC<BulkReportExportModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  initialScope = 'all',
  employees: propEmployees,
  timesheets: propTimesheets,
  employeeRates: propRates,
  employeeDebts: propDebts,
  categories: propCategories,
  categoryItems: propCategoryItems,
}) => {
  const [scope, setScope] = useState<'all' | 'salary' | 'invoice'>(initialScope);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [totalFilesExported, setTotalFilesExported] = useState(0);

  // Cycling targets for offscreen capturing
  const [targetEmployee, setTargetEmployee] = useState<Employee | null>(null);
  const [targetCategory, setTargetCategory] = useState<InvoiceCategory | null>(null);
  const [targetCategoryItems, setTargetCategoryItems] = useState<InvoiceItem[]>([]);

  // Internal resolved data
  const [allEmployees, setAllEmployees] = useState<Employee[]>(propEmployees || []);
  const [allTimesheets, setAllTimesheets] = useState<Record<number, DailyTimesheet[]>>(propTimesheets || {});
  const [allRates, setAllRates] = useState<Record<number, { hourly: number; base: number }>>(propRates || {});
  const [allDebts, setAllDebts] = useState<Record<number, { amount: number; note: string }>>(propDebts || {});
  const [allCategories, setAllCategories] = useState<InvoiceCategory[]>(propCategories || []);
  const [allCategoryItems, setAllCategoryItems] = useState<Record<number, InvoiceItem[]>>(propCategoryItems || {});

  // DOM Refs for offscreen capturing
  const offscreenSalarySummaryRef = useRef<HTMLDivElement>(null);
  const offscreenSalarySlipRef = useRef<HTMLDivElement>(null);
  const offscreenInvoiceSummaryRef = useRef<HTMLDivElement>(null);
  const offscreenInvoiceDetailRef = useRef<HTMLDivElement>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (!isOpen) {
      setIsFinished(false);
      setProgress(null);
      return;
    }
    setScope(initialScope);
    setIsFinished(false);

    if (propEmployees) setAllEmployees(propEmployees);
    if (propTimesheets) setAllTimesheets(propTimesheets);
    if (propRates) setAllRates(propRates);
    if (propDebts) setAllDebts(propDebts);
    if (propCategories) setAllCategories(propCategories);
    if (propCategoryItems) setAllCategoryItems(propCategoryItems);
  }, [isOpen, initialScope, propEmployees, propTimesheets, propRates, propDebts, propCategories, propCategoryItems]);

  if (!isOpen) return null;

  // Prepare full data before export
  const prepareAllData = async () => {
    let emps = allEmployees;
    if (!emps || emps.length === 0) {
      try {
        emps = await employeeApi.getAll();
        setAllEmployees(emps);
      } catch (e) {
        console.error('Cannot load employees:', e);
      }
    }

    // Rates
    let rates = { ...allRates };
    if (Object.keys(rates).length === 0) {
      try {
        const saved = localStorage.getItem('tang2_salary_employee_rates');
        if (saved) rates = JSON.parse(saved);
      } catch {}
    }
    emps.forEach((emp) => {
      if (!rates[emp.id]) {
        rates[emp.id] = { hourly: emp.hourlyRate || 35000, base: emp.baseSalary || 0 };
      }
    });
    setAllRates(rates);

    // Debts
    let debts = { ...allDebts };
    if (Object.keys(debts).length === 0) {
      try {
        const saved = localStorage.getItem(`tang2_salary_debts_${selectedYear}_${selectedMonth}`);
        if (saved) debts = JSON.parse(saved);
      } catch {}
    }
    setAllDebts(debts);

    // Timesheets
    let ts = { ...allTimesheets };
    const tsKey = `tang2_timesheets_${selectedYear}_${selectedMonth}`;
    if (Object.keys(ts).length === 0) {
      try {
        const saved = localStorage.getItem(tsKey);
        if (saved) ts = JSON.parse(saved);
      } catch {}
    }
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    emps.forEach((emp) => {
      if (!ts[emp.id] || ts[emp.id].length !== daysInMonth) {
        const rate = rates[emp.id]?.hourly || 35000;
        const list: DailyTimesheet[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          list.push({
            employeeId: emp.id,
            day: d,
            dateStr: `${d}/${selectedMonth}`,
            startTime: '',
            endTime: '',
            totalHours: 0,
            hourlyRate: rate,
            dailyPay: 0,
            isOff: false,
          });
        }
        ts[emp.id] = list;
      }
    });
    setAllTimesheets(ts);

    // Categories
    let cats = allCategories;
    if (!cats || cats.length === 0) {
      try {
        cats = await invoiceApi.getCategories(selectedMonth, selectedYear);
        if (cats && cats.length > 0) setAllCategories(cats);
      } catch (e) {
        console.error('Cannot load invoice categories:', e);
      }
    }

    // Category Items
    const itemsMap: Record<number, InvoiceItem[]> = { ...allCategoryItems };
    for (const cat of cats) {
      if (!itemsMap[cat.id] || itemsMap[cat.id].length === 0) {
        try {
          const items = await invoiceApi.getItemsByCategory(cat.id, selectedMonth, selectedYear);
          itemsMap[cat.id] = items || [];
        } catch {
          itemsMap[cat.id] = [];
        }
      }
    }
    setAllCategoryItems(itemsMap);

    return { emps, rates, debts, ts, cats, itemsMap };
  };

  const handleStartExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setIsFinished(false);

    try {
      setProgress({ current: 0, total: 10, name: 'Đang tải dữ liệu hệ thống...' });
      const { emps, cats, itemsMap } = await prepareAllData();

      const doSalary = scope === 'all' || scope === 'salary';
      const doInvoice = scope === 'all' || scope === 'invoice';

      const salaryCount = doSalary ? 1 + emps.length : 0;
      const invoiceCount = doInvoice ? 1 + cats.length : 0;
      const totalSteps = salaryCount + invoiceCount;

      let currentStep = 0;
      const zip = new JSZip();

      // ==========================================
      // PHASE 1: XUẤT ẢNH TIỀN LƯƠNG
      // ==========================================
      if (doSalary) {
        const salaryFolder = scope === 'all' ? zip.folder('1_Bang_Luong_Nhan_Vien') : zip;

        // 1.1 Chụp Bảng Tổng Hợp Lương
        currentStep++;
        setProgress({
          current: currentStep,
          total: totalSteps,
          name: '📸 Bảng Tổng Hợp Tiền Lương Tháng',
        });
        await new Promise((r) => setTimeout(r, 90));

        if (offscreenSalarySummaryRef.current) {
          const blob = await captureElementToBlob(offscreenSalarySummaryRef.current, 2.5);
          if (blob && salaryFolder) {
            salaryFolder.file(
              `00_Bang_Tong_Hop_Luong_Thang_${selectedMonth}_${selectedYear}.png`,
              blob
            );
          }
        }

        // 1.2 Chụp Phiếu Lương Chi Tiết Từng Nhân Viên
        for (let i = 0; i < emps.length; i++) {
          const emp = emps[i];
          currentStep++;
          setProgress({
            current: currentStep,
            total: totalSteps,
            name: `📸 Phiếu Lương [${emp.fullName}] (${emp.role || 'NV'})`,
          });

          setTargetEmployee(emp);
          await new Promise((r) => setTimeout(r, 90));

          if (offscreenSalarySlipRef.current) {
            const blob = await captureElementToBlob(offscreenSalarySlipRef.current, 2.5);
            if (blob && salaryFolder) {
              const idxStr = String(i + 1).padStart(2, '0');
              const safeName = emp.fullName.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
              salaryFolder.file(
                `${idxStr}_Phieu_Luong_${safeName}_Thang_${selectedMonth}_${selectedYear}.png`,
                blob
              );
            }
          }
        }
      }

      // ==========================================
      // PHASE 2: XUẤT ẢNH HÓA ĐƠN & NHẬP HÀNG
      // ==========================================
      if (doInvoice) {
        const invoiceFolder = scope === 'all' ? zip.folder('2_Hoa_Don_Nhap_Hang') : zip;

        // 2.1 Chụp Bảng Tổng Hợp Chi Phí Hóa Đơn
        currentStep++;
        setProgress({
          current: currentStep,
          total: totalSteps,
          name: '📸 Bảng Tổng Hợp Chi Phí Hóa Đơn Tháng',
        });
        await new Promise((r) => setTimeout(r, 90));

        if (offscreenInvoiceSummaryRef.current) {
          const blob = await captureElementToBlob(offscreenInvoiceSummaryRef.current, 2.5);
          if (blob && invoiceFolder) {
            invoiceFolder.file(
              `00_Bang_Tong_Hop_Chi_Phi_Hoa_Don_Thang_${selectedMonth}_${selectedYear}.png`,
              blob
            );
          }
        }

        // 2.2 Chụp Chi Tiết Hóa Đơn Từng Nhà Cung Cấp / Hạng Mục
        for (let j = 0; j < cats.length; j++) {
          const cat = cats[j];
          currentStep++;
          setProgress({
            current: currentStep,
            total: totalSteps,
            name: `📸 Chi Tiết Hóa Đơn [${cat.name}]`,
          });

          setTargetCategory(cat);
          setTargetCategoryItems(itemsMap[cat.id] || []);
          await new Promise((r) => setTimeout(r, 90));

          if (offscreenInvoiceDetailRef.current) {
            const blob = await captureElementToBlob(offscreenInvoiceDetailRef.current, 2.5);
            if (blob && invoiceFolder) {
              const idxStr = String(j + 1).padStart(2, '0');
              const safeCat = cat.name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9\uAC00-\uD7A3]/g, '_');
              invoiceFolder.file(
                `${idxStr}_Chi_Tiet_Hoa_Don_${safeCat}_Thang_${selectedMonth}_${selectedYear}.png`,
                blob
              );
            }
          }
        }
      }

      // ==========================================
      // PHASE 3: ĐÓNG GÓI & TẢI FILE ZIP
      // ==========================================
      setProgress({
        current: totalSteps,
        total: totalSteps,
        name: '📦 Đang nén toàn bộ ảnh sắc nét vào file ZIP...',
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      let zipFileName = `Tron_Bo_Bao_Cao_Luong_Va_Hoa_Don_Tang2_Thang_${selectedMonth}_${selectedYear}.zip`;
      if (scope === 'salary') {
        zipFileName = `Tron_Bo_Bang_Luong_Nhan_Vien_Tang2_Thang_${selectedMonth}_${selectedYear}.zip`;
      } else if (scope === 'invoice') {
        zipFileName = `Tron_Bo_Hoa_Don_Nhap_Hang_Tang2_Thang_${selectedMonth}_${selectedYear}.zip`;
      }

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTotalFilesExported(totalSteps);
      setIsFinished(true);
    } catch (err) {
      console.error('Lỗi khi xuất file ZIP:', err);
      alert('Có lỗi khi tạo ảnh xuất ZIP, vui lòng thử lại!');
    } finally {
      setIsExporting(false);
      setTargetEmployee(null);
      setTargetCategory(null);
    }
  };

  // Build salary summary list for offscreen summary
  const summaryList: SalarySummaryItem[] = allEmployees.map((emp) => {
    const rate = allRates[emp.id]?.hourly || emp.hourlyRate || 35000;
    const base = allRates[emp.id]?.base || 0;
    const debt = allDebts[emp.id]?.amount || 0;
    const debtNote = allDebts[emp.id]?.note || '';
    const list = allTimesheets[emp.id] || [];
    const totalH = list.reduce((s, d) => s + (d.isOff ? 0 : d.totalHours), 0);
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

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!isExporting) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-slate-800 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-white flex items-center justify-center shadow-md">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Xuất Trọn Bộ Báo Cáo Gửi Sếp (.ZIP)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Kỳ hạch toán: <b>Tháng {selectedMonth}/{selectedYear}</b> • Nhà hàng Tầng 2
              </p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Finished State */}
        {isFinished ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-lg font-black text-emerald-950">Đã Tải File ZIP Thành Công!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Đã đóng gói hoàn chỉnh <b>{totalFilesExported} ảnh Ultra HD sắc nét 100%</b> vào file ZIP. Bạn có thể gửi file này trực tiếp cho Sếp qua Zalo/Email.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl text-sm shadow-md transition cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        ) : isExporting && progress ? (
          /* Running Progress State */
          <div className="py-6 space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
              <Archive className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900">
                Đang chụp ảnh & đóng gói file ZIP...
              </h4>
              <p className="text-xs text-slate-600 font-semibold truncate px-4">
                {progress.name}
              </p>
              <p className="text-[11px] text-slate-400">
                Tiến độ: {progress.current} / {progress.total} ảnh (
                {Math.round((progress.current / Math.max(1, progress.total)) * 100)}%)
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(5, Math.round((progress.current / Math.max(1, progress.total)) * 100))}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              ⚡ Hệ thống đang tự động chụp từng bảng với độ phân giải siêu nét Retina Ultra HD...
            </p>
          </div>
        ) : (
          /* Selection State */
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-600">Chọn gói báo cáo muốn đóng gói vào file ZIP:</p>

            <div className="space-y-2.5">
              {/* Option 1: Trọn Bộ Lương & Hóa Đơn (Khuyên dùng) */}
              <label
                onClick={() => setScope('all')}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  scope === 'all'
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-1 text-emerald-700 focus:ring-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      🌟 Trọn Bộ Lương & Hóa Đơn Nhập Hàng
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-700 text-white">
                      Đủ nhất cho Sếp
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Bao gồm thư mục <b>1_Bang_Luong_Nhan_Vien</b> (bảng tổng hợp + toàn bộ phiếu chấm công chi tiết từng người) và thư mục <b>2_Hoa_Don_Nhap_Hang</b> (bảng tổng hợp chi phí + chi tiết các nhà cung cấp).
                  </p>
                  <div className="text-[11px] font-bold text-emerald-800 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Khoảng 23 ảnh Ultra HD sắc nét • Nén chỉ trong 3-4 giây</span>
                  </div>
                </div>
              </label>

              {/* Option 2: Chỉ Bảng Lương */}
              <label
                onClick={() => setScope('salary')}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  scope === 'salary'
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'salary'}
                  onChange={() => setScope('salary')}
                  className="mt-1 text-emerald-700 focus:ring-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span className="text-sm font-black text-slate-900">Chỉ Bảng Tiền Lương Nhân Viên</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Gồm 1 bảng lương tổng hợp toàn bộ nhân sự + từng phiếu chấm công 30/31 ngày của tất cả nhân viên.
                  </p>
                </div>
              </label>

              {/* Option 3: Chỉ Hóa Đơn */}
              <label
                onClick={() => setScope('invoice')}
                className={`flex items-start gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                  scope === 'invoice'
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  checked={scope === 'invoice'}
                  onChange={() => setScope('invoice')}
                  className="mt-1 text-emerald-700 focus:ring-emerald-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <span className="text-sm font-black text-slate-900">Chỉ Hóa Đơn & Nhập Hàng</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Gồm 1 bảng tổng hợp chi phí 12 hạng mục + tất cả các bảng chi tiết hóa đơn nhà cung cấp.
                  </p>
                </div>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleStartExport}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-extrabold rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Bắt Đầu Tải File ZIP</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* OFFSCREEN CONTAINERS (Chụp Ultra HD hoàn toàn ẩn ngoài màn hình)           */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 1050,
          zIndex: -9999,
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
        }}
      >
        {/* 1. Offscreen Salary Summary */}
        <SalarySummaryTableView
          containerRef={offscreenSalarySummaryRef}
          employees={allEmployees}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          summaryList={summaryList}
        />

        {/* 2. Offscreen Salary Slip */}
        {targetEmployee && (
          <SalarySlipTableView
            containerRef={offscreenSalarySlipRef}
            employee={targetEmployee}
            timesheet={allTimesheets[targetEmployee.id] || []}
            hourlyRate={allRates[targetEmployee.id]?.hourly || targetEmployee.hourlyRate || 35000}
            baseSalary={allRates[targetEmployee.id]?.base || 0}
            debtAmount={allDebts[targetEmployee.id]?.amount || 0}
            debtNote={allDebts[targetEmployee.id]?.note || ''}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}

        {/* 3. Offscreen Invoice Summary */}
        <InvoiceSummaryView
          containerRef={offscreenInvoiceSummaryRef}
          categories={allCategories}
          categoryItems={allCategoryItems}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          hideActions={true}
        />

        {/* 4. Offscreen Invoice Detail */}
        {targetCategory && (
          <InvoiceDetailView
            containerRef={offscreenInvoiceDetailRef}
            category={targetCategory}
            items={targetCategoryItems}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            hideActions={true}
          />
        )}
      </div>
    </div>
  );
};
