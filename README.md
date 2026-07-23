# Classroom Asset Maintenance DSS — VNU-IS Group 2 (INS3282)

Full-stack implementation theo `PROJECT_PLAN.md`: Node.js/Express REST API + MySQL 8.0 + frontend HTML/Tailwind tĩnh.

## 1. Cài đặt Database

```bash
mysql -u root -p < backend/database/vnuis_asset_maintenance_dss.sql
```

Script đã bao gồm seed data mẫu (Users với password_hash là placeholder — xem bước 3 để tạo tài khoản thật).

## 2. Chạy Backend

```bash
cd backend
cp .env.example .env
# Sửa .env: DB_USER, DB_PASSWORD, DB_NAME cho khớp máy bạn
npm install
npm run dev
```

Backend chạy tại `http://localhost:4000`. Kiểm tra: `GET http://localhost:4000/health`.

### Tạo tài khoản đăng nhập đầu tiên

Dữ liệu seed trong file `.sql` dùng `password_hash` là placeholder (chưa hash thật). Cách nhanh nhất để có tài khoản Manager đăng nhập được:

```sql
-- Chạy trong MySQL, thay YOUR_BCRYPT_HASH bằng hash thật (xem lệnh node bên dưới)
UPDATE Users SET password_hash = 'YOUR_BCRYPT_HASH' WHERE email = 'manager email của bạn';
```

Sinh bcrypt hash nhanh bằng Node (trong thư mục `backend`):

```bash
node -e "require('bcryptjs').hash('YourPassword123', 10).then(console.log)"
```

Hoặc đơn giản hơn: đăng nhập bằng một Manager có sẵn, vào **Users Management → Add New User** để tạo tài khoản mới (API tự hash password đúng cách).

## 3. Chạy Frontend

Frontend là file tĩnh — chỉ cần 1 static server đơn giản (Live Server extension của VSCode, hoặc):

```bash
cd frontend
npx serve -l 5500
```

Mở `http://localhost:5500/users/Login.html`.

**Quan trọng:** `frontend/assets/js/config.js` đang trỏ `API_BASE_URL` tới `http://localhost:4000/api/v1`. Nếu chạy frontend ở port khác 5500, cập nhật lại `CORS_ORIGIN` trong `backend/.env` cho khớp.

## 4. Cấu trúc thư mục

Xem chi tiết trong `PROJECT_PLAN.md`. Tóm tắt:

```
backend/
  src/
    config/       - kết nối DB, đọc .env
    middlewares/  - auth (JWT), role (RBAC), error handler
    modules/      - 9 module nghiệp vụ (auth, users, classrooms, assets,
                    faultReports [+ DSS1], workOrders [+ DSS2], confirmations,
                    notifications, qrcodes, dashboard, auditLog)
  database/       - file .sql gốc

frontend/
  assets/js/      - api.js, auth.js, layout.js, notifications.js, ui-helpers.js, theme.config.js
  partials/       - sidebar theo 3 vai trò + topbar dùng chung
  users/          - 8 trang (Login dùng chung cho cả 3 vai trò)
  technicians/    - 9 trang
  managers/       - 18 trang
```

## 5. Ghi chú quan trọng

- **DSS1 (Priority):** `backend/src/modules/faultReports/priority.service.js` — tính tự động khi User submit báo cáo.
- **DSS2 (Assignment):** `backend/src/modules/workOrders/assignment.service.js` — gợi ý kỹ thuật viên khi Manager duyệt báo cáo (`PendingRequestDetail.html`).
- **DSS3 (Replacement):** hoàn toàn xử lý bằng trigger trong file `.sql` (`trg_assets_before_update_dss3`); backend chỉ đọc view `v_dss3_replacement_alerts`.
- Một số modal trong bản mockup gốc (RejectModal, EditUserModal, ViewQRModal) đã được **gộp trực tiếp vào trang cha** thay vì tách file riêng, để luồng thao tác liền mạch hơn (không mất chức năng).
- `Managers/EditAssetClass.html` (trống trong bản gốc) đã được dựng lại đầy đủ.


User: lecturer.a@vnuis.edu.vn / User123!
User: student.b@vnuis.edu.vn / User123!
Technician: tech.c@vnuis.edu.vn / Tech123!
Technician: tech.d@vnuis.edu.vn / Tech123!
Manager: manager.e@vnuis.edu.vn / Manager123!
