# Classroom Asset Maintenance Decision Support System (DSS) — VNU-IS Group 2 (INS3282)

Hệ thống Hỗ trợ Quyết định Bảo trì Thiết bị Phòng học tại Trường Quốc tế — ĐHQGHN.
Ứng dụng Full-stack kết hợp: **Node.js (Express REST API)** + **MySQL 8.0 / XAMPP** + **Frontend HTML5 / Tailwind CSS (Client-side JS)**.

---

## 📑 MỤC LỤC
1. [Yêu cầu tiền đề (Prerequisites)](#1-yêu-cầu-tiền-đề-prerequisites)
2. [Cài đặt & Khởi chạy Cơ sở Dữ liệu (Database)](#2-cài-đặt--khởi-chạy-cơ-sở-dữ-liệu-database)
3. [Cấu hình & Khởi chạy Backend (Node.js API)](#3-cấu-hình--khởi-chạy-backend-nodejs-api)
4. [Khởi chạy Frontend (Giao diện Web)](#4-khởi-chạy-frontend-giao-diện-web)
5. [Tài khoản đăng nhập thử nghiệm (Test Accounts)](#5-tài-khoản-đăng-nhập-thử-nghiệm-test-accounts)
6. [Cấu trúc thư mục (Directory Structure)](#6-cấu-trúc-thư-mục-directory-structure)
7. [Các tính năng Hệ Hỗ trợ Quyết định (DSS Features)](#7-các-tính-năng-hệ-hỗ-trợ-quyết-định-dss-features)


---

## 1. Yêu cầu tiền đề (Prerequisites)

Trước khi bắt đầu cài đặt, hãy đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:
- **Node.js**: phiên bản LTS (khuyên dùng v18+ hoặc v20+). Tải tại [https://nodejs.org/](https://nodejs.org/)
- **MySQL Server** hoặc **XAMPP**: để quản lý cơ sở dữ liệu MySQL.
- **VS Code**: Trình soạn thảo mã nguồn kèm extension **Live Server** (của *Ritwick Dey*).

---

## 2. Cài đặt & Khởi chạy Cơ sở Dữ liệu (Database)

Dự án sử dụng cơ sở dữ liệu MySQL với schema chuẩn đã có sẵn dữ liệu mẫu (Seed Data).

### Cách 1: Import bằng phpMyAdmin (Khuyên dùng cho XAMPP)
1. Mở **XAMPP Control Panel** ➔ Bấm **Start** ở ô **Apache** và **MySQL**.
2. Truy cập trình duyệt tại địa chỉ: `http://localhost/phpmyadmin`
3. Nhấp vào tab **Databases** (Cơ sở dữ liệu) ➔ Tạo cơ sở dữ liệu mới có tên: `vnuis_asset_maintenance_dss`
4. Chọn database `vnuis_asset_maintenance_dss` vừa tạo ở danh sách bên trái ➔ Chọn tab **Import** (Nhập) phía trên.
5. Bấm **Choose File** (Chọn Tệp) ➔ Chọn file:
   ```text
   backend/database/vnuis_asset_maintenance_dss.sql
   ```
6. Cuộn xuống cuối trang và bấm **Import** (hoặc **Go**).

### Cách 2: Import bằng Command Line (MySQL CLI)
Mở cửa sổ Command Prompt / Terminal và chạy lệnh:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vnuis_asset_maintenance_dss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p vnuis_asset_maintenance_dss < backend/database/vnuis_asset_maintenance_dss.sql
```

---

## 3. Cấu hình & Khởi chạy Backend (Node.js API)

### Bước 3.1: Di chuyển vào thư mục backend
Mở Terminal trong VS Code (`Ctrl + ~`) và di chuyển vào thư mục `backend`:
```cmd
cd backend
```

### Bước 3.2: Tạo file cấu hình môi trường `.env`
Tạo một file có tên `.env` ngay trong thư mục `backend` (cùng cấp với `package.json`) với nội dung:
```env
# --- Server ---
PORT=4000
NODE_ENV=development
CORS_ORIGIN=*

# --- Database (MySQL XAMPP / Local) ---
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=vnuis_asset_maintenance_dss

# --- Auth ---
JWT_SECRET=vnuis_secret_key_2024
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=10
```

### Bước 3.3: Cài đặt thư viện dependencies
```cmd
npm install
```

### Bước 3.4: Khởi chạy Backend Server
```cmd
npm run dev
```

> 💡 **Ghi chú tự động:** Khi server khởi chạy, ứng dụng sẽ tự động kiểm tra và mã hóa mật khẩu mặc định **`123456`** cho tất cả các tài khoản thử nghiệm có sẵn trong database.
> 
> Kiểm tra log thành công tại Terminal:
> ```text
> [DB] Connected to MySQL database "vnuis_asset_maintenance_dss" at localhost:3306
> [DB] Updated default password (123456) for 5 user(s).
> [Server] VNUIS Asset Maintenance DSS API running on http://localhost:4000
> [Server] Health check: http://localhost:4000/health
> ```

---

## 4. Khởi chạy Frontend (Giao diện Web)

Frontend là tập hợp các trang tĩnh HTML5 + Tailwind CSS + Vanilla JS.


1. Trong VS Code, mở cây thư mục `frontend/users/`.
2. Click chuột phải vào file [Login.html](file:///d:/asset-Project2/Project2/frontend/users/Login.html).
3. Chọn **Open with Live Server**.
4. Trình duyệt sẽ tự mở giao diện tại `http://127.0.0.1:5500/frontend/users/Login.html` (hoặc cổng `5501`).

---

## 5. Tài khoản đăng nhập thử nghiệm (Test Accounts)

Sau khi khởi chạy hệ thống, bạn có thể đăng nhập bằng các tài khoản mẫu dưới đây với **Mật khẩu dùng chung:** **`123456`**

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Trang chuyển hướng sau đăng nhập |
| :--- | :--- | :--- | :--- |
| **Manager** (Quản lý) | `manager.e@vnuis.edu.vn` | `123456` | `frontend/managers/ManagerDashboard.html` |
| **Technician** (Kỹ thuật viên) | `tech.c@vnuis.edu.vn` | `123456` | `frontend/technicians/TechnicianDashboard.html` |
| **Technician** (Kỹ thuật viên) | `tech.d@vnuis.edu.vn` | `123456` | `frontend/technicians/TechnicianDashboard.html` |
| **User** (Giảng viên) | `lecturer.a@vnuis.edu.vn` | `123456` | `frontend/users/Dashboard.html` |
| **User** (Sinh viên) | `student.b@vnuis.edu.vn` | `123456` | `frontend/users/Dashboard.html` |

---

## 6. Cấu trúc thư mục (Directory Structure)

```text
Project2/
├── backend/
│   ├── database/
│   │   └── vnuis_asset_maintenance_dss.sql   # Schema MySQL + Views + Triggers + Seed Data
│   ├── src/
│   │   ├── config/                           # Kết nối MySQL Pool & biến môi trường env
│   │   ├── middlewares/                      # Xử lý JWT Auth, Phân quyền RBAC, Error Handler
│   │   ├── modules/                          # 11 Module nghiệp vụ REST API
│   │   │   ├── auth/                         # Đăng nhập & Xác thực JWT
│   │   │   ├── users/                        # Quản lý người dùng
│   │   │   ├── classrooms/                   # Quản lý phòng học
│   │   │   ├── assets/                       # Quản lý thiết bị
│   │   │   ├── faultReports/                 # Báo cáo sự cố + DSS1 (Priority)
│   │   │   ├── workOrders/                   # Phiếu sửa chữa + DSS2 (Assignment)
│   │   │   ├── confirmations/                # Người dùng nghiệm thu
│   │   │   ├── notifications/                # Thông báo hệ thống
│   │   │   ├── qrcodes/                      # Sinh mã QR phòng học
│   │   │   ├── dashboard/                    # Thống kê KPI, MTTR & DSS3 (Replacement)
│   │   │   └── auditLog/                     # Ghi nhật ký hệ thống
│   │   ├── app.js                            # Cấu hình Express application
│   │   └── server.js                         # Entry point khởi chạy server
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── assets/
│   │   └── js/                               # Modules JS xử lý gọi API & UI State
│   │       ├── api.js                        # Wrapper fetch API gắn Token JWT Header
│   │       ├── auth.js                       # Quản lý Login/Logout, Auth Guard theo Role
│   │       ├── layout.js                     # Load sidebar/topbar động theo vai trò
│   │       └── ui-helpers.js                 # Thông báo Toast, Format ngày tháng
│   ├── partials/                             # Header/Sidebar dùng chung
│   ├── users/                                # Giao diện cho Giảng viên / Sinh viên (8 trang)
│   ├── technicians/                          # Giao diện cho Kỹ thuật viên (9 trang)
│   └── managers/                             # Giao diện cho Quản lý (18 trang)
│
├── PROJECT_PLAN.md                           # Chi tiết kế hoạch kiến trúc & Phân rã pha
└── README.md                                 # Tài liệu hướng dẫn cài đặt & vận hành
```

---

## 7. Các tính năng Hệ Hỗ trợ Quyết định (DSS Features)

1. **DSS1 — Tự động tính Mức ưu tiên sự cố (Priority Assignment):**
   * Vị trí: `backend/src/modules/faultReports/priority.service.js`
   * Tự động tính điểm số ưu tiên khi User tạo báo cáo sự cố dựa trên loại thiết bị, vị trí phòng học và mức độ ảnh hưởng.
2. **DSS2 — Gợi ý Kỹ thuật viên phù hợp (Smart Assignment Recommendation):**
   * Vị trí: `backend/src/modules/workOrders/assignment.service.js`
   * Dựa trên View MySQL `v_dss2_technician_workload` để đề xuất KTV có số lượng công việc đang xử lý thấp nhất và khớp chuyên môn với thiết bị hỏng.
3. **DSS3 — Cảnh báo Đề xuất Thay thế Thiết bị (Asset Replacement Alert):**
   * Vị trí: Trigger MySQL `trg_assets_before_update_dss3` & View `v_dss3_replacement_alerts`
   * Tự động tính số lần hỏng hóc và chuyển trạng thái thiết bị sang `Recommended for Replacement` khi vượt quá ngưỡng bảo trì quy định.

