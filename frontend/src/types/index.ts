export interface Employee {
  id: number;
  fullName: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  displayOrder: number;
}

export interface ShiftTemplate {
  id: number;
  name: string;
  startTime?: string;
  endTime?: string;
  bgColor: string;
  textColor: string;
  isOff: boolean;
  displayOrder: number;
}

export interface Assignment {
  id?: number;
  employeeId: number;
  employeeName?: string;
  dayOfWeek: number; // 1: Thứ 2, 2: Thứ 3, ..., 6: Thứ 7, 0: Chủ nhật
  date: string;
  shiftText: string;
  isOff: boolean;
  customColor?: string;
  note?: string;
}

export interface WeeklySchedule {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  year: number;
  note?: string;
  employees: Employee[];
  assignments: Assignment[];
}
