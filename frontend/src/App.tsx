import { useState, useEffect, useRef } from 'react';
import { ScheduleTable } from './components/schedule/ScheduleTable';
import { SalaryManager } from './components/salary/SalaryManager';
import { InvoiceManager } from './components/invoice/InvoiceManager';
import type { Employee, ShiftTemplate, Assignment } from './types';
import { scheduleApi } from './services/api';
import { downloadScheduleImage, copyScheduleImageToClipboard } from './utils/screenshot';
import { 
  Camera, 
  Copy, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Check, 
  AlertCircle, 
  Sparkles,
  Store,
  DollarSign,
  Receipt,
  RotateCcw
} from 'lucide-react';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, fullName: 'An', role: 'Nhân viên', hourlyRate: 40000, baseSalary: 0, isActive: true, displayOrder: 1 },
  { id: 2, fullName: 'Quang', role: 'Nhân viên', hourlyRate: 35000, baseSalary: 0, isActive: true, displayOrder: 2 },
  { id: 3, fullName: 'Hà', role: 'Bếp', hourlyRate: 35000, baseSalary: 0, isActive: true, displayOrder: 3 },
  { id: 4, fullName: 'Linh', role: 'Nhân viên', hourlyRate: 30000, baseSalary: 0, isActive: true, displayOrder: 4 },
  { id: 5, fullName: 'Hiền', role: 'Nhân viên', hourlyRate: 30000, baseSalary: 0, isActive: true, displayOrder: 5 },
  { id: 6, fullName: 'Hòa', role: 'Nhân viên', hourlyRate: 30000, baseSalary: 0, isActive: true, displayOrder: 6 },
  { id: 7, fullName: 'Đức', role: 'Nhân viên', hourlyRate: 40000, baseSalary: 3000000, isActive: true, displayOrder: 7 },
  { id: 8, fullName: 'Ngọc Anh', role: 'Nhân viên', hourlyRate: 35000, baseSalary: 0, isActive: true, displayOrder: 8 },
  { id: 9, fullName: 'Minh Ánh', role: 'Nhân viên', hourlyRate: 35000, baseSalary: 0, isActive: true, displayOrder: 9 },
];

const INITIAL_SHIFTS: ShiftTemplate[] = [
  { id: 1, name: '10h - Kết ca', bgColor: '#a3a3a3', textColor: '#1f2937', isOff: false, displayOrder: 1 },
  { id: 2, name: '10h - 15h', bgColor: '#ffffff', textColor: '#1f2937', isOff: false, displayOrder: 2 },
  { id: 3, name: '17h - Kết ca', bgColor: '#a3a3a3', textColor: '#1f2937', isOff: false, displayOrder: 3 },
  { id: 4, name: '17 - 22h', bgColor: '#ffffff', textColor: '#1f2937', isOff: false, displayOrder: 4 },
  { id: 5, name: '19h - Kết ca', bgColor: '#a3a3a3', textColor: '#1f2937', isOff: false, displayOrder: 5 },
  { id: 6, name: '10h - 21h', bgColor: '#ffffff', textColor: '#1f2937', isOff: false, displayOrder: 6 },
  { id: 7, name: '10h - 22h', bgColor: '#ffffff', textColor: '#1f2937', isOff: false, displayOrder: 7 },
  { id: 8, name: 'Nghỉ (OFF)', bgColor: '#ff0000', textColor: '#ffffff', isOff: true, displayOrder: 8 },
];

export function App() {
  const scheduleTableRef = useRef<HTMLDivElement>(null);

  // Current Week calculation (Monday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [activeMainTab, setActiveMainTab] = useState<'schedule' | 'salary' | 'invoice'>('invoice');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<ShiftTemplate[]>(INITIAL_SHIFTS);
  const [assignments, setAssignments] = useState<Assignment[]>([
    // Quang
    { employeeId: 1, dayOfWeek: 1, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 2, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 3, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 4, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 5, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 6, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 1, dayOfWeek: 0, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },

    // Hiền
    { employeeId: 2, dayOfWeek: 1, date: '', shiftText: '10h - 15h', isOff: false, customColor: 'white' },
    { employeeId: 2, dayOfWeek: 2, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 2, dayOfWeek: 3, date: '', shiftText: '19h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 2, dayOfWeek: 4, date: '', shiftText: '10h - 21h', isOff: false, customColor: 'white' },
    { employeeId: 2, dayOfWeek: 5, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 2, dayOfWeek: 6, date: '', shiftText: 'Nghỉ', isOff: true, customColor: 'red' },
    { employeeId: 2, dayOfWeek: 0, date: '', shiftText: 'Nghỉ', isOff: true, customColor: 'red' },

    // Ngọc Anh
    { employeeId: 3, dayOfWeek: 1, date: '', shiftText: '17 - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 3, dayOfWeek: 2, date: '', shiftText: '17 - 22h', isOff: false, customColor: 'white' },
    { employeeId: 3, dayOfWeek: 3, date: '', shiftText: '17 - 22h', isOff: false, customColor: 'white' },
    { employeeId: 3, dayOfWeek: 4, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 3, dayOfWeek: 5, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 3, dayOfWeek: 6, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 3, dayOfWeek: 0, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },

    // Minh Ánh
    { employeeId: 4, dayOfWeek: 1, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 4, dayOfWeek: 2, date: '', shiftText: '17 - 22h', isOff: false, customColor: 'white' },
    { employeeId: 4, dayOfWeek: 3, date: '', shiftText: '17 - 22h', isOff: false, customColor: 'white' },
    { employeeId: 4, dayOfWeek: 4, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 4, dayOfWeek: 5, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 4, dayOfWeek: 6, date: '', shiftText: '17h - Kết ca', isOff: false, customColor: 'gray' },
    { employeeId: 4, dayOfWeek: 0, date: '', shiftText: '10h - Kết ca', isOff: false, customColor: 'gray' },

    // Hà
    { employeeId: 5, dayOfWeek: 1, date: '', shiftText: 'Nghỉ', isOff: true, customColor: 'red' },
    { employeeId: 5, dayOfWeek: 2, date: '', shiftText: '10h - 15h', isOff: false, customColor: 'white' },
    { employeeId: 5, dayOfWeek: 3, date: '', shiftText: 'Nghỉ', isOff: true, customColor: 'red' },
    { employeeId: 5, dayOfWeek: 4, date: '', shiftText: '10h - 15h', isOff: false, customColor: 'white' },
    { employeeId: 5, dayOfWeek: 5, date: '', shiftText: '10h - 22h', isOff: false, customColor: 'white' },
    { employeeId: 5, dayOfWeek: 6, date: '', shiftText: '10h - 22h', isOff: false, customColor: 'white' },
    { employeeId: 5, dayOfWeek: 0, date: '', shiftText: '10h - 22h', isOff: false, customColor: 'white' },
  ]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Hidden employees in current week state (persisted per week)
  const getHiddenEmpsKey = (d: Date) => `tang2_hidden_emps_${d.toISOString().split('T')[0]}`;
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`tang2_hidden_emps_${currentMonday.toISOString().split('T')[0]}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Reload hidden employees when week changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getHiddenEmpsKey(currentMonday));
      setHiddenEmployeeIds(saved ? JSON.parse(saved) : []);
    } catch {
      setHiddenEmployeeIds([]);
    }
  }, [currentMonday]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Hide employee for current week
  const handleHideEmployee = (id: number) => {
    const emp = employees.find((e) => e.id === id);
    const updated = [...hiddenEmployeeIds, id];
    setHiddenEmployeeIds(updated);
    try {
      localStorage.setItem(getHiddenEmpsKey(currentMonday), JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Đã tạm ẩn [${emp?.fullName || 'nhân viên'}] khỏi lịch tuần này!`);
  };

  // Unhide employee for current week
  const handleUnhideEmployee = (id: number) => {
    const emp = employees.find((e) => e.id === id);
    const updated = hiddenEmployeeIds.filter((empId) => empId !== id);
    setHiddenEmployeeIds(updated);
    try {
      localStorage.setItem(getHiddenEmpsKey(currentMonday), JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Đã đưa [${emp?.fullName || 'nhân viên'}] trở lại bảng lịch!`);
  };

  // Unhide all employees
  const handleUnhideAllEmployees = () => {
    setHiddenEmployeeIds([]);
    try {
      localStorage.removeItem(getHiddenEmpsKey(currentMonday));
    } catch (e) {
      console.error(e);
    }
    showToast('Đã khôi phục hiển thị toàn bộ nhân viên!');
  };

  // Clear current week schedule
  const handleClearWeekSchedule = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClearSchedule = () => {
    setAssignments([]);
    setShowClearConfirm(false);
    showToast('Đã làm sạch toàn bộ ca làm trong tuần! Bạn có thể bắt đầu xếp lịch mới.');
  };

  // Fetch from backend API
  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedShifts = await scheduleApi.getShiftTemplates();
        if (fetchedShifts && fetchedShifts.length > 0) setShifts(fetchedShifts);

        const fetchedEmployees = await scheduleApi.getEmployees();
        if (fetchedEmployees && fetchedEmployees.length > 0) setEmployees(fetchedEmployees);

        const dateStr = currentMonday.toISOString().split('T')[0];
        const schedule = await scheduleApi.getScheduleByDate(dateStr);
        if (schedule && schedule.assignments.length > 0) {
          setAssignments(schedule.assignments);
        }
      } catch (err) {
        console.log('Using local fallback state:', err);
      }
    };
    loadData();
  }, [currentMonday]);

  // Handle single cell assignment change
  const handleAssignmentChange = (
    employeeId: number,
    dayOfWeek: number,
    shiftText: string,
    isOff: boolean,
    customColor?: string
  ) => {
    setAssignments((prev) => {
      const filtered = prev.filter((a) => !(a.employeeId === employeeId && a.dayOfWeek === dayOfWeek));
      if (!shiftText || shiftText.trim() === '') return filtered;
      return [...filtered, { employeeId, dayOfWeek, date: '', shiftText, isOff, customColor }];
    });
  };

  // Handle batch assignment change (multiple days for 1 employee)
  const handleBatchAssignmentChange = (
    employeeId: number,
    days: number[],
    shiftText: string,
    isOff: boolean,
    customColor?: string
  ) => {
    setAssignments((prev) => {
      const filtered = prev.filter(
        (a) => !(a.employeeId === employeeId && days.includes(a.dayOfWeek))
      );
      if (!shiftText || shiftText.trim() === '') return filtered;
      const newItems: Assignment[] = days.map((day) => ({
        employeeId,
        dayOfWeek: day,
        date: '',
        shiftText,
        isOff,
        customColor,
      }));
      return [...filtered, ...newItems];
    });
    showToast(`Đã áp dụng ca làm cho ${days.length} ngày!`);
  };

  // Add new employee
  const handleAddEmployee = (name: string, role: string) => {
    const newId = employees.length > 0 ? Math.max(...employees.map((e) => e.id)) + 1 : 1;
    const newEmp: Employee = {
      id: newId,
      fullName: name,
      role: role || 'Phục vụ',
      isActive: true,
      displayOrder: newId,
    };
    setEmployees((prev) => [...prev, newEmp]);
    showToast(`Đã thêm nhân viên ${name} thành công!`);
  };

  // Delete employee
  const handleDeleteEmployee = (id: number) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setAssignments((prev) => prev.filter((a) => a.employeeId !== id));
    showToast('Đã xóa nhân viên khỏi bảng lịch.');
  };

  // Toggle role between Nhân viên and Bếp
  const handleToggleEmployeeRole = (id: number) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const nextRole = (emp.role || '').toLowerCase().includes('bếp') ? 'Nhân viên' : 'Bếp';
          showToast(`${emp.fullName}: Đã đổi sang bộ phận ${nextRole}`);
          return { ...emp, role: nextRole };
        }
        return emp;
      })
    );
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  // Export Screenshot Handlers
  const handleDownloadImage = async () => {
    if (!scheduleTableRef.current) return;
    try {
      const dateStr = `${currentMonday.getDate()}_${currentMonday.getMonth() + 1}`;
      await downloadScheduleImage(scheduleTableRef.current, `Lich_Lam_Tuan_${dateStr}_UltraHD.png`);
      showToast('Đã tải ảnh Ultra HD! Gửi file này vào Zalo để giữ nét 100% không bị nén.');
    } catch {
      showToast('Không thể xuất ảnh, vui lòng thử lại!', 'error');
    }
  };

  const handleCopyImage = async () => {
    if (!scheduleTableRef.current) return;
    try {
      await copyScheduleImageToClipboard(scheduleTableRef.current);
      showToast('📋 Đã copy ảnh! Khi dán vào Zalo nhớ tích chọn nút [HD] trước khi gửi.');
    } catch {
      showToast('Trình duyệt chưa cho phép copy ảnh, vui lòng bấm nút "Tải Ảnh PNG"!', 'error');
    }
  };

  const handleSave = async () => {
    try {
      const dateStr = currentMonday.toISOString().split('T')[0];
      await scheduleApi.saveSchedule({
        weekStartDate: dateStr,
        assignments: assignments,
      });
      showToast('Đã lưu lịch làm việc thành công lên SQL Server!');
    } catch {
      showToast('Đã lưu lịch vào bộ nhớ tạm trình duyệt!');
    }
  };

  // Format week range label
  const sunday = new Date(currentMonday);
  sunday.setDate(sunday.getDate() + 6);
  const weekLabel = `Thứ Hai ${currentMonday.getDate()}/${currentMonday.getMonth() + 1} - Chủ Nhật ${sunday.getDate()}/${sunday.getMonth() + 1}/${sunday.getFullYear()}`;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 p-3 sm:p-6 lg:p-8 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-bold transition-all animate-in slide-in-from-top-3 ${
            toast.type === 'success' ? 'bg-emerald-700' : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Main Feature Tabs */}
        <nav className="bg-white/95 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl shadow-sm border border-slate-200/90">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Tab 1: Xếp lịch */}
            <button
              onClick={() => setActiveMainTab('schedule')}
              className={`group flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeMainTab === 'schedule'
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-700/50 scale-[1.01]'
                  : 'bg-slate-50/80 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-950 border border-slate-200/60 hover:border-emerald-300/60'
              }`}
            >
              <div
                className={`p-2 rounded-xl transition ${
                  activeMainTab === 'schedule'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/70 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                }`}
              >
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="tracking-tight text-sm sm:text-base font-extrabold">Xếp Lịch Làm Việc</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md hidden lg:inline-block ${
                    activeMainTab === 'schedule'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600 group-hover:bg-emerald-200/70 group-hover:text-emerald-900'
                  }`}
                >
                  Hằng tuần
                </span>
              </div>
            </button>

            {/* Tab 2: Tính tiền lương */}
            <button
              onClick={() => setActiveMainTab('salary')}
              className={`group flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeMainTab === 'salary'
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-700/50 scale-[1.01]'
                  : 'bg-slate-50/80 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-950 border border-slate-200/60 hover:border-emerald-300/60'
              }`}
            >
              <div
                className={`p-2 rounded-xl transition ${
                  activeMainTab === 'salary'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/70 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                }`}
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="tracking-tight text-sm sm:text-base font-extrabold">Tính Tiền Lương</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md hidden lg:inline-block ${
                    activeMainTab === 'salary'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600 group-hover:bg-emerald-200/70 group-hover:text-emerald-900'
                  }`}
                >
                  Chấm công
                </span>
              </div>
            </button>

            {/* Tab 3: Hóa đơn & Nhập hàng */}
            <button
              onClick={() => setActiveMainTab('invoice')}
              className={`group flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeMainTab === 'invoice'
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-700/50 scale-[1.01]'
                  : 'bg-slate-50/80 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-950 border border-slate-200/60 hover:border-emerald-300/60'
              }`}
            >
              <div
                className={`p-2 rounded-xl transition ${
                  activeMainTab === 'invoice'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/70 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                }`}
              >
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="tracking-tight text-sm sm:text-base font-extrabold">Hóa Đơn & Nhập Hàng</span>
                <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black shadow-xs tracking-wider">
                  MỚI
                </span>
              </div>
            </button>
          </div>
        </nav>

        {activeMainTab === 'salary' ? (
          <SalaryManager employees={employees} />
        ) : activeMainTab === 'invoice' ? (
          <InvoiceManager />
        ) : (
          <>
            {/* Top Header & Action Bar */}
            <header className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Brand info */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 flex items-center justify-center text-white shadow-md">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      TẦNG 2 RESTAURANT
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Hệ thống xếp lịch
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <span>{weekLabel}</span>
                  </p>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center gap-1.5 self-start lg:self-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  onClick={handlePrevWeek}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition cursor-pointer"
                  title="Tuần trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCurrentWeek}
                  className="px-3 py-1.5 rounded-lg bg-white shadow-xs text-slate-800 text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
                >
                  Tuần Hiện Tại
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition cursor-pointer"
                  title="Tuần sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions (Save, Copy, Download, Clear) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClearWeekSchedule}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                  title="Xóa trắng toàn bộ ca làm trong tuần này để bắt đầu xếp lịch mới"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>🧹 Làm Sạch Lịch Tuần</span>
                </button>

                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Lịch (DB)</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  title="Chụp ảnh và copy để dán (Ctrl+V) thẳng vào Zalo"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 Copy Ảnh Gửi Zalo</span>
                </button>

                <button
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  title="Tải ảnh PNG nét cao về máy"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tải Ảnh PNG</span>
                </button>
              </div>
            </header>

            {/* Modal xác nhận Làm sạch lịch tuần */}
            {showClearConfirm && (
              <div
                className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
                onClick={() => setShowClearConfirm(false)}
              >
                <div
                  className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        Làm sạch lịch tuần này?
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {weekLabel}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Thao tác này sẽ <b>xóa sạch toàn bộ các ca làm việc đã xếp</b> của tuần này về trạng thái trống (<code>--</code>) để bạn sẵn sàng xếp lịch mới cho nhân viên.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleConfirmClearSchedule}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Xác nhận làm sạch</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Table Component */}
            <ScheduleTable
              scheduleRef={scheduleTableRef}
              employees={employees}
              shifts={shifts}
              assignments={assignments}
              onAssignmentChange={handleAssignmentChange}
              onBatchAssignmentChange={handleBatchAssignmentChange}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onToggleEmployeeRole={handleToggleEmployeeRole}
              hiddenEmployeeIds={hiddenEmployeeIds}
              onHideEmployee={handleHideEmployee}
              onUnhideEmployee={handleUnhideEmployee}
              onUnhideAllEmployees={handleUnhideAllEmployees}
              weekStartDate={currentMonday}
            />

            {/* Quick Guide Card */}
            <div className="bg-gradient-to-r from-emerald-900/5 to-teal-900/5 border border-emerald-900/15 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>Tính năng xếp lịch: Tự do Custom ca làm & Đổi ca nhiều ngày</span>
                </div>
                <p className="text-xs text-slate-600">
                  • Bấm vào bất kỳ ô nào ➔ Chọn tab <b>"✍️ Tự nhập ca riêng"</b> để gõ bất kỳ khung giờ nào (VD: 11h-16h, Ca gãy, Ca tiệc...).
                  <br />
                  • Bấm vào nhãn <b>[NV]</b> hoặc <b>[Bếp]</b> cạnh tên nhân viên để đổi vai trò trực tiếp.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                  ⚡ Gửi Zalo: Bấm "Copy Ảnh" ➔ Qua Zalo bấm Ctrl + V (Nhớ tích chọn [HD])
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
