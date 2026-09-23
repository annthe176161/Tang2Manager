import { useState, useEffect, useRef } from 'react';
import { ScheduleTable } from './components/schedule/ScheduleTable';
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
  Store
} from 'lucide-react';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, fullName: 'Quang', role: '', isActive: true, displayOrder: 1 },
  { id: 2, fullName: 'Hiền', role: '', isActive: true, displayOrder: 2 },
  { id: 3, fullName: 'Ngọc Anh', role: '', isActive: true, displayOrder: 3 },
  { id: 4, fullName: 'Minh Ánh', role: '', isActive: true, displayOrder: 4 },
  { id: 5, fullName: 'Hà', role: '', isActive: true, displayOrder: 5 },
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
      await downloadScheduleImage(scheduleTableRef.current, `Lich_Lam_Nha_Hang_Tuan_${dateStr}.png`);
      showToast('Đã chụp và tải ảnh lịch làm nét 2x về máy!');
    } catch {
      showToast('Không thể xuất ảnh, vui lòng thử lại!', 'error');
    }
  };

  const handleCopyImage = async () => {
    if (!scheduleTableRef.current) return;
    try {
      await copyScheduleImageToClipboard(scheduleTableRef.current);
      showToast('📋 Đã copy ảnh vào Clipboard! Mở Zalo và ấn Ctrl + V để dán ngay.');
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
              className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3 py-1.5 rounded-lg bg-white shadow-xs text-slate-800 text-xs font-bold transition hover:bg-slate-50"
            >
              Tuần Hiện Tại
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg hover:bg-white hover:shadow-xs text-slate-700 transition"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions (Save, Copy, Download) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Lịch (DB)</span>
            </button>

            <button
              onClick={handleCopyImage}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
              title="Chụp ảnh và copy để dán (Ctrl+V) thẳng vào Zalo"
            >
              <Copy className="w-4 h-4" />
              <span>📋 Copy Ảnh Gửi Zalo</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
              title="Tải ảnh PNG nét cao về máy"
            >
              <Camera className="w-4 h-4" />
              <span>Tải Ảnh PNG</span>
            </button>
          </div>
        </header>

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
          weekStartDate={currentMonday}
        />

        {/* Quick Guide Card */}
        <div className="bg-gradient-to-r from-emerald-900/5 to-teal-900/5 border border-emerald-900/15 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Tính năng mới: Tự do Custom ca làm & Đổi ca nhiều ngày</span>
            </div>
            <p className="text-xs text-slate-600">
              • Bấm vào bất kỳ ô nào ➔ Chọn tab <b>"✍️ Tự nhập ca riêng"</b> để gõ bất kỳ khung giờ nào (VD: 11h-16h, Ca gãy, Ca tiệc...).
              <br />
              • Có thể tích chọn <b>"Áp dụng cho nhiều ngày"</b> để điền nhanh ca đó cho cả tuần chỉ với 1 lần bấm!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
              ⚡ Gửi Zalo: Bấm "Copy Ảnh" ➔ Qua Zalo bấm Ctrl + V
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
