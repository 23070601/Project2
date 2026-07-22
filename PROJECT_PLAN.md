# KẾ HOẠCH & CẤU TRÚC CODE
## Classroom Asset Maintenance Decision Support System – VNU-IS Group 2 (INS3282)

> Dựa trên: `vnuis_asset_maintenance_dss.sql` (9 bảng, trigger, view) + 36 file mockup UI (Users/Technicians/Managers) đã có.

---

## 1. Đánh giá hiện trạng

| Thành phần | Hiện có | Vấn đề cần xử lý |
|---|---|---|
| Database | Schema MySQL 8.0 đầy đủ, trigger + view cho DSS1/2/3 | Tốt, dùng làm nền tảng luôn |
| Frontend | 36 file HTML tĩnh, Tailwind CDN, cùng design system | Mỗi file tự chứa toàn bộ header/sidebar (trùng lặp ~20 lần), không có JS thật, không link điều hướng, không gọi API, `EditAssetClass.html` trống, ảnh dùng link tạm ngoài |
| Backend | Chưa có | Phải xây từ đầu, map theo schema đã có |
| Auth/RBAC | Chưa có | Cần cho 3 vai trò User/Technician/Manager |

**Kết luận:** Việc còn lại không phải "vẽ lại UI" mà là (1) dựng backend REST API khớp với schema đã duyệt, (2) tách mockup thành layout dùng chung + gắn dữ liệu thật qua JS, (3) nối luồng điều hướng giữa các trang theo đúng vòng đời nghiệp vụ (FaultReport → WorkOrder → Confirmation).

---

## 2. Tech stack đề xuất

Chọn stack đơn giản, không cần build tool phức tạp, phù hợp đồ án môn học và khớp 100% với những gì đã có (SQL thuần, HTML/Tailwind thuần):

- **Backend:** Node.js + Express.js (REST API)
- **DB driver:** `mysql2` (dùng thẳng file `.sql` đã có, không cần ORM nặng)
- **Auth:** JWT (access token) + bcrypt cho password hash
- **Frontend:** Giữ HTML + Tailwind CDN hiện tại, nhưng:
  - Tách layout dùng chung (sidebar/header/notification dropdown) thành **partials**, nạp bằng JS (`fetch` + `innerHTML`) — không cần chuyển sang React, giữ đúng tinh thần đồ án
  - Thêm 1 file `api.js` dùng `fetch()` gọi REST API, `auth.js` xử lý JWT lưu localStorage + refresh trang theo role
- **Realtime nhẹ (tuỳ chọn):** polling `/notifications` mỗi 30s, không cần WebSocket
- **QR code:** thư viện `qrcode` (npm) để generate ảnh QR cho `GenerateClassQR.html`

---

## 3. Cấu trúc thư mục toàn dự án

```
vnuis-asset-dss/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # kết nối mysql2 pool
│   │   │   └── env.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # verify JWT
│   │   │   ├── role.middleware.js    # requireRole('Manager'|'Technician'|'User')
│   │   │   └── error.middleware.js
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.routes.js
│   │   │   │   └── auth.service.js
│   │   │   ├── users/
│   │   │   │   ├── users.controller.js
│   │   │   │   ├── users.routes.js
│   │   │   │   └── users.repository.js
│   │   │   ├── classrooms/
│   │   │   │   ├── classrooms.controller.js
│   │   │   │   ├── classrooms.routes.js
│   │   │   │   └── classrooms.repository.js
│   │   │   ├── assets/
│   │   │   │   ├── assets.controller.js
│   │   │   │   ├── assets.routes.js
│   │   │   │   └── assets.repository.js
│   │   │   ├── faultReports/
│   │   │   │   ├── faultReports.controller.js
│   │   │   │   ├── faultReports.routes.js
│   │   │   │   ├── faultReports.repository.js
│   │   │   │   └── priority.service.js       # DSS1: tính priority
│   │   │   ├── workOrders/
│   │   │   │   ├── workOrders.controller.js
│   │   │   │   ├── workOrders.routes.js
│   │   │   │   ├── workOrders.repository.js
│   │   │   │   └── assignment.service.js     # DSS2: gợi ý kỹ thuật viên
│   │   │   ├── confirmations/
│   │   │   │   ├── confirmations.controller.js
│   │   │   │   ├── confirmations.routes.js
│   │   │   │   └── confirmations.repository.js
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.controller.js
│   │   │   │   ├── notifications.routes.js
│   │   │   │   └── notifications.repository.js
│   │   │   ├── qrcodes/
│   │   │   │   ├── qrcodes.controller.js
│   │   │   │   └── qrcodes.routes.js
│   │   │   ├── auditLog/
│   │   │   │   └── auditLog.repository.js    # ghi log dùng chung, gọi từ các module khác
│   │   │   └── dashboard/
│   │   │       ├── dashboard.controller.js   # KPI cards, MTTR, downtime
│   │   │       └── dashboard.routes.js
│   │   ├── shared/
│   │   │   ├── utils/
│   │   │   │   ├── responseWrapper.js
│   │   │   │   └── validators.js
│   │   │   └── constants/
│   │   │       ├── roles.js
│   │   │       └── statusEnums.js
│   │   ├── app.js                    # khởi tạo express, gắn middlewares + routes
│   │   └── server.js                 # entry point, app.listen()
│   ├── database/
│   │   ├── vnuis_asset_maintenance_dss.sql   # (file đã có, giữ nguyên)
│   │   └── seed/                     # dữ liệu mẫu bổ sung nếu cần
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   └── theme.js              # tailwind.config (tách từ inline script hiện tại)
│   │   ├── img/                      # logo, icon thật thay cho link Google tạm
│   │   └── js/
│   │       ├── api.js                # wrapper fetch() gọi backend, gắn Bearer token
│   │       ├── auth.js               # login/logout, guard theo role, đọc JWT
│   │       ├── layout.js             # nạp partials (sidebar/header) theo role hiện tại
│   │       └── notifications.js      # polling + render dropdown thông báo
│   ├── partials/
│   │   ├── sidebar-user.html
│   │   ├── sidebar-technician.html
│   │   ├── sidebar-manager.html
│   │   ├── topbar.html
│   │   └── notification-dropdown.html
│   ├── users/                        # 8 file hiện có, refactor dùng partials + api.js
│   │   ├── Login.html
│   │   ├── Dashboard.html
│   │   ├── CreateReport.html
│   │   ├── ListReports.html
│   │   ├── ReportDetails.html
│   │   ├── Notification.html
│   │   ├── MyProfile.html
│   │   └── ChangePassword.html
│   ├── technicians/                  # 9 file hiện có
│   │   ├── TechnicianDashboard.html
│   │   ├── AssignedTasks.html
│   │   ├── WorkOrderDetails.html
│   │   ├── RejectModal.html
│   │   ├── AssetList.html
│   │   ├── AssetDetails.html
│   │   ├── AssetLookup.html
│   │   ├── Notifications.html
│   │   └── MyProfile.html
│   └── managers/                     # 19 file hiện có + 1 file cần hoàn thiện
│       ├── ManagerDashboard.html
│       ├── PendingRequest.html
│       ├── PendingRequestDetail.html
│       ├── AssignedTasks.html
│       ├── WorkOrderDetails.html
│       ├── RejectReport.html
│       ├── ClassroomsManagement.html
│       ├── ClassroomsDetail.html
│       ├── AddClassroom.html
│       ├── GenerateClassQR.html
│       ├── QRManagement.html
│       ├── ViewQRModal.html
│       ├── UsersManagement.html
│       ├── AddNewUser.html
│       ├── EditUserModal.html
│       ├── AddNewAssetClass.html
│       ├── EditAssetClass.html       # ⚠️ đang trống, cần dựng lại
│       ├── Report&Analytics.html
│       └── Notifications.html
│
├── docs/                             # 4 tutorial PDF + xlsx (đã có, giữ nguyên)
└── README.md
```

---

## 4. Mapping trang UI hiện có → API cần gắn

| Trang | Bảng/View liên quan | API cần |
|---|---|---|
| `Login.html` | Users | `POST /auth/login` |
| `Users/Dashboard.html` | FaultReports, Notifications | `GET /faultReports?reporter_id=me`, `GET /notifications/unread-count` |
| `Users/CreateReport.html` | FaultReports, Assets, Classrooms | `POST /faultReports`, `GET /classrooms`, `GET /assets?room_id=` |
| `Users/ListReports.html` / `ReportDetails.html` | FaultReports, WorkOrders | `GET /faultReports/:id`, lịch sử từ `WorkOrderStatusHistory` |
| `Technicians/AssignedTasks.html` / `WorkOrderDetails.html` | WorkOrders, v_dss2_technician_workload | `GET /workOrders?technician_id=me`, `PATCH /workOrders/:id` (accept/reject/update status) |
| `Technicians/RejectModal.html` | WorkOrders.rejection_reason | `PATCH /workOrders/:id/reject` |
| `Technicians/AssetList.html`/`AssetDetails.html`/`AssetLookup.html` | Assets | `GET /assets`, `GET /assets/:id`, tra cứu theo QR |
| `Managers/ManagerDashboard.html` | v_dashboard_mttr, v_dashboard_asset_downtime, v_dss3_replacement_alerts | `GET /dashboard/kpis` |
| `Managers/PendingRequest.html`/`Detail.html` | FaultReports (status=Pending Approval) | `GET /faultReports?status=Pending`, `POST /workOrders` (duyệt + gán kỹ thuật viên) |
| `Managers/RejectReport.html` | FaultReports.status=Rejected | `PATCH /faultReports/:id/reject` |
| `Managers/ClassroomsManagement.html`/`Detail.html`/`AddClassroom.html` | Classrooms | CRUD `/classrooms` |
| `Managers/GenerateClassQR.html`/`QRManagement.html`/`ViewQRModal.html` | Classrooms.qr_code | `POST /qrcodes/:room_id`, `GET /qrcodes` |
| `Managers/UsersManagement.html`/`AddNewUser.html`/`EditUserModal.html` | Users | CRUD `/users` |
| `Managers/AddNewAssetClass.html`/`EditAssetClass.html` | Assets (loại thiết bị) | CRUD `/assets` (dựng lại `EditAssetClass.html` theo mẫu `AddNewAssetClass.html`) |
| `Managers/Report&Analytics.html` | các view KPI | `GET /dashboard/mttr`, `GET /dashboard/downtime`, `GET /dashboard/replacement-alerts` |
| `*/Notifications.html`, `MyProfile.html`, `ChangePassword.html` | Notifications, Users | `GET/PATCH /notifications`, `GET/PATCH /users/me` |

---

## 5. Lộ trình triển khai theo pha

**Pha 1 – Nền tảng backend**
- Setup Express, kết nối MySQL bằng file `.sql` đã có
- Module `auth` (login/JWT) + middleware role-check cho 3 vai trò
- CRUD `users`, `classrooms`, `assets`

**Pha 2 – Luồng nghiệp vụ chính**
- `faultReports` (tạo báo cáo, tính priority DSS1)
- `workOrders` (duyệt/gán, DSS2 gợi ý kỹ thuật viên theo `v_dss2_technician_workload`)
- Trigger DB đã tự động cập nhật `WorkOrderStatusHistory`, `Notifications`, `AuditLog` — chỉ cần backend đọc lại đúng dữ liệu

**Pha 3 – Xác nhận & DSS3**
- `confirmations` (người dùng xác nhận sau khi Completed)
- `dashboard` (đọc 3 view: mttr, downtime, replacement-alerts)

**Pha 4 – Refactor frontend**
- Tách sidebar/header thành partials, nạp bằng `layout.js`
- Viết `api.js`, gắn fetch thật cho từng trang theo bảng mapping ở mục 4
- Nối điều hướng thật giữa các trang (thay `href="#"`)
- Dựng lại `EditAssetClass.html`

**Pha 5 – QR & hoàn thiện**
- Sinh QR thật bằng thư viện `qrcode`, gắn vào `GenerateClassQR.html`
- Thay ảnh placeholder Google bằng ảnh nội bộ dự án
- Kiểm thử end-to-end theo 3 vai trò

---

## 6. Lưu ý kỹ thuật quan trọng

- **RBAC:** mọi route backend đều qua `role.middleware.js`; ví dụ `/faultReports/:id/approve` chỉ Manager gọi được.
- **DSS1 (Priority):** tính tại `priority.service.js` khi tạo FaultReport, dùng công thức đã thống nhất ở Tutorial 4 (PriorityWeight×0.6 + CriticalityWeight×0.4).
- **DSS2 (Assignment):** `assignment.service.js` query `v_dss2_technician_workload`, ưu tiên kỹ thuật viên có `active_workload` thấp nhất và `technician_specialty` khớp `asset_type`.
- **DSS3 (Replacement):** không cần service riêng — trigger `trg_assets_before_update_dss3` đã tự xử lý, backend chỉ đọc `v_dss3_replacement_alerts`.
- **Audit:** mọi hành động CRUD ngoài vòng đời WorkOrder (sửa Classrooms/Users/Assets) phải gọi `auditLog.repository.js` để ghi log thủ công, vì trigger DB chỉ bắt sự kiện trên FaultReports/WorkOrders/Assets.
