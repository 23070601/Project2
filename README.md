# Classroom Asset Maintenance Decision Support System (DSS) — VNU-IS Group 2 (INS3282)

A Decision Support System (DSS) for managing and maintaining classroom assets at VNU International School (VNU-IS).

This full-stack web application is built with a **Node.js (Express REST API)** backend, **MySQL 8.0 / XAMPP** database, and an **HTML5 + Tailwind CSS + Vanilla JavaScript** frontend.

> **Course Alignment**: INS3282 - Capstone Project II (Tutorial 10 — Review and Final Preparation & Reproducibility Audit).

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Decision Support System (DSS) Features](#3-decision-support-system-dss-features)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation & Clean Setup Guide](#6-installation--clean-setup-guide)
   - [Step 1: Database Initialization](#step-1-database-initialization)
   - [Step 2: Backend Setup & Launch](#step-2-backend-setup--launch)
   - [Step 3: Frontend Setup & Launch](#step-3-frontend-setup--launch)
7. [Test Accounts & Demo Roles](#7-test-accounts--demo-roles)
8. [Email Notification Setup (Optional)](#8-email-notification-setup-optional)
9. [Reproducibility & Quality Gate Checklist](#9-reproducibility--quality-gate-checklist)

---

## 1. Project Overview

In university environments, ensuring the operational readiness of classroom equipment (projectors, air conditioners, sound systems, PCs, smart boards) is critical. The **VNU-IS Classroom Asset Maintenance DSS** replaces manual maintenance tracking through:
- **Instant Fault Reporting**: Students and lecturers submit fault reports via web UI or QR Code scans.
- **Automated Priority Assessment (DSS1)**: Ranks incoming issues based on location impact, severity, and asset type.
- **Smart Technician Recommendation (DSS2)**: Recommends optimal technician assignments based on workload, specialization, and availability.
- **Asset Replacement Alerts (DSS3)**: Automatically alerts management when repair frequencies or costs exceed economic efficiency thresholds.

---

## 2. Tech Stack

### Backend
- **Framework**: Node.js & Express.js (RESTful API architecture)
- **Database**: MySQL 8.0 (MySQL2 driver with connection pooling)
- **Security & Authentication**: JSON Web Tokens (JWT), Bcrypt.js password hashing, Role-Based Access Control (RBAC)
- **Utilities**: Multer (image uploads), Nodemailer (email notifications), QRCode generator

### Frontend
- **Interface**: HTML5, Tailwind CSS (responsive UI), Vanilla JavaScript (ES6+)
- **Data Visualization**: Chart.js for managerial analytics
- **Icons & Scanner**: Lucide Icons, QR Scanner integration

---

## 3. Decision Support System (DSS) Features

### 🔹 DSS1 — Automatic Fault Priority Assessment
- **Implementation**: `backend/src/modules/faultReports/priority.service.js`
- **Logic**: Calculates a composite *Priority Score* for new fault reports based on asset category, room location impact, teaching disruption level, and fault severity. High-priority items are automatically elevated in manager dashboards.

### 🔹 DSS2 — Smart Technician Assignment Recommendation
- **Implementation**: `backend/src/modules/workOrders/assignment.service.js` & MySQL View `v_dss2_technician_workload`
- **Logic**: Analyzes real-time technician workload (active work orders), specialized skill matching (electrical, IT, HVAC), and availability to suggest the best-suited technician to managers.

### 🔹 DSS3 — Asset Replacement Recommendation
- **Implementation**: MySQL Trigger `trg_assets_before_update_dss3` & View `v_dss3_replacement_alerts`
- **Logic**: Tracks repair frequency and cumulative maintenance costs. When threshold limits are crossed, the system automatically flags the asset status as `Recommended for Replacement`.

---

## 4. Project Structure

```text
FinalCode/
├── backend/                        # Node.js Express REST API
│   ├── database/                   # Schema, Views, Triggers & Seed Data SQL
│   │   └── vnuis_asset_maintenance_dss.sql
│   ├── src/
│   │   ├── config/                 # DB Pool & Nodemailer configuration
│   │   ├── middlewares/            # JWT Auth, RBAC, Multer upload
│   │   ├── modules/                # Business modules (Assets, Faults, WorkOrders, DSS)
│   │   │   ├── faultReports/       # DSS1 Service
│   │   │   └── workOrders/         # DSS2 Service
│   │   ├── app.js
│   │   └── server.js               # API Server Entrypoint
│   ├── .env.example                # Environment variables template
│   └── package.json
├── frontend/                       # Web Client Applications
│   ├── assets/                     # JS helpers (api.js, auth.js, layout.js, ui-helpers.js)
│   ├── partials/                   # Reusable UI components
│   ├── users/                      # User & Lecturer Dashboard & Login
│   ├── technicians/                # Technician Task Management Dashboard
│   └── managers/                   # Manager & DSS Analytics Dashboard
├── migrations/                     # Database incremental migration scripts
├── README.md                       # Documentation & Setup Guide
└── package.json
```

---

## 5. Prerequisites

Ensure your environment meets the following requirements:
- **Node.js**: LTS version (v18.x or v20.x recommended)
- **MySQL**: MySQL 8.0+ or **XAMPP** (with Apache & MySQL modules)
- **Web Browser**: Chrome, Edge, or Firefox
- **IDE**: VS Code with **Live Server** extension (by Ritwick Dey)

---

## 6. Installation & Clean Setup Guide

### Step 1: Database Initialization

#### Option A: Import via phpMyAdmin (Recommended for XAMPP)
1. Launch **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Open phpMyAdmin: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
3. Create a new database named:
   ```sql
   vnuis_asset_maintenance_dss
   ```
4. Select the created database and click the **Import** tab.
5. Choose the SQL file located at:
   ```text
   backend/database/vnuis_asset_maintenance_dss.sql
   ```
6. Click **Import** (or **Go**).

#### Option B: Import via MySQL Command Line
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vnuis_asset_maintenance_dss CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p vnuis_asset_maintenance_dss < backend/database/vnuis_asset_maintenance_dss.sql
```

---

### Step 2: Backend Setup & Launch

1. Open terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the environment configuration file `.env` inside `backend/` (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Or create `.env` manually with sample values:
   ```env
   # Server Configuration
   PORT=4000
   NODE_ENV=development
   CORS_ORIGIN=http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000

   # Database Configuration
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=vnuis_asset_maintenance_dss

   # Authentication (Use a secure secret in production)
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   BCRYPT_SALT_ROUNDS=10

   # Frontend Base URL
   FRONTEND_BASE_URL=http://127.0.0.1:5500

   # Optional Email Notification Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM=noreply@vnuis.edu.vn
   ```

4. Start the API Server:
   - **Development mode (Auto-reload)**:
     ```bash
     npm run dev
     ```
   - **Production mode**:
     ```bash
     npm start
     ```

5. Successful startup logs:
   ```text
   [DB] Connected to MySQL database "vnuis_asset_maintenance_dss" at 127.0.0.1:3306
   [DB] Updated default password (123456) for user(s).
   [Server] VNUIS Asset Maintenance DSS API running on http://localhost:4000
   ```

---

### Step 3: Frontend Setup & Launch

1. In VS Code, navigate to `frontend/users/`.
2. Right-click `Login.html` and select **Open with Live Server**.
3. Access the web application at:
   ```text
   http://127.0.0.1:5500/frontend/users/Login.html
   ```

---

## 7. Test Accounts & Demo Roles

Pre-configured demo accounts with the default password: **`123456`**

| Role | Email Address | Default Password | Redirect Target Page |
|---|---|---|---|
| **Manager** | `manager.e@vnu.edu.vn` | `123456` | `frontend/managers/ManagerDashboard.html` |
| **Technician (Electrical)** | `tech.c@vnu.edu.vn` | `123456` | `frontend/technicians/TechnicianDashboard.html` |
| **Technician (IT/Network)** | `tech.d@vnu.edu.vn` | `123456` | `frontend/technicians/TechnicianDashboard.html` |
| **User (Lecturer)** | `lecturer.a@vnu.edu.vn` | `123456` | `frontend/users/Dashboard.html` |
| **User (Student)** | `student.b@vnu.edu.vn` | `123456` | `frontend/users/Dashboard.html` |

---

## 8. Email Notification Setup (Optional)

The application includes automated transactional email dispatch for key workflows:
- New fault report submission
- Work order assignment & status updates
- Completion confirmations

To enable real email dispatch via Google SMTP:
1. Generate an **App Password** in your Google Account security settings.
2. Populate `SMTP_USER` and `SMTP_PASS` in `backend/.env`.
*(Note: If SMTP parameters are omitted, the application will silently skip email transmission while web UI notifications remain fully operational).*

---

## 9. Reproducibility & Quality Gate Checklist

| Item | Requirement / Status | Verification |
|---|---|---|
| **Clean Setup** | Project deploys cleanly without undocumented dependencies | Verified with Node v18+ & MySQL 8 |
| **Database Seed** | Database triggers, views, and seed accounts load via single SQL file | `vnuis_asset_maintenance_dss.sql` |
| **Auth & Security** | Passwords hashed using Bcrypt; JWT session validation active | Verified |
| **DSS Logic Audit** | DSS1 (Priority), DSS2 (Technician Workload), DSS3 (Replacement Alert) operating | Verified |
