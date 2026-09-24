export interface Employee {
  id: number;
  fullName: string;
  phoneNumber?: string;
  role: string;
  hourlyRate?: number; // Lương theo giờ (VD: 40000, 35000, 30000)
  baseSalary?: number; // Lương cứng (VD: 3000000)
  isActive: boolean;
  displayOrder: number;
}

export interface DailyTimesheet {
  id?: number;
  employeeId: number;
  day: number; // 1 to 31
  dateStr: string; // "1/9", "2/9", ...
  startTime: string; // "17h", "10h", ""
  endTime: string; // "23h", "22h30", "00h", ""
  totalHours: number; // 6, 7, 4.5, 11.5
  hourlyRate: number; // 40000
  dailyPay: number; // totalHours * hourlyRate
  isOff: boolean; // true -> tô đỏ như ảnh
}

export interface EmployeeMonthlySalary {
  employeeId: number;
  employeeName: string;
  role: string;
  hourlyRate: number;
  baseSalary: number;
  debtAmount: number;
  debtNote?: string;
  totalHours: number;
  hoursPay: number; // totalHours * hourlyRate
  totalSalary: number; // hoursPay + baseSalary - debtAmount
}

export interface MonthlyPayrollRecord {
  employeeId: number;
  fullName: string;
  role: string;
  year: number;
  month: number;
  hourlyRate: number;
  baseSalary: number;
  debtAmount: number;
  debtNote?: string;
  totalHours: number;
  totalSalary: number;
  timesheetDetailsJson?: string | null;
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

export interface InvoiceCategory {
  id: number;
  name: string;
  categoryType: 'Daily' | 'Supplier';
  isPaid: boolean;
  displayOrder: number;
  fixedAmount: number;
  totalAmount?: number;
  itemCount?: number;
}

export interface InvoiceItem {
  id: number;
  categoryId: number;
  dateStr: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  totalPayment: number;
  displayOrder: number;
  note?: string;
}

