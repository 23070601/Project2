-- =====================================================================
-- CLASSROOM ASSET MAINTENANCE DECISION SUPPORT SYSTEM (DSS)
-- VNU International School - Project II (Group 2)
-- Aligned 100% with: INS328201-Project II - Cons&Vali.pdf
-- =====================================================================

DROP DATABASE IF EXISTS vnuis_asset_maintenance_dss;
CREATE DATABASE vnuis_asset_maintenance_dss
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE vnuis_asset_maintenance_dss;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- TABLE 1: Users
-- ---------------------------------------------------------------------
CREATE TABLE Users (
    user_id                 INT AUTO_INCREMENT PRIMARY KEY,
    full_name               VARCHAR(100)    NOT NULL,
    email                   VARCHAR(100)    NOT NULL UNIQUE,
    password_hash           VARCHAR(255)    NOT NULL,
    role                    VARCHAR(20)     NOT NULL DEFAULT 'User',
    phone                   VARCHAR(20)     NULL,
    technician_specialty    VARCHAR(50)     NULL,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('User', 'Technician', 'Manager'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 2: Classrooms (Only room_name, qr_code - NO FLOOR 2)
-- ---------------------------------------------------------------------
CREATE TABLE Classrooms (
    room_id         INT AUTO_INCREMENT PRIMARY KEY,
    room_name       VARCHAR(20)     NOT NULL UNIQUE,
    qr_code         VARCHAR(255)    NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 3: Assets
-- ---------------------------------------------------------------------
CREATE TABLE Assets (
    asset_id        INT AUTO_INCREMENT PRIMARY KEY,
    asset_name      VARCHAR(100)    NOT NULL,
    asset_type      VARCHAR(50)     NOT NULL,
    room_id         INT             NOT NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'Operational',
    failure_count   INT             NOT NULL DEFAULT 0,
    last_fault_at   TIMESTAMP       NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assets_room FOREIGN KEY (room_id)
        REFERENCES Classrooms(room_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_assets_status CHECK (
        status IN ('Operational', 'Under Repair', 'Recommended for Replacement', 'Retired')
    )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 4: FaultReports
-- ---------------------------------------------------------------------
CREATE TABLE FaultReports (
    report_id       INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id     INT             NOT NULL,
    asset_id        INT             NULL,
    room_id         INT             NOT NULL,
    description     TEXT            NOT NULL,
    image_path      VARCHAR(255)    NULL,
    reported_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priority        VARCHAR(10)     NOT NULL,
    status          VARCHAR(30)     NOT NULL DEFAULT 'Pending Approval',
    CONSTRAINT fk_faultreports_reporter FOREIGN KEY (reporter_id)
        REFERENCES Users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_faultreports_asset FOREIGN KEY (asset_id)
        REFERENCES Assets(asset_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_faultreports_room FOREIGN KEY (room_id)
        REFERENCES Classrooms(room_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_faultreports_priority CHECK (priority IN ('High', 'Medium', 'Low')),
    CONSTRAINT chk_faultreports_status CHECK (
        status IN ('Pending Approval', 'Processing', 'Completed', 'Rejected', 'Cancelled')
    )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 5: WorkOrders
-- ---------------------------------------------------------------------
CREATE TABLE WorkOrders (
    order_id             INT AUTO_INCREMENT PRIMARY KEY,
    report_id            INT             NOT NULL UNIQUE,
    manager_id           INT             NOT NULL,
    technician_id        INT             NOT NULL,
    assigned_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    technician_response  VARCHAR(20)     NOT NULL DEFAULT 'Pending',
    rejection_reason     VARCHAR(255)    NULL,
    task_status          VARCHAR(30)     NOT NULL DEFAULT 'Assigned',
    fix_description      TEXT            NULL,
    parts_used           VARCHAR(255)    NULL,
    resolved_at          TIMESTAMP       NULL,
    closed_at            TIMESTAMP       NULL,
    CONSTRAINT fk_workorders_report FOREIGN KEY (report_id)
        REFERENCES FaultReports(report_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_workorders_manager FOREIGN KEY (manager_id)
        REFERENCES Users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_workorders_technician FOREIGN KEY (technician_id)
        REFERENCES Users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_workorders_response CHECK (
        technician_response IN ('Pending', 'Accepted', 'Rejected')
    ),
    CONSTRAINT chk_workorders_task_status CHECK (
        task_status IN ('Assigned', 'Received', 'In Progress', 'Completed', 'Closed')
    )
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 6: UserConfirmations
-- ---------------------------------------------------------------------
CREATE TABLE UserConfirmations (
    confirmation_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_id            INT             NOT NULL UNIQUE,
    reporter_id         INT             NOT NULL,
    is_confirmed        BOOLEAN         NOT NULL DEFAULT FALSE,
    rating              INT             NULL,
    feedback            TEXT            NULL,
    confirmed_at        TIMESTAMP       NULL,
    CONSTRAINT fk_userconfirmations_order FOREIGN KEY (order_id)
        REFERENCES WorkOrders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_userconfirmations_reporter FOREIGN KEY (reporter_id)
        REFERENCES Users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_userconfirmations_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 7: WorkOrderStatusHistory
-- ---------------------------------------------------------------------
CREATE TABLE WorkOrderStatusHistory (
    history_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT             NOT NULL,
    old_status      VARCHAR(30)     NULL,
    new_status      VARCHAR(30)     NOT NULL,
    changed_by      INT             NULL,
    changed_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note            VARCHAR(255)    NULL,
    CONSTRAINT fk_woh_order FOREIGN KEY (order_id)
        REFERENCES WorkOrders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_woh_user FOREIGN KEY (changed_by)
        REFERENCES Users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 8: AuditLog
-- ---------------------------------------------------------------------
CREATE TABLE AuditLog (
    log_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NULL,
    action_type     VARCHAR(50)     NOT NULL,
    entity_table    VARCHAR(50)     NOT NULL,
    entity_id       INT             NULL,
    room_id         INT             NULL,
    asset_id        INT             NULL,
    description     VARCHAR(500)    NULL,
    action_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditlog_user FOREIGN KEY (user_id)
        REFERENCES Users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_auditlog_room FOREIGN KEY (room_id)
        REFERENCES Classrooms(room_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_auditlog_asset FOREIGN KEY (asset_id)
        REFERENCES Assets(asset_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 9: Notifications
-- ---------------------------------------------------------------------
CREATE TABLE Notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    report_id       INT             NULL,
    order_id        INT             NULL,
    message         TEXT            NOT NULL,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_report FOREIGN KEY (report_id)
        REFERENCES FaultReports(report_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_order FOREIGN KEY (order_id)
        REFERENCES WorkOrders(order_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- SEED DATA (FULL ASSETS POPULATION FOR EVERY SINGLE CLASSROOM)
-- =====================================================================

-- 1. USERS (Default password: 123456)
INSERT INTO Users (user_id, full_name, email, password_hash, role, phone, technician_specialty, is_active) VALUES
(1,  'Nguyen Van A',   'lecturer.a@vnuis.edu.vn', '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'User',       '0912345678', NULL, TRUE),
(2,  'Tran Thi B',     'student.b@vnuis.edu.vn',  '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'User',       '0923456789', NULL, TRUE),
(3,  'Le Van C',       'tech.c@vnuis.edu.vn',     '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'Technician', '0934567890', 'Electrical', TRUE),
(4,  'Pham Thi D',     'tech.d@vnuis.edu.vn',     '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'Technician', '0945678901', 'Networking', TRUE),
(5,  'Hoang Van E',    'manager.e@vnuis.edu.vn',  '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'Manager',    '0956789012', NULL, TRUE),
(6,  'Vu Van F',       'tech.f@vnuis.edu.vn',     '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'Technician', '0967890123', 'General', TRUE),
(7,  'Doan Van G',     'lecturer.g@vnuis.edu.vn', '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'User',       '0978901234', NULL, TRUE),
(8,  'Bui Thi H',      'student.h@vnuis.edu.vn',  '$2a$10$MGOlou/3/r7KXD7uls2owOLRYx2aHIItYQeCpz28YQYcH2S0jszS', 'User',       '0989012345', NULL, TRUE);

-- 2. CLASSROOMS (26 CLASSROOMS - FLOORS 1, 3, 4, 5, 6 - NO FLOOR 2)
INSERT INTO Classrooms (room_id, room_name, qr_code) VALUES
(1,  'R101', 'QR-R101'),
(2,  'R102', 'QR-R102'),
(3,  'R103', 'QR-R103'),
(4,  'R106', 'QR-R106'),
(5,  'R107', 'QR-R107'),
(6,  'R301', 'QR-R301'),
(7,  'R302', 'QR-R302'),
(8,  'R303', 'QR-R303'),
(9,  'R304', 'QR-R304'),
(10, 'R305', 'QR-R305'),
(11, 'R401', 'QR-R401'),
(12, 'R402', 'QR-R402'),
(13, 'R403', 'QR-R403'),
(14, 'R404', 'QR-R404'),
(15, 'R405', 'QR-R405'),
(16, 'R501', 'QR-R501'),
(17, 'R502', 'QR-R502'),
(18, 'R503', 'QR-R503'),
(19, 'R504', 'QR-R504'),
(20, 'R512', 'QR-R512'),
(21, 'R601', 'QR-R601'),
(22, 'R602', 'QR-R602'),
(23, 'R603', 'QR-R603'),
(24, 'R604', 'QR-R604'),
(25, 'R605', 'QR-R605'),
(26, 'R606', 'QR-R606');

-- 3. ASSETS (EVERY SINGLE CLASSROOM ROOM_ID 1 THROUGH 26 HAS ASSETS ASSIGNED!)
INSERT INTO Assets (asset_id, asset_name, asset_type, room_id, status, failure_count, last_fault_at) VALUES
-- Room 1 (R101)
(1,  'Cisco Catalyst 24-Port Switch',     'NetworkSwitch',    1,  'Operational',                  0, NULL),
(2,  'Samsung 75in Commercial TV',        'TV',               1,  'Recommended for Replacement', 3, NOW() - INTERVAL 1 DAY),
(3,  'Daikin Inverter AC 18000 BTU',      'Aircon',           1,  'Operational',                  0, NULL),
(4,  'JBL Classroom Wall Speaker',        'Speaker',          1,  'Operational',                  0, NULL),

-- Room 2 (R102)
(5,  'Panasonic 4K Projector PT-VMZ51',  'Projector',        2,  'Operational',                  0, NULL),
(6,  'Shure Wireless Dual Microphone',    'Microphone',       2,  'Operational',                  0, NULL),
(7,  'Panasonic AC Unit 24000 BTU',       'Aircon',           2,  'Operational',                  0, NULL),

-- Room 3 (R103)
(8,  'Sony 65in Classroom TV',           'TV',               3,  'Operational',                  0, NULL),
(9,  'Bose Wall Speaker Set',             'Speaker',          3,  'Operational',                  0, NULL),
(10, 'Ultra HD HDMI Cable 10m',           'Cable',            3,  'Operational',                  0, NULL),

-- Room 4 (R106)
(11, 'Epson Classroom Projector 3LCD',    'Projector',        4,  'Operational',                  0, NULL),
(12, 'Bose Ceiling Speaker Set',          'Speaker',          4,  'Operational',                  0, NULL),
(13, 'Daikin Dual AC Unit',               'Aircon',           4,  'Operational',                  0, NULL),

-- Room 5 (R107)
(14, 'LG Commercial TV 65in',            'TV',               5,  'Operational',                  0, NULL),
(15, 'AKG Wireless Microphone',          'Microphone',       5,  'Operational',                  0, NULL),

-- Room 6 (R301)
(16, 'Mitsubishi Heavy AC Unit',          'Aircon',           6,  'Recommended for Replacement', 3, NOW() - INTERVAL 2 DAY),
(17, 'Sony Laser Projector 4K',           'Projector',        6,  'Operational',                  0, NULL),
(18, 'Cisco Gigabit Switch 24-Port',      'NetworkSwitch',    6,  'Operational',                  0, NULL),

-- Room 7 (R302)
(19, 'Sony Laser Projector VPL-PHZ60',   'Projector',        7,  'Operational',                  0, NULL),
(20, 'LG Commercial Display 55in TV',     'TV',               7,  'Under Repair',                 1, NOW() - INTERVAL 2 DAY),
(21, 'Ultra HD 4K HDMI Cable 15m',        'Cable',            7,  'Retired',                      4, NOW() - INTERVAL 30 DAY),
(22, 'JBL Speaker System R302',          'Speaker',          7,  'Operational',                  0, NULL),

-- Room 8 (R303)
(23, 'Panasonic Laser Projector',         'Projector',        8,  'Operational',                  0, NULL),
(24, 'Daikin AC Unit R303',               'Aircon',           8,  'Operational',                  0, NULL),

-- Room 9 (R304)
(25, 'Samsung 65in TV R304',             'TV',               9,  'Operational',                  0, NULL),
(26, 'Shure Mic System R304',            'Microphone',       9,  'Operational',                  0, NULL),

-- Room 10 (R305)
(27, 'Epson Document Camera R305',        'DocumentCamera',   10, 'Operational',                  0, NULL),
(28, 'JBL Ceiling Speaker R305',          'Speaker',          10, 'Operational',                  0, NULL),

-- Room 11 (R401)
(29, 'Daikin Inverter AC 24000 BTU',      'Aircon',           11, 'Operational',                  1, NOW() - INTERVAL 10 DAY),
(30, 'JBL Wall Mount Speaker System',     'Speaker',          11, 'Operational',                  0, NULL),
(31, 'Sony Classroom TV 55in',            'TV',               11, 'Operational',                  0, NULL),

-- Room 12 (R402)
(32, 'AKG Lavalier Wireless Mic',        'Microphone',       12, 'Under Repair',                 1, NOW() - INTERVAL 8 HOUR),
(33, 'Epson 4K Projector R402',          'Projector',        12, 'Operational',                  0, NULL),

-- Room 13 (R403)
(34, 'Panasonic Commercial TV 65in',     'TV',               13, 'Operational',                  0, NULL),
(35, 'Daikin AC Unit R403',               'Aircon',           13, 'Operational',                  0, NULL),

-- Room 14 (R404)
(36, 'Sony Laser Projector R404',         'Projector',        14, 'Operational',                  0, NULL),
(37, 'Bose Ceiling Speaker R404',         'Speaker',          14, 'Operational',                  0, NULL),

-- Room 15 (R405)
(38, 'LG Commercial Display 65in',       'TV',               15, 'Operational',                  0, NULL),
(39, 'HDMI Cable 15m R405',              'Cable',            15, 'Operational',                  0, NULL),

-- Room 16 (R501)
(40, 'TP-Link Managed Gigabit Switch',   'NetworkSwitch',    16, 'Operational',                  0, NULL),
(41, 'Panasonic 4K Projector R501',      'Projector',        16, 'Operational',                  0, NULL),

-- Room 17 (R502)
(42, 'Sony TV 55in R502',                'TV',               17, 'Operational',                  0, NULL),
(43, 'Daikin AC Unit R502',               'Aircon',           17, 'Operational',                  0, NULL),

-- Room 18 (R503)
(44, 'Epson Laser Projector R503',        'Projector',        18, 'Operational',                  0, NULL),
(45, 'JBL Wall Speaker R503',            'Speaker',          18, 'Operational',                  0, NULL),

-- Room 19 (R504)
(46, 'Samsung TV 65in R504',             'TV',               19, 'Operational',                  0, NULL),
(47, 'Shure Mic System R504',            'Microphone',       19, 'Operational',                  0, NULL),

-- Room 20 (R512)
(48, 'Shure Wireless Dual Microphone',    'Microphone',       20, 'Operational',                  0, NULL),
(49, 'Epson Visualizer Document Camera',  'DocumentCamera',   20, 'Under Repair',                 2, NOW() - INTERVAL 5 DAY),
(50, 'Daikin AC Unit R512',               'Aircon',           20, 'Operational',                  0, NULL),

-- Room 21 (R601)
(51, 'Sony 4K Laser Projector R601',     'Projector',        21, 'Operational',                  0, NULL),
(52, 'Cisco Gigabit Switch R601',        'NetworkSwitch',    21, 'Operational',                  0, NULL),

-- Room 22 (R602)
(53, 'Panasonic Projector R602',         'Projector',        22, 'Operational',                  0, NULL),
(54, 'JBL Speaker Set R602',             'Speaker',          22, 'Operational',                  0, NULL),

-- Room 23 (R603)
(55, 'LG Commercial TV 65in R603',       'TV',               23, 'Operational',                  0, NULL),
(56, 'Daikin AC Unit R603',               'Aircon',           23, 'Operational',                  0, NULL),

-- Room 24 (R604)
(57, 'Epson Projector 3LCD R604',        'Projector',        24, 'Operational',                  0, NULL),
(58, 'AKG Mic System R604',              'Microphone',       24, 'Operational',                  0, NULL),

-- Room 25 (R605)
(59, 'Samsung Commercial Display R605',  'TV',               25, 'Operational',                  0, NULL),
(60, 'HDMI Cable High Speed R605',        'Cable',            25, 'Operational',                  0, NULL),

-- Room 26 (R606)
(61, 'Daikin AC Unit R606',               'Aircon',           26, 'Operational',                  0, NULL),
(62, 'Sony Laser Projector R606',         'Projector',        26, 'Operational',                  0, NULL);

-- 4. FAULT REPORTS (15 RECORDS)
INSERT INTO FaultReports (report_id, reporter_id, asset_id, room_id, description, priority, status, reported_at) VALUES
(1,  1, 19, 7,  'Sony Projector has no display signal and blinks red LED indicator.', 'High',   'Processing',       NOW() - INTERVAL 2 DAY),
(2,  2, 29, 11, 'Air conditioner is running but blowing warm air into the classroom.', 'Medium', 'Pending Approval', NOW() - INTERVAL 1 DAY),
(3,  1, 2,  1,  'Samsung Commercial TV screen sensor unresponsive during lecture.', 'High',   'Completed',        NOW() - INTERVAL 5 DAY),
(4,  2, 30, 11, 'Speaker system makes static noise when microphone is turned on.', 'Low',    'Rejected',         NOW() - INTERVAL 3 DAY),
(5,  7, 21, 7,  'HDMI cable loose contact, replaced by lecturer using spare cable.', 'Low',    'Cancelled',        NOW() - INTERVAL 4 DAY),
(6,  8, 49, 20, 'Document camera fails to zoom and image flickers constantly.', 'Medium', 'Processing',       NOW() - INTERVAL 12 HOUR),
(7,  1, 16, 6,  'Air conditioner leaking water heavily onto student desks.', 'Medium', 'Pending Approval', NOW() - INTERVAL 3 HOUR),
(8,  7, 20, 7,  'TV screen displays distorted color lines across display panel.', 'High',   'Processing',       NOW() - INTERVAL 18 HOUR),
(9,  8, 32, 12, 'Wireless microphone loses signal every 2 minutes during lecture.', 'Medium', 'Processing',       NOW() - INTERVAL 6 HOUR),
(10, 1, 7,  2,  'Panasonic Projector power light turns amber and powers down.', 'High',   'Pending Approval', NOW() - INTERVAL 2 HOUR),
(11, 2, 8,  3,  'Classroom TV remote control unresponsive and HDMI port loose.', 'Medium', 'Completed',        NOW() - INTERVAL 6 DAY),
(12, 7, 48, 20, 'Microphone battery compartment cover broken and wire frayed.', 'Low',    'Completed',        NOW() - INTERVAL 7 DAY),
(13, 8, 1,  1,  'Network switch port #12 dead, no internet connection in Room R101.', 'High',   'Rejected',         NOW() - INTERVAL 5 DAY),
(14, 1, 12, 4,  'Ceiling speaker buzzing sound when audio volume exceeds 50%.', 'Low',    'Cancelled',        NOW() - INTERVAL 8 DAY),
(15, 7, 52, 21, 'Gigabit switch power LED off, room R601 network completely down.', 'High',   'Processing',       NOW() - INTERVAL 1 HOUR);

-- 5. WORK ORDERS (8 UNIQUE REPORT_ID VALUES: 1, 3, 6, 8, 9, 11, 12, 15)
INSERT INTO WorkOrders (order_id, report_id, manager_id, technician_id, assigned_at, technician_response, rejection_reason, task_status, fix_description, parts_used, resolved_at, closed_at) VALUES
(1,  1,  5, 3, NOW() - INTERVAL 40 HOUR, 'Accepted', NULL,            'In Progress', 'Inspected optical engine and power supply unit.', 'Spare Lamp Module', NULL, NULL),
(2,  3,  5, 4, NOW() - INTERVAL 5 DAY,  'Accepted', NULL,            'Closed',      'Replaced display panel driver and updated firmware.', 'Display Controller Board', NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 4 DAY),
(3,  6,  5, 6, NOW() - INTERVAL 10 HOUR, 'Rejected', 'overloaded',   'Assigned',    NULL, NULL, NULL, NULL),
(4,  8,  5, 3, NOW() - INTERVAL 16 HOUR, 'Accepted', NULL,            'Received',    NULL, NULL, NULL, NULL),
(5,  9,  5, 4, NOW() - INTERVAL 5 HOUR,  'Accepted', NULL,            'In Progress', 'Replaced wireless receiver module and antenna.', 'Mic Receiver Antenna', NULL, NULL),
(6,  11, 5, 6, NOW() - INTERVAL 6 DAY,  'Accepted', NULL,            'Closed',      'Fixed HDMI port connection and replaced TV remote battery.', 'HDMI Female Socket', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY),
(7,  12, 5, 3, NOW() - INTERVAL 7 DAY,  'Accepted', NULL,            'Closed',      'Replaced microphone shell casing and soldered broken audio lead.', 'Mic Housing Clip', NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 6 DAY),
(8,  15, 5, 4, NOW() - INTERVAL 1 HOUR,  'Pending',  NULL,            'Assigned',    NULL, NULL, NULL, NULL);

-- 6. USER CONFIRMATIONS
INSERT INTO UserConfirmations (confirmation_id, order_id, reporter_id, is_confirmed, rating, feedback, confirmed_at) VALUES
(1, 2, 1, TRUE, 5, 'Excellent repair work! Samsung TV display response is perfect now.', NOW() - INTERVAL 4 DAY),
(2, 6, 2, TRUE, 4, 'TV remote and HDMI port working fine now. Thank you!', NOW() - INTERVAL 5 DAY),
(3, 7, 7, TRUE, 5, 'Microphone repaired quickly. Sound quality is crystal clear.', NOW() - INTERVAL 6 DAY);

-- 7. WORK ORDER STATUS HISTORY
INSERT INTO WorkOrderStatusHistory (history_id, order_id, old_status, new_status, changed_by, changed_at, note) VALUES
(1,  1, NULL, 'Assigned', 5, NOW() - INTERVAL 40 HOUR, 'WorkOrder assigned to Technician Le Van C'),
(2,  1, 'Assigned', 'Received', 3, NOW() - INTERVAL 38 HOUR, 'Technician accepted assignment'),
(3,  1, 'Received', 'In Progress', 3, NOW() - INTERVAL 35 HOUR, 'Technician started repairing projector'),
(4,  2, NULL, 'Assigned', 5, NOW() - INTERVAL 5 DAY, 'WorkOrder assigned to Technician Pham Thi D'),
(5,  2, 'Assigned', 'Received', 4, NOW() - INTERVAL 5 DAY, 'Technician accepted assignment'),
(6,  2, 'Received', 'In Progress', 4, NOW() - INTERVAL 4 DAY, 'Started display panel repair'),
(7,  2, 'In Progress', 'Completed', 4, NOW() - INTERVAL 4 DAY, 'TV screen fixed successfully'),
(8,  2, 'Completed', 'Closed', 5, NOW() - INTERVAL 4 DAY, 'Manager closed work order after user confirmation'),
(9,  4, NULL, 'Assigned', 5, NOW() - INTERVAL 16 HOUR, 'WorkOrder assigned to Technician Le Van C'),
(10, 4, 'Assigned', 'Received', 3, NOW() - INTERVAL 14 HOUR, 'Technician Le Van C accepted task'),
(11, 5, NULL, 'Assigned', 5, NOW() - INTERVAL 5 HOUR, 'WorkOrder assigned to Technician Pham Thi D'),
(12, 5, 'Assigned', 'Received', 4, NOW() - INTERVAL 4 HOUR, 'Technician accepted assignment'),
(13, 5, 'Received', 'In Progress', 4, NOW() - INTERVAL 3 HOUR, 'Technician repairing wireless mic receiver'),
(14, 6, NULL, 'Assigned', 5, NOW() - INTERVAL 6 DAY, 'WorkOrder assigned to Technician Vu Van F'),
(15, 6, 'In Progress', 'Completed', 6, NOW() - INTERVAL 5 DAY, 'TV HDMI socket replaced'),
(16, 6, 'Completed', 'Closed', 5, NOW() - INTERVAL 5 DAY, 'WorkOrder closed after user rating'),
(17, 8, NULL, 'Assigned', 5, NOW() - INTERVAL 1 HOUR, 'WorkOrder assigned to Technician Pham Thi D');

-- 8. AUDIT LOG
INSERT INTO AuditLog (log_id, user_id, action_type, entity_table, entity_id, room_id, asset_id, description, action_at) VALUES
(1,  5, 'LOGIN',  'Users', 5, NULL, NULL, 'User manager.e@vnuis.edu.vn logged into the system', NOW() - INTERVAL 2 DAY),
(2,  1, 'CREATE', 'FaultReports', 1, 7, 19, 'Fault report #1 created for Sony Projector in Room R302', NOW() - INTERVAL 2 DAY),
(3,  5, 'CREATE', 'WorkOrders', 1, 7, 19, 'Work order #1 generated and assigned to Technician Le Van C', NOW() - INTERVAL 40 HOUR),
(4,  3, 'UPDATE', 'WorkOrders', 1, 7, 19, 'Technician Le Van C updated task status to In Progress', NOW() - INTERVAL 35 HOUR),
(5,  5, 'UPDATE', 'Assets', 21, 7, 21, 'Asset #21 status updated to Retired due to repeated failures', NOW() - INTERVAL 30 DAY),
(6,  2, 'CREATE', 'FaultReports', 2, 11, 29, 'Fault report #2 created for Daikin AC in Room R401', NOW() - INTERVAL 1 DAY),
(7,  5, 'REJECT', 'FaultReports', 4, 11, 30, 'Manager rejected fault report #4 (Duplicate report)', NOW() - INTERVAL 3 DAY),
(8,  1, 'CANCEL', 'FaultReports', 5, 7, 21, 'User cancelled fault report #5 (Issue resolved self-service)', NOW() - INTERVAL 4 DAY),
(9,  5, 'CREATE', 'WorkOrders', 4, 7, 20, 'Work order #4 generated and assigned to Technician Le Van C', NOW() - INTERVAL 16 HOUR),
(10, 8, 'CREATE', 'FaultReports', 9, 12, 32, 'Fault report #9 created for AKG Wireless Mic in Room R402', NOW() - INTERVAL 6 HOUR),
(11, 5, 'CREATE', 'WorkOrders', 5, 12, 32, 'Work order #5 generated and assigned to Technician Pham Thi D', NOW() - INTERVAL 5 HOUR),
(12, 1, 'CREATE', 'FaultReports', 10, 2, 7, 'Fault report #10 created for Panasonic Projector in Room R102', NOW() - INTERVAL 2 HOUR),
(13, 7, 'CREATE', 'FaultReports', 15, 21, 52, 'Fault report #15 created for Gigabit Switch in Room R601', NOW() - INTERVAL 1 HOUR);

-- 9. NOTIFICATIONS
INSERT INTO Notifications (notification_id, user_id, report_id, order_id, message, is_read, created_at) VALUES
(1,  5, NULL, NULL, 'User manager.e@vnuis.edu.vn logged into the system successfully.', TRUE, NOW() - INTERVAL 2 DAY),
(2,  5, 2, NULL, 'New fault report #2 submitted by Tran Thi B requires your approval.', FALSE, NOW() - INTERVAL 1 DAY),
(3,  5, 7, NULL, 'New fault report #7 submitted by Nguyen Van A for Room R301.', FALSE, NOW() - INTERVAL 3 HOUR),
(4,  5, 10, NULL, 'New fault report #10 submitted by Nguyen Van A for Panasonic Projector in Room R102.', FALSE, NOW() - INTERVAL 2 HOUR),
(5,  5, 15, NULL, 'Critical report #15 submitted by Doan Van G: Network switch down in Room R601.', FALSE, NOW() - INTERVAL 1 HOUR),
(6,  3, 1, 1, 'You have been assigned to Work Order #1 (Sony Projector in Room R302).', TRUE, NOW() - INTERVAL 40 HOUR),
(7,  1, 1, 1, 'Your fault report #1 has been approved and assigned to Technician Le Van C.', TRUE, NOW() - INTERVAL 40 HOUR),
(8,  3, 1, 1, 'Status updated: Work Order #1 is now In Progress.', TRUE, NOW() - INTERVAL 35 HOUR),
(9,  4, 9, 5, 'You have been assigned to Work Order #5 (AKG Wireless Mic in Room R402).', FALSE, NOW() - INTERVAL 5 HOUR),
(10, 8, 9, 5, 'Your fault report #9 has been assigned to Technician Pham Thi D.', FALSE, NOW() - INTERVAL 5 HOUR),
(11, 2, 2, NULL, 'Your fault report #2 for Daikin AC in Room R401 is currently Pending Approval.', FALSE, NOW() - INTERVAL 1 DAY),
(12, 2, 4, NULL, 'Your fault report #4 was rejected by Manager. Reason: Duplicate report.', TRUE, NOW() - INTERVAL 3 DAY),
(13, 4, 3, 2, 'Work Order #2 for Samsung Commercial TV in Room R101 completed successfully.', TRUE, NOW() - INTERVAL 4 DAY),
(14, 1, 3, 2, 'Work Order #2 completed. Please submit your feedback and confirm satisfaction.', TRUE, NOW() - INTERVAL 4 DAY),
(15, 4, 15, 8, 'You have been assigned to Work Order #8 (Gigabit Switch in Room R601).', FALSE, NOW() - INTERVAL 1 HOUR);

-- =====================================================================
-- VIEWS (DSS1, DSS2, DSS3 & KPI Metrics)
-- =====================================================================

CREATE OR REPLACE VIEW v_dss3_replacement_alerts AS
SELECT
    a.asset_id,
    a.asset_name,
    a.asset_type,
    c.room_name,
    a.failure_count,
    a.last_fault_at,
    a.status
FROM Assets a
JOIN Classrooms c ON c.room_id = a.room_id
WHERE a.failure_count >= 3 OR a.status = 'Recommended for Replacement';

CREATE OR REPLACE VIEW v_dss2_technician_workload AS
SELECT
    u.user_id AS technician_id,
    u.full_name,
    u.technician_specialty,
    COUNT(CASE WHEN wo.task_status IN ('Assigned', 'Received', 'In Progress')
               THEN 1 END) AS active_workload,
    COUNT(wo.order_id) AS total_assigned
FROM Users u
LEFT JOIN WorkOrders wo ON wo.technician_id = u.user_id
WHERE u.role = 'Technician' AND u.is_active = TRUE
GROUP BY u.user_id, u.full_name, u.technician_specialty
ORDER BY active_workload ASC;

CREATE OR REPLACE VIEW v_dashboard_mttr AS
SELECT
    wo.technician_id, u.full_name AS technician_name, a.asset_type,
    COUNT(wo.order_id) AS completed_orders,
    AVG(TIMESTAMPDIFF(MINUTE, wo.assigned_at, wo.resolved_at)) AS avg_repair_minutes
FROM WorkOrders wo
JOIN Users u ON u.user_id = wo.technician_id
JOIN FaultReports fr ON fr.report_id = wo.report_id
LEFT JOIN Assets a ON a.asset_id = fr.asset_id
WHERE wo.resolved_at IS NOT NULL
GROUP BY wo.technician_id, u.full_name, a.asset_type;

CREATE OR REPLACE VIEW v_dashboard_asset_downtime AS
SELECT
    a.asset_id, a.asset_name, fr.report_id, fr.reported_at, wo.resolved_at,
    TIMESTAMPDIFF(HOUR, fr.reported_at, COALESCE(wo.resolved_at, NOW())) AS downtime_hours
FROM FaultReports fr
JOIN Assets a ON a.asset_id = fr.asset_id
LEFT JOIN WorkOrders wo ON wo.report_id = fr.report_id;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

DELIMITER $$

CREATE TRIGGER trg_workorders_after_insert
AFTER INSERT ON WorkOrders
FOR EACH ROW
BEGIN
    UPDATE FaultReports
    SET status = 'Processing'
    WHERE report_id = NEW.report_id;

    INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, changed_by, note)
    VALUES (NEW.order_id, NULL, NEW.task_status, NEW.manager_id, 'WorkOrder assigned by Manager');

    INSERT INTO Notifications (user_id, report_id, order_id, message)
    SELECT reporter_id, NEW.report_id, NEW.order_id,
           CONCAT('Your report #', NEW.report_id, ' has been assigned to a technician.')
    FROM FaultReports WHERE report_id = NEW.report_id;

    INSERT INTO Notifications (user_id, report_id, order_id, message)
    VALUES (NEW.technician_id, NEW.report_id, NEW.order_id,
            CONCAT('New task assigned: Work Order #', NEW.order_id));
END$$

CREATE TRIGGER trg_workorders_after_update
AFTER UPDATE ON WorkOrders
FOR EACH ROW
BEGIN
    IF OLD.task_status <> NEW.task_status THEN
        INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, note)
        VALUES (NEW.order_id, OLD.task_status, NEW.task_status,
                CONCAT('Task status changed from ', OLD.task_status, ' to ', NEW.task_status));

        IF NEW.task_status = 'Completed' THEN
            UPDATE FaultReports SET status = 'Completed' WHERE report_id = NEW.report_id;

            INSERT INTO UserConfirmations (order_id, reporter_id)
            SELECT NEW.order_id, reporter_id
            FROM FaultReports WHERE report_id = NEW.report_id;

            INSERT INTO Notifications (user_id, report_id, order_id, message)
            SELECT reporter_id, NEW.report_id, NEW.order_id,
                   CONCAT('Work Order #', NEW.order_id, ' is completed. Please confirm satisfaction.')
            FROM FaultReports WHERE report_id = NEW.report_id;
        END IF;

        IF NEW.task_status = 'Closed' THEN
            INSERT INTO Notifications (user_id, report_id, order_id, message)
            SELECT reporter_id, NEW.report_id, NEW.order_id,
                   CONCAT('Work Order #', NEW.order_id, ' has been officially closed.')
            FROM FaultReports WHERE report_id = NEW.report_id;
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_faultreports_after_insert_dss3
AFTER INSERT ON FaultReports
FOR EACH ROW
BEGIN
    IF NEW.asset_id IS NOT NULL THEN
        UPDATE Assets
        SET failure_count = failure_count + 1,
            last_fault_at = NEW.reported_at,
            status = CASE
                WHEN failure_count + 1 >= 3 THEN 'Recommended for Replacement'
                ELSE 'Under Repair'
            END
        WHERE asset_id = NEW.asset_id;
    END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF DATABASE SCRIPT
-- =====================================================================
