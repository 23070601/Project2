# Classroom Asset Maintenance Decision Support System (DSS) — VNU-IS Group 2 (INS3282)

A Decision Support System for Classroom Asset Maintenance at VNU International School (VNU-IS).  
This full-stack application is built using **Node.js (Express REST API)**, **MySQL 8.0 / XAMPP**, and **HTML5 + Tailwind CSS + Vanilla JavaScript**.

---

# Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Database Setup](#2-database-setup)
3. [Backend Setup (Node.js API)](#3-backend-setup-nodejs-api)
4. [Frontend Setup](#4-frontend-setup)
5. [Test Accounts](#5-test-accounts)
6. [Project Structure](#6-project-structure)
7. [Decision Support System (DSS) Features](#7-decision-support-system-dss-features)

---

# 1. Prerequisites

Before running the project, ensure the following software is installed:

- **Node.js** (LTS version recommended, v18+ or v20+)
- **MySQL Server** or **XAMPP** (for MySQL database)
- **Visual Studio Code**
- **Live Server** extension (by Ritwick Dey)

---

# 2. Database Setup

The project uses a MySQL database with pre-configured schema, views, triggers, and seed data.

## Option 1 — Import using phpMyAdmin (Recommended for XAMPP)

1. Open **XAMPP Control Panel**.
2. Start **Apache** and **MySQL**.
3. Open:

```
http://localhost/phpmyadmin
```

4. Create a new database named:

```
vnuis_asset_maintenance_dss
```

5. Select the database.
6. Open the **Import** tab.
7. Choose the SQL file:

```text
backend/database/vnuis_asset_maintenance_dss.sql
```

8. Click **Import** (or **Go**).

---

## Option 2 — Import using MySQL Command Line

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vnuis_asset_maintenance_dss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p vnuis_asset_maintenance_dss < backend/database/vnuis_asset_maintenance_dss.sql
```

---

# 3. Backend Setup (Node.js API)

## Step 3.1 Navigate to Backend

Open a terminal inside VS Code and run:

```bash
cd backend
```

---

## Step 3.2 Create Environment Configuration

Create a file named `.env` inside the **backend** directory (same level as `package.json`).

```env
# Server
PORT=
NODE_ENV=
CORS_ORIGIN=

# Database
DB_HOST=
DB_PORT=
DB_USER=root
DB_PASSWORD=
DB_NAME=

# Authentication
JWT_SECRET=
JWT_EXPIRES_IN=
BCRYPT_SALT_ROUNDS=
```

---

## Step 3.3 Install Dependencies

```bash
npm install
```

---

## Step 3.4 Start the Backend Server

```bash
npm run dev
```

### Expected Startup Output

When the server starts successfully, it automatically hashes the default password (`123456`) for all predefined test accounts.

Example log:

```text
[DB] Connected to MySQL database "vnuis_asset_maintenance_dss" at localhost:3306
[DB] Updated default password (123456) for 5 user(s).
[Server] VNUIS Asset Maintenance DSS API running on http://localhost:4000
[Server] Health check: http://localhost:4000/health
```

---

# 4. Frontend Setup

The frontend is built using **HTML5**, **Tailwind CSS**, and **Vanilla JavaScript**.

1. Open the folder:

```
frontend/users/
```

2. Right-click:

```
Login.html
```

3. Select:

```
Open with Live Server
```

The application will open automatically at:

```
http://127.0.0.1:5500/frontend/users/Login.html
```

(or another available Live Server port such as **5501**).

---

# 5. Test Accounts

Use the following sample accounts after the backend and database are running.

**Default password for all accounts:**

```
123456
```

| Role | Email | Password | Redirect Page |
|------|-------|----------|---------------|
| Manager | manager.e@vnuis.edu.vn | 123456 | frontend/managers/ManagerDashboard.html |
| Technician | tech.c@vnuis.edu.vn | 123456 | frontend/technicians/TechnicianDashboard.html |
| Technician | tech.d@vnuis.edu.vn | 123456 | frontend/technicians/TechnicianDashboard.html |
| User (Lecturer) | lecturer.a@vnuis.edu.vn | 123456 | frontend/users/Dashboard.html |
| User (Student) | student.b@vnuis.edu.vn | 123456 | frontend/users/Dashboard.html |

---

# 6. Project Structure

```text
Project2/
├── backend/
│   ├── database/
│   │   └── vnuis_asset_maintenance_dss.sql
│   │       # MySQL schema, views, triggers, and seed data
│   │
│   ├── src/
│   │   ├── config/
│   │   │       # Database connection pool & environment configuration
│   │   │
│   │   ├── middlewares/
│   │   │       # JWT authentication, RBAC authorization, error handling
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── classrooms/
│   │   │   ├── assets/
│   │   │   ├── faultReports/
│   │   │   ├── workOrders/
│   │   │   ├── confirmations/
│   │   │   ├── notifications/
│   │   │   ├── qrcodes/
│   │   │   ├── dashboard/
│   │   │   └── auditLog/
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── assets/
│   │   └── js/
│   │       ├── api.js
│   │       ├── auth.js
│   │       ├── layout.js
│   │       └── ui-helpers.js
│   │
│   ├── partials/
│   ├── users/
│   ├── technicians/
│   └── managers/
│
├── PROJECT_PLAN.md
└── README.md
```

---

# 7. Decision Support System (DSS) Features

## DSS1 — Automatic Fault Priority Assessment

**Location**

```
backend/src/modules/faultReports/priority.service.js
```

Automatically calculates the priority score of a newly submitted fault report based on:

- Asset type
- Classroom location
- Impact level
- Fault severity

The calculated priority is then used to determine the order in which maintenance requests should be handled.

---

## DSS2 — Smart Technician Assignment Recommendation

**Location**

```
backend/src/modules/workOrders/assignment.service.js
```

Uses the MySQL view:

```
v_dss2_technician_workload
```

to recommend the most suitable technician by considering:

- Current workload
- Technician specialization
- Asset category
- Availability

This helps managers assign maintenance tasks more efficiently.

---

## DSS3 — Asset Replacement Recommendation

**Location**

- MySQL Trigger

```
trg_assets_before_update_dss3
```

- MySQL View

```
v_dss3_replacement_alerts
```

Automatically monitors maintenance history and repair frequency.

When an asset exceeds the predefined maintenance threshold, the system automatically changes its status to:

```
Recommended for Replacement
```

This enables managers to identify aging equipment and make timely replacement decisions.
