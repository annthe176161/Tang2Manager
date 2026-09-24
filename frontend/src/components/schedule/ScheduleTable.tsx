import React, { useState } from 'react';
import type { Employee, ShiftTemplate, Assignment } from '../../types';
import { 
  Sparkles, 
  Trash2, 
  Check, 
  Layers, 
  UserPlus, 
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface ScheduleTableProps {
  scheduleRef: React.RefObject<HTMLDivElement | null>;
  employees: Employee[];
  shifts: ShiftTemplate[];
  assignments: Assignment[];
  onAssignmentChange: (
    employeeId: number, 
    dayOfWeek: number, 
    shiftText: string, 
    isOff: boolean,
    customColor?: string
  ) => void;
  onBatchAssignmentChange?: (
    employeeId: number,
    days: number[],
    shiftText: string,
    isOff: boolean,
    customColor?: string
  ) => void;
  onAddEmployee?: (name: string, role: string) => void;
  onDeleteEmployee?: (id: number) => void;
  onToggleEmployeeRole?: (id: number) => void;
  hiddenEmployeeIds?: number[];
  onHideEmployee?: (id: number) => void;
  onUnhideEmployee?: (id: number) => void;
  onUnhideAllEmployees?: () => void;
  weekStartDate: Date;
}

const DAYS = [
  { name: 'Thứ 2', dayOfWeek: 1, isWeekend: false },
  { name: 'Thứ 3', dayOfWeek: 2, isWeekend: false },
  { name: 'Thứ 4', dayOfWeek: 3, isWeekend: false },
  { name: 'Thứ 5', dayOfWeek: 4, isWeekend: false },
  { name: 'Thứ 6', dayOfWeek: 5, isWeekend: false },
  { name: 'Thứ 7', dayOfWeek: 6, isWeekend: true },
  { name: 'Chủ nhật', dayOfWeek: 0, isWeekend: true },
];

const PRESET_COLORS = [
  { label: 'Trắng chuẩn', value: 'white', bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
  { label: 'Xám kết ca', value: 'gray', bg: 'bg-neutral-300', text: 'text-neutral-900', border: 'border-neutral-400' },
  { label: 'Đỏ nghỉ (OFF)', value: 'red', bg: 'bg-red-600', text: 'text-white', border: 'border-red-600' },
  { label: 'Vàng tăng ca', value: 'amber', bg: 'bg-amber-200', text: 'text-amber-950', border: 'border-amber-300' },
  { label: 'Xanh tiệc/sự kiện', value: 'blue', bg: 'bg-sky-200', text: 'text-sky-950', border: 'border-sky-300' },
  { label: 'Tím ca đặc biệt', value: 'purple', bg: 'bg-purple-200', text: 'text-purple-950', border: 'border-purple-300' },
];

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  scheduleRef,
  employees,
  shifts,
  assignments,
  onAssignmentChange,
  onBatchAssignmentChange,
  onAddEmployee,
  onDeleteEmployee,
  onToggleEmployeeRole,
  hiddenEmployeeIds = [],
  onHideEmployee,
  onUnhideEmployee,
  onUnhideAllEmployees,
  weekStartDate,
}) => {
  const visibleEmployees = employees.filter((emp) => !hiddenEmployeeIds.includes(emp.id));
  const hiddenEmployees = employees.filter((emp) => hiddenEmployeeIds.includes(emp.id));
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: number;
    employeeName: string;
    dayOfWeek: number;
    dayName: string;
    currentText: string;
    isOff: boolean;
    customColor?: string;
  } | null>(null);

  // Custom shift input state inside modal
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('custom');
  const [customShiftText, setCustomShiftText] = useState('');
  const [customIsOff, setCustomIsOff] = useState(false);
  const [customColor, setCustomColor] = useState('white');
  const [applyDays, setApplyDays] = useState<number[]>([]);

  // Add employee modal
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'Nhân viên' | 'Bếp'>('Nhân viên');

  const getDayDate = (dayOffset: number) => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + dayOffset);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const getAssignment = (employeeId: number, dayOfWeek: number) => {
    return assignments.find((a) => a.employeeId === employeeId && a.dayOfWeek === dayOfWeek);
  };

  const handleCellClick = (employeeId: number, employeeName: string, dayOfWeek: number, dayName: string) => {
    const existing = getAssignment(employeeId, dayOfWeek);
    const text = existing?.shiftText || '';
    const isOff = existing?.isOff || false;
    const color = existing?.customColor || (isOff ? 'red' : text.includes('Kết ca') || text.includes('Hết ca') ? 'gray' : 'white');

    setSelectedCell({
      employeeId,
      employeeName,
      dayOfWeek,
      dayName,
      currentText: text,
      isOff,
      customColor: color,
    });

    setCustomShiftText(text);
    setCustomIsOff(isOff);
    setCustomColor(color);
    setApplyDays([dayOfWeek]);
    // If cell already has custom content not strictly matching presets, default to 'custom' tab
    const matchedPreset = shifts.some((s) => s.name === text);
    setActiveTab(matchedPreset ? 'preset' : 'custom');
  };

  const handleSelectPreset = (shiftName: string, isOff: boolean) => {
    if (!selectedCell) return;
    const color = isOff ? 'red' : shiftName.includes('Kết ca') || shiftName.includes('Hết ca') ? 'gray' : 'white';
    
    if (applyDays.length > 1 && onBatchAssignmentChange) {
      onBatchAssignmentChange(selectedCell.employeeId, applyDays, shiftName, isOff, color);
    } else {
      onAssignmentChange(selectedCell.employeeId, selectedCell.dayOfWeek, shiftName, isOff, color);
    }
    setSelectedCell(null);
  };

  const handleApplyCustomShift = () => {
    if (!selectedCell) return;
    const trimmed = customShiftText.trim();
    const isOff = customIsOff || trimmed.toLowerCase().includes('nghỉ') || trimmed.toLowerCase().includes('off');
    const color = isOff ? 'red' : customColor;

    if (applyDays.length > 1 && onBatchAssignmentChange) {
      onBatchAssignmentChange(selectedCell.employeeId, applyDays, trimmed, isOff, color);
    } else {
      onAssignmentChange(selectedCell.employeeId, selectedCell.dayOfWeek, trimmed, isOff, color);
    }
    setSelectedCell(null);
  };

  const handleClearCell = () => {
    if (!selectedCell) return;
    if (applyDays.length > 1 && onBatchAssignmentChange) {
      onBatchAssignmentChange(selectedCell.employeeId, applyDays, '', false, 'white');
    } else {
      onAssignmentChange(selectedCell.employeeId, selectedCell.dayOfWeek, '', false, 'white');
    }
    setSelectedCell(null);
  };

  const handleToggleApplyDay = (day: number) => {
    setApplyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Cell style resolver
  const getCellStyle = (shiftText: string, isOff: boolean, cellCustomColor?: string) => {
    if (isOff || shiftText.toLowerCase().includes('nghỉ') || shiftText.toLowerCase().includes('off')) {
      return 'bg-[#ff0000] text-white font-bold';
    }
    if (!shiftText || shiftText.trim() === '') {
      return 'bg-white text-gray-300 hover:bg-emerald-50/50';
    }
    if (cellCustomColor === 'amber') {
      return 'bg-amber-200 text-amber-950 font-semibold border-amber-300';
    }
    if (cellCustomColor === 'blue') {
      return 'bg-sky-200 text-sky-950 font-semibold border-sky-300';
    }
    if (cellCustomColor === 'purple') {
      return 'bg-purple-200 text-purple-950 font-semibold border-purple-300';
    }
    if (cellCustomColor === 'gray' || shiftText.includes('Kết ca') || shiftText.includes('Hết ca')) {
      return 'bg-[#a3a3a3] text-gray-900 font-medium';
    }
    return 'bg-white text-gray-900 font-medium hover:bg-gray-50';
  };

  // Helper to determine if a shift includes morning hours
  const isMorningShift = (shiftText: string): boolean => {
    const text = shiftText.toLowerCase();
    if (text.includes('nghỉ') || text.includes('off')) return false;
    // Shifts like "10h - 15h", "10h - 21h", "10h - 22h", "10h - kết ca", "8h", "9h", "11h", "sáng", "trưa", "gãy"
    if (
      text.includes('10h') || 
      text.includes('8h') || 
      text.includes('9h') || 
      text.includes('11h') || 
      text.includes('12h') || 
      text.includes('sáng') || 
      text.includes('trưa') || 
      text.includes('gãy')
    ) {
      return true;
    }
    return false;
  };

  // Helper to determine if a shift includes afternoon/evening hours
  const isEveningShift = (shiftText: string): boolean => {
    const text = shiftText.toLowerCase();
    if (text.includes('nghỉ') || text.includes('off')) return false;
    // Shifts starting around afternoon/evening: 17h, 18h, 19h, 20h, chiều, tối
    if (
      text.includes('17h') || 
      text.includes('17 -') || 
      text.includes('18h') || 
      text.includes('19h') || 
      text.includes('20h') || 
      text.includes('chiều') || 
      text.includes('tối')
    ) {
      return true;
    }
    // Shifts extending to closing: kết ca, hết ca, 21h, 22h, gãy
    if (
      text.includes('kết ca') || 
      text.includes('hết ca') || 
      text.includes('21h') || 
      text.includes('22h') || 
      text.includes('gãy')
    ) {
      return true;
    }
    return false;
  };

  // Daily statistics broken down into Morning (NV + Bếp) and Evening (NV + Bếp)
  const getDayStats = (dayOfWeek: number) => {
    let morningNV = 0;
    let morningBep = 0;
    let eveningNV = 0;
    let eveningBep = 0;
    let offCount = 0;

    visibleEmployees.forEach((emp) => {
      const a = getAssignment(emp.id, dayOfWeek);
      if (!a || !a.shiftText || a.shiftText.trim() === '') return;

      const isOff = a.isOff || a.shiftText.toLowerCase().includes('nghỉ') || a.shiftText.toLowerCase().includes('off');
      if (isOff) {
        offCount++;
        return;
      }

      const isBep = (emp.role || '').toLowerCase().includes('bếp');

      if (isMorningShift(a.shiftText)) {
        if (isBep) morningBep++;
        else morningNV++;
      }

      if (isEveningShift(a.shiftText)) {
        if (isBep) eveningBep++;
        else eveningNV++;
      }
    });

    return { morningNV, morningBep, eveningNV, eveningBep, offCount };
  };

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    if (onAddEmployee) {
      onAddEmployee(newEmpName.trim(), newEmpRole);
    }
    setNewEmpName('');
    setNewEmpRole('Nhân viên');
    setShowAddEmpModal(false);
  };

  return (
    <div className="relative">
      {/* CAPTURE ZONE: Entire schedule designed to look like a high-end restaurant poster when screenshotted */}
      <div
        ref={scheduleRef}
        className="bg-white p-5 md:p-6 rounded-2xl shadow-md border border-slate-300 select-none overflow-x-auto text-slate-800"
      >
        {/* Top Header Tab like Google Sheet */}
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-[#245839] text-white px-3 py-1.5 text-xs font-semibold rounded-t-md inline-flex items-center gap-1.5 shadow-2xs">
            <span>Lịch làm hằng tuần</span>
            <span className="text-[10px] opacity-80">▼</span>
          </div>
        </div>

        {/* Main Schedule Table */}
        <table className="w-full border-collapse border-2 border-gray-600 text-sm">
          <thead>
            <tr className="bg-[#204d30] text-white select-none">
              <th className="border border-gray-500 py-3 px-4 font-bold text-center min-w-[130px] text-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <span>Nhân viên</span>
                  <span className="text-[10px] opacity-75">▼</span>
                </div>
              </th>
              {DAYS.map((day, idx) => (
                <th
                  key={day.dayOfWeek}
                  className="border border-gray-500 py-3 px-3 font-bold text-center min-w-[115px] text-sm"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{day.name}</span>
                    <span className="text-[10px] opacity-75">▼</span>
                  </div>
                  <div className="text-[11px] font-semibold text-green-200">
                    ({getDayDate(idx)})
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((emp, index) => (
              <tr 
                key={emp.id} 
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-emerald-50/30 transition-colors group`}
              >
                {/* Employee Name + Role Toggle Badge + Hide / Delete Buttons */}
                <td className="border border-gray-500 py-3.5 px-3 text-center bg-white font-bold text-gray-950 text-sm md:text-base">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{emp.fullName}</span>
                    {onToggleEmployeeRole && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleEmployeeRole(emp.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer select-none ${
                          (emp.role || '').toLowerCase().includes('bếp')
                            ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Bấm để đổi vai trò (Nhân viên / Bếp)"
                      >
                        {(emp.role || '').toLowerCase().includes('bếp') ? 'Bếp' : 'NV'}
                      </button>
                    )}
                    {onHideEmployee && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHideEmployee(emp.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 p-0.5 transition cursor-pointer"
                        title={`Tạm ẩn ${emp.fullName} khỏi lịch tuần này (có thể mở lại bất cứ lúc nào)`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteEmployee && visibleEmployees.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Xóa hoàn toàn nhân viên ${emp.fullName} khỏi hệ thống?`)) onDeleteEmployee(emp.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-0.5 transition cursor-pointer"
                        title="Xóa hẳn nhân viên này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Day Columns */}
                {DAYS.map((day) => {
                  const assignment = getAssignment(emp.id, day.dayOfWeek);
                  const shiftText = assignment?.shiftText || '';
                  const isOff = assignment?.isOff || false;
                  const customColor = assignment?.customColor;
                  const cellClass = getCellStyle(shiftText, isOff, customColor);

                  return (
                    <td
                      key={day.dayOfWeek}
                      onClick={() => handleCellClick(emp.id, emp.fullName, day.dayOfWeek, day.name)}
                      className={`border border-gray-500 py-3.5 px-2 text-center cursor-pointer transition-all duration-150 ${cellClass}`}
                      title="Bấm để chỉnh sửa hoặc tự nhập ca làm"
                    >
                      <div className="min-h-[22px] flex items-center justify-center font-bold text-sm tracking-tight text-gray-950 leading-tight">
                        {isOff || shiftText.trim().toLowerCase() === 'nghỉ' || shiftText.trim().toLowerCase() === 'off' ? (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        ) : shiftText ? (
                          <span>{shiftText}</span>
                        ) : (
                          <span className="text-gray-300 text-xs font-normal">--</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Daily Stats Summary: Sáng (NV, Bếp) & Chiều (NV, Bếp) */}
            {/* 1. Ca Sáng */}
            <tr className="bg-amber-50/70 border-t-2 border-gray-600 text-xs text-slate-800">
              <td className="border border-gray-500 py-2.5 px-2 text-center font-extrabold bg-amber-100 text-amber-950 whitespace-nowrap">
                ☀️ Ca Sáng
              </td>
              {DAYS.map((day) => {
                const stats = getDayStats(day.dayOfWeek);
                return (
                  <td key={day.dayOfWeek} className="border border-gray-500 py-2 px-1 text-center font-bold">
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <span className="font-extrabold text-slate-900">{stats.morningNV} NV</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-extrabold text-amber-800">{stats.morningBep} Bếp</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* 2. Ca Chiều */}
            <tr className="bg-sky-50/70 border-t border-gray-400 text-xs text-slate-800">
              <td className="border border-gray-500 py-2.5 px-2 text-center font-extrabold bg-sky-100 text-sky-950 whitespace-nowrap">
                🌙 Ca Chiều
              </td>
              {DAYS.map((day) => {
                const stats = getDayStats(day.dayOfWeek);
                return (
                  <td key={day.dayOfWeek} className="border border-gray-500 py-2 px-1 text-center font-bold">
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <span className="font-extrabold text-slate-900">{stats.eveningNV} NV</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-extrabold text-amber-800">{stats.eveningBep} Bếp</span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* 3. Nghỉ (OFF) */}
            <tr className="bg-slate-50 border-t border-gray-400 text-[11px] text-slate-600">
              <td className="border border-gray-500 py-1.5 px-2 text-center font-bold bg-slate-200 text-slate-800 whitespace-nowrap">
                Nghỉ (OFF)
              </td>
              {DAYS.map((day) => {
                const stats = getDayStats(day.dayOfWeek);
                return (
                  <td key={day.dayOfWeek} className="border border-gray-500 py-1 px-1 text-center">
                    {stats.offCount > 0 ? (
                      <span className="font-black text-red-600 text-xs">{stats.offCount} nghỉ</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Action Bar: Danh sách nhân viên tạm ẩn + Nút Thêm nhân viên */}
      <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Khu vực danh sách nhân viên đang bị ẩn (nếu có) */}
        {hiddenEmployees.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 shrink-0">
              <EyeOff className="w-4 h-4 text-amber-700" />
              <span>Đang tạm ẩn ({hiddenEmployees.length}):</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {hiddenEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => onUnhideEmployee && onUnhideEmployee(emp.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg border border-amber-300 font-bold transition shadow-2xs cursor-pointer group"
                  title={`Bấm vào đây để lôi ${emp.fullName} trở lại bảng lịch tuần này`}
                >
                  <span>{emp.fullName}</span>
                  <span className="text-[10px] text-amber-700 font-normal">
                    ({(emp.role || '').toLowerCase().includes('bếp') ? 'Bếp' : 'NV'})
                  </span>
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 ml-0.5" />
                </button>
              ))}
            </div>
            {onUnhideAllEmployees && hiddenEmployees.length > 1 && (
              <button
                onClick={onUnhideAllEmployees}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline ml-auto cursor-pointer px-1"
              >
                Hiện lại tất cả
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 italic">
            <span>💡 Mẹo: Rê chuột vào tên nhân viên để Đổi vai trò [NV/Bếp], Tạm ẩn tuần này hoặc Xóa.</span>
          </div>
        )}

        {/* Nút thêm nhân viên mới */}
        {onAddEmployee && (
          <div className="shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowAddEmpModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:border-emerald-600 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>+ Thêm Nhân Viên Mới</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL: CUSTOM SHIFT & PRESET PICKER */}
      {selectedCell && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Xếp Ca: {selectedCell.employeeName}</span>
                </h3>
                <p className="text-xs text-emerald-200 font-medium mt-0.5">
                  Ngày làm việc: <b>{selectedCell.dayName}</b>
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'custom'
                    ? 'bg-white text-emerald-800 border-b-2 border-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>✍️ Tự nhập ca riêng</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                  Tùy chỉnh
                </span>
              </button>
              <button
                onClick={() => setActiveTab('preset')}
                className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'preset'
                    ? 'bg-white text-emerald-800 border-b-2 border-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>⚡ Ca mẫu có sẵn</span>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* TAB 1: CUSTOM INPUT FORM */}
              {activeTab === 'custom' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nội dung ca làm (Gõ tự do bất kỳ khung giờ nào):
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={customShiftText}
                      onChange={(e) => setCustomShiftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCustomShift();
                        }
                      }}
                      placeholder="VD: 11h - 16h, Ca gãy 10h-14h & 18h-22h, 8h30-Hết ca..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-semibold"
                    />
                  </div>

                  {/* Quick Shortcut Buttons to insert common hours */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      Gợi ý mốc giờ chèn nhanh:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['11h - 15h', '11h - 16h', '18h - 23h', 'Ca gãy: 10h-14h & 18h-22h', '8h30 - Hết ca', 'Trực tiệc tối'].map((hint) => (
                        <button
                          key={hint}
                          type="button"
                          onClick={() => setCustomShiftText(hint)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-600 text-[11px] font-medium transition"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Is Off (Red highlight) */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                    <div>
                      <div className="text-xs font-bold text-red-900">Đánh dấu là Nghỉ (Tô đỏ)</div>
                      <div className="text-[11px] text-red-700">Ô này sẽ được tô đỏ rực rỡ như ảnh mẫu</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customIsOff}
                        onChange={(e) => setCustomIsOff(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* Choose Color Theme if not off */}
                  {!customIsOff && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Màu sắc hiển thị của ô:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setCustomColor(c.value)}
                            className={`p-2 rounded-lg text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 ${c.bg} ${c.text} ${
                              customColor === c.value ? 'ring-2 ring-emerald-600 ring-offset-1 border-emerald-600' : 'border-slate-300'
                            }`}
                          >
                            <span>{c.label}</span>
                            {customColor === c.value && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batch apply to other days */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Áp dụng ca này cho nhiều ngày của {selectedCell.employeeName}:</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => {
                        const isChecked = applyDays.includes(d.dayOfWeek);
                        return (
                          <button
                            key={d.dayOfWeek}
                            type="button"
                            onClick={() => handleToggleApplyDay(d.dayOfWeek)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                              isChecked
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApplyCustomShift}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Xác nhận & Lưu ca</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCell}
                      className="px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition"
                      title="Xóa trống ô này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: PRESET SHIFTS */}
              {activeTab === 'preset' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500 font-medium">
                    Chọn nhanh một trong các ca làm việc mẫu:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {shifts.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectPreset(s.name, s.isOff)}
                        className={`py-2.5 px-3.5 rounded-xl text-sm font-bold transition-all border text-left flex items-center justify-between ${
                          s.isOff
                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                            : s.name.includes('Kết ca') || s.name.includes('Hết ca')
                            ? 'bg-neutral-300 hover:bg-neutral-400 text-neutral-900 border-neutral-400'
                            : 'bg-white hover:bg-slate-100 text-gray-800 border-slate-300'
                        }`}
                      >
                        <span>{s.name}</span>
                        {s.isOff && (
                          <span className="text-[11px] bg-red-800 text-white px-2 py-0.5 rounded-full font-black">
                            TÔ ĐỎ
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleClearCell}
                      className="py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      Xóa ca (để trống)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('custom')}
                      className="py-2 px-3 text-xs font-bold text-emerald-700 hover:underline"
                    >
                      ✍️ Chuyển sang tự gõ giờ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD EMPLOYEE */}
      {showAddEmpModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowAddEmpModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>Thêm Nhân Viên Mới</span>
              </h3>
              <button
                onClick={() => setShowAddEmpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên nhân viên mới (VD: Tuấn, Mai, Linh...):
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="Nhập tên nhân viên"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bộ phận làm việc:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewEmpRole('Nhân viên')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      newEmpRole === 'Nhân viên'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Nhân viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEmpRole('Bếp')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      newEmpRole === 'Bếp'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Bếp
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  Xác nhận thêm
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
