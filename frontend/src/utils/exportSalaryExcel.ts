import * as XLSX from 'xlsx';
import type { Employee, DailyTimesheet } from '../types';

interface SalarySummaryItem {
  id: number;
  name: string;
  role: string;
  hourlyRate: number;
  totalHours: number;
  hoursPay: number;
  baseSalary: number;
  debtAmount: number;
  debtNote?: string;
  totalSalary: number;
}

export const exportSalaryToExcel = (
  month: number,
  year: number,
  summaryData: SalarySummaryItem[],
  timesheets: Record<number, DailyTimesheet[]>,
  employees: Employee[]
) => {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: BẢNG LƯƠNG TỔNG HỢP GỬI SẾP
  // ==========================================
  const totalAllHours = summaryData.reduce((s, e) => s + e.totalHours, 0);
  const totalHoursPay = summaryData.reduce((s, e) => s + e.hoursPay, 0);
  const totalBaseSalary = summaryData.reduce((s, e) => s + e.baseSalary, 0);
  const totalDebt = summaryData.reduce((s, e) => s + e.debtAmount, 0);
  const totalFinalPayout = summaryData.reduce((s, e) => s + e.totalSalary, 0);

  const sheet1Data: (string | number)[][] = [
    ['NHÀ HÀNG TẦNG 2 - BẢNG THANH TOÁN TIỀN LƯƠNG NHÂN VIÊN'],
    [`Kỳ lương: Tháng ${month} năm ${year} | Ngày xuất file: ${new Date().toLocaleDateString('vi-VN')}`],
    [''], // blank line
    [
      'STT',
      'Mã NV',
      'Họ và tên nhân viên',
      'Bộ phận / Vị trí',
      'Lương theo giờ (VNĐ)',
      'Tổng giờ làm (Tiếng)',
      'Thành tiền giờ (VNĐ)',
      'Lương cứng (VNĐ)',
      'Công nợ / Tạm ứng (VNĐ)',
      'Ghi chú công nợ',
      'TỔNG LƯƠNG THỰC LĨNH (VNĐ)',
      'Ký nhận',
    ],
  ];

  summaryData.forEach((emp, index) => {
    sheet1Data.push([
      index + 1,
      `NV${String(emp.id).padStart(3, '0')}`,
      emp.name,
      emp.role || 'Nhân viên',
      emp.hourlyRate,
      emp.totalHours,
      emp.hoursPay,
      emp.baseSalary > 0 ? emp.baseSalary : 0,
      emp.debtAmount > 0 ? emp.debtAmount : 0,
      emp.debtNote || '',
      emp.totalSalary,
      '',
    ]);
  });

  // Hàng Tổng cộng
  sheet1Data.push([
    'TỔNG CỘNG',
    '',
    `${summaryData.length} nhân sự`,
    '',
    '',
    totalAllHours,
    totalHoursPay,
    totalBaseSalary,
    totalDebt,
    '',
    totalFinalPayout,
    '',
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set column widths for Sheet 1
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Mã NV
    { wch: 22 }, // Họ tên
    { wch: 16 }, // Bộ phận
    { wch: 18 }, // Lương/h
    { wch: 18 }, // Tổng giờ
    { wch: 20 }, // Thành tiền giờ
    { wch: 16 }, // Lương cứng
    { wch: 20 }, // Công nợ
    { wch: 24 }, // Ghi chú công nợ
    { wch: 26 }, // Tổng thực lĩnh
    { wch: 16 }, // Ký nhận
  ];

  XLSX.utils.book_append_sheet(wb, ws1, `Bang_Luong_Thang_${month}_${year}`);

  // ==========================================
  // SHEET 2: BẢNG CHẤM CÔNG CHI TIẾT TỪNG NGÀY
  // ==========================================
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayHeaders = ['STT', 'Mã NV', 'Họ và tên nhân viên', 'Vị trí'];
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders.push(`Ngày ${d}`);
  }
  dayHeaders.push('Tổng Giờ Làm');

  const sheet2Data: (string | number)[][] = [
    [`BẢNG CHẤM CÔNG CHI TIẾT HÀNG NGÀY - THÁNG ${month}/${year}`],
    [''],
    dayHeaders,
  ];

  employees.forEach((emp, index) => {
    const ts = timesheets[emp.id] || [];
    const dayMap = new Map<number, { hours: number; isOff: boolean; text: string }>();
    ts.forEach((t) => {
      dayMap.set(t.day, {
        hours: t.totalHours,
        isOff: t.isOff,
        text: t.isOff ? 'OFF' : (t.totalHours > 0 ? `${t.totalHours}h` : ''),
      });
    });

    const row: (string | number)[] = [
      index + 1,
      `NV${String(emp.id).padStart(3, '0')}`,
      emp.fullName,
      emp.role || 'Nhân viên',
    ];

    let empTotalHours = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const entry = dayMap.get(d);
      if (entry) {
        if (!entry.isOff && entry.hours > 0) {
          empTotalHours += entry.hours;
          row.push(entry.hours);
        } else if (entry.isOff) {
          row.push('OFF');
        } else {
          row.push('');
        }
      } else {
        row.push('');
      }
    }
    row.push(empTotalHours);
    sheet2Data.push(row);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 22 },
    { wch: 14 },
    ...Array(daysInMonth).fill({ wch: 8 }),
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Cham_Cong_Chi_Tiet');

  // Trigger download
  const fileName = `Bang_Luong_Nha_Hang_Tang_2_Thang_${month}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
