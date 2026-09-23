# Tang2Manager - Quản Lý Lịch Làm Nhân Viên Nhà Hàng

Hệ thống quản lý và xếp lịch làm việc nhân viên nhà hàng theo tuần với chức năng xuất ảnh chụp lịch chuẩn nét gửi Zalo/Messenger 1-click.

---

## 📁 Cấu Trúc Thư Mục Chuẩn

```
Tang2Manager/
├── backend/                               # ASP.NET Core 9 Web API
│   ├── Tang2Manager.sln                   # Visual Studio Solution
│   └── Tang2Manager.API/
│       ├── Controllers/                   # API Endpoints (EmployeesController, SchedulesController)
│       ├── Models/                        # Entities (Employee, ShiftTemplate, WeeklySchedule, Assignment)
│       ├── Data/                          # EF Core AppDbContext & Database Seeding
│       ├── DTOs/                          # Data Transfer Objects
│       ├── appsettings.json               # Cấu hình kết nối SQL Server
│       └── Program.cs                     # Cấu hình CORS, DI, Pipeline
│
├── frontend/                              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   └── schedule/
│   │   │       └── ScheduleTable.tsx      # Bảng lịch làm việc phong cách Google Sheets
│   │   ├── services/
│   │   │   └── api.ts                     # Gọi API backend (Axios)
│   │   ├── types/
│   │   │   └── index.ts                   # Định nghĩa kiểu dữ liệu TypeScript
│   │   ├── utils/
│   │   │   └── screenshot.ts              # Chụp ảnh nét cao & Copy vào Clipboard (html-to-image)
│   │   ├── App.tsx                        # Giao diện chính điều hướng tuần & thanh công cụ
│   │   └── index.css                      # Tailwind CSS v4 styling
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🚀 Hướng Dẫn Chạy Hệ Thống

### 1. Khởi động Backend (ASP.NET Core Web API)
```bash
cd backend/Tang2Manager.API
dotnet run
```
* Backend sẽ tự động kết nối **SQL Server** (`Server=localhost;Database=Tang2ManagerDb;Trusted_Connection=True;TrustServerCertificate=True;`) và khởi tạo sẵn bảng biểu + dữ liệu mẫu (Quang, Hiền, Ngọc Anh, Minh Ánh, Hà...).

### 2. Khởi động Frontend (React)
```bash
cd frontend
npm run dev
```
* Truy cập ứng dụng tại: `http://localhost:5173`

---

## 🌟 Các Tính Năng Nổi Bật Đã Tích Hợp Sẵn

1. **Giao diện bảng lịch giống hệt ảnh mẫu**:
   * Header xanh lá chuẩn phong cách Google Sheets: "Nhân viên", "Thứ 2" -> "Chủ nhật".
   * Tô màu thông minh:
     * **Nghỉ (OFF)**: Tự động tô đỏ rực rỡ nổi bật.
     * **Ca Kết ca / Hết ca**: Nền màu xám dịu mắt.
     * **Ca khung giờ**: Nền trắng rõ nét.
2. **Chụp ảnh 1-click xuất lịch cực nét**:
   * **📋 Copy Ảnh Gửi Zalo**: Nhấn 1 nút là ảnh lịch được lưu vào Clipboard, bạn mở khung chat Zalo/Facebook và ấn `Ctrl + V` là gửi được ngay.
   * **📸 Tải Ảnh PNG**: Xuất file ảnh PNG độ nét cao (2x Retina) không bị mờ chữ khi gửi qua mạng xã hội.
3. **Chuyển tuần linh hoạt**:
   * Xem và chỉnh sửa theo tuần: *Tuần trước*, *Tuần hiện tại*, *Tuần sau*.
4. **Click chọn ca nhanh**:
   * Nhấp chuột vào bất kỳ ô nào để chọn nhanh ca làm việc từ danh mục có sẵn.
