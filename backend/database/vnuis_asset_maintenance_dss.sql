-- =====================================================================
-- CLASSROOM ASSET MAINTENANCE DECISION SUPPORT SYSTEM (DSS)
-- VNU International School - Project II (Group 2)
-- =====================================================================
-- Dialect: MySQL 8.0+ (AUTO_INCREMENT, CHECK constraints, JSON...)
--
-- Bám theo thiết kế 6 bảng gốc trong tài liệu "INS328201-Project II"
-- (Users, Classrooms, Assets, FaultReports, WorkOrders, UserConfirmations),
-- và bổ sung thêm 3 phần để đáp ứng đầy đủ các yêu cầu chưa được bảng
-- gốc bao phủ:
--   1) WorkOrderStatusHistory + AuditLog  -> NFR-08 (Auditability):
--      ghi lại toàn bộ lịch sử thay đổi trạng thái / hành động người dùng.
--   2) Notifications                      -> FR-U06 / FR-05: lưu lịch sử
--      thông báo thay đổi trạng thái cho người báo cáo.
--   3) technician_specialty trong Users   -> mở rộng cho DSS2 (câu 23,
--      Reflection) để tương lai phân bổ theo chuyên môn, không chỉ theo
--      số lượng việc đang xử lý.
-- =====================================================================

DROP DATABASE IF EXISTS vnuis_asset_maintenance_dss;
CREATE DATABASE vnuis_asset_maintenance_dss
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE vnuis_asset_maintenance_dss;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- TABLE 1: Users
-- Lưu tài khoản và phân quyền hệ thống (FR-01, FR-U01, FR-T01, FR-M01)
-- ---------------------------------------------------------------------
CREATE TABLE Users (
    user_id                 INT AUTO_INCREMENT PRIMARY KEY,
    full_name               VARCHAR(100)    NOT NULL,
    email                   VARCHAR(100)    NOT NULL UNIQUE,
    password_hash           VARCHAR(255)    NOT NULL,
    role                    VARCHAR(20)     NOT NULL DEFAULT 'User',
    phone                   VARCHAR(20)     NULL,
    -- Chuyên môn của kỹ thuật viên, phục vụ mở rộng DSS2 trong tương lai
    -- (Electrical, Networking, Software, HVAC, General...). NULL với vai
    -- trò không phải Technician.
    technician_specialty    VARCHAR(50)     NULL,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('User', 'Technician', 'Manager'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 2: Classrooms
-- Lưu phòng học và mã QR hỗ trợ báo cáo sự cố nhanh (FR-02, FR-U02)
-- ---------------------------------------------------------------------
CREATE TABLE Classrooms (
    room_id         INT AUTO_INCREMENT PRIMARY KEY,
    room_name       VARCHAR(20)     NOT NULL UNIQUE,
    qr_code         VARCHAR(255)    NULL,
    building        VARCHAR(50)     NULL,
    floor_number    INT             NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 3: Assets
-- Quản lý thiết bị theo phòng, theo dõi số lần hỏng cho DSS3 (FR-10, FR-M05)
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
-- Ghi nhận báo cáo sự cố, mức ưu tiên DSS1 và trạng thái tổng quát
-- (FR-03, FR-U03, FR-04, FR-M02)
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
-- Quản lý vòng đời xử lý công việc, hỗ trợ đề xuất kỹ thuật viên DSS2
-- (FR-05, FR-06, FR-07, FR-08, FR-M03, FR-M04, FR-T02, FR-T04)
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
-- Xác nhận và phản hồi chất lượng sửa chữa từ người báo cáo (FR-11)
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
-- TABLE 7: WorkOrderStatusHistory  (BỔ SUNG - NFR-08 Auditability)
-- Ghi lại từng bước chuyển trạng thái của WorkOrder (Assigned -> Received
-- -> In Progress -> Completed -> Closed) kèm mốc thời gian và người thực
-- hiện, phục vụ truy vết và phân tích lỗi lặp lại.
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
-- TABLE 8: AuditLog  (BỔ SUNG - NFR-08 Auditability)
-- Nhật ký chung cho mọi hành động quan trọng trong hệ thống: Asset ID,
-- Classroom ID, Technician, Date, Status, User Actions... (đúng yêu cầu
-- NFR-08). Dùng cho các hành động không thuộc vòng đời WorkOrder, ví dụ
-- CRUD trên Assets/Classrooms/Users (FR-M07), export report (FR-M11).
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
-- TABLE 9: Notifications  (BỔ SUNG - FR-U06 / FR-05)
-- Lưu lịch sử thông báo thay đổi trạng thái gửi tới người dùng, để hiển
-- thị trên giao diện web (badge/thông báo) và cho phép tra cứu lại.
-- ---------------------------------------------------------------------
CREATE TABLE Notifications (
    notification_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT             NOT NULL,
    report_id           INT             NULL,
    order_id            INT             NULL,
    message             VARCHAR(255)    NOT NULL,
    is_read              BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_report FOREIGN KEY (report_id)
        REFERENCES FaultReports(report_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_order FOREIGN KEY (order_id)
        REFERENCES WorkOrders(order_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- INDEXES
-- Hỗ trợ tìm kiếm/lọc nhiều tiêu chí (FR-T06, FR-M10) và truy vấn nhanh
-- trong 3 giây (NFR-01)
-- =====================================================================
CREATE INDEX idx_assets_room              ON Assets(room_id);
CREATE INDEX idx_assets_status            ON Assets(status);
CREATE INDEX idx_faultreports_reporter    ON FaultReports(reporter_id);
CREATE INDEX idx_faultreports_asset       ON FaultReports(asset_id);
CREATE INDEX idx_faultreports_room        ON FaultReports(room_id);
CREATE INDEX idx_faultreports_status      ON FaultReports(status);
CREATE INDEX idx_faultreports_priority    ON FaultReports(priority);
CREATE INDEX idx_faultreports_reported_at ON FaultReports(reported_at);
CREATE INDEX idx_workorders_technician    ON WorkOrders(technician_id);
CREATE INDEX idx_workorders_manager       ON WorkOrders(manager_id);
CREATE INDEX idx_workorders_task_status   ON WorkOrders(task_status);
CREATE INDEX idx_woh_order                ON WorkOrderStatusHistory(order_id);
CREATE INDEX idx_auditlog_user            ON AuditLog(user_id);
CREATE INDEX idx_auditlog_entity          ON AuditLog(entity_table, entity_id);
CREATE INDEX idx_notifications_user_read  ON Notifications(user_id, is_read);

-- =====================================================================
-- TRIGGERS
-- =====================================================================
DELIMITER $$

-- Khi có FaultReport mới: tăng failure_count và chuyển Asset -> "Under
-- Repair" (hỗ trợ DSS3 - FR-10) + ghi AuditLog
CREATE TRIGGER trg_faultreports_after_insert
AFTER INSERT ON FaultReports
FOR EACH ROW
BEGIN
    IF NEW.asset_id IS NOT NULL THEN
        UPDATE Assets
        SET failure_count = failure_count + 1,
            last_fault_at = NEW.reported_at,
            status = CASE WHEN status = 'Retired' THEN status ELSE 'Under Repair' END
        WHERE asset_id = NEW.asset_id;
    END IF;

    INSERT INTO AuditLog (user_id, action_type, entity_table, entity_id, room_id, asset_id, description)
    VALUES (NEW.reporter_id, 'CREATE', 'FaultReports', NEW.report_id, NEW.room_id, NEW.asset_id,
            CONCAT('New fault report submitted with priority ', NEW.priority));
END$$

-- Khi WorkOrder được tạo mới: ghi lịch sử trạng thái ban đầu + thông báo
-- cho người báo cáo (FR-U06)
CREATE TRIGGER trg_workorders_after_insert
AFTER INSERT ON WorkOrders
FOR EACH ROW
BEGIN
    DECLARE v_reporter_id INT;

    INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, changed_by, note)
    VALUES (NEW.order_id, NULL, NEW.task_status, NEW.manager_id, 'Work order created and assigned');

    SELECT reporter_id INTO v_reporter_id FROM FaultReports WHERE report_id = NEW.report_id;

    INSERT INTO Notifications (user_id, report_id, order_id, message)
    VALUES (v_reporter_id, NEW.report_id, NEW.order_id,
            CONCAT('Your fault report #', NEW.report_id, ' has been assigned to a technician.'));

    UPDATE FaultReports SET status = 'Processing' WHERE report_id = NEW.report_id;
END$$

-- Khi WorkOrder đổi trạng thái: ghi lịch sử, gửi thông báo, và tự cập
-- nhật Asset -> "Operational" khi hoàn tất (FR-08, FR-T04, NFR-08)
CREATE TRIGGER trg_workorders_after_update
AFTER UPDATE ON WorkOrders
FOR EACH ROW
BEGIN
    DECLARE v_asset_id INT;
    DECLARE v_reporter_id INT;

    IF OLD.task_status <> NEW.task_status THEN
        INSERT INTO WorkOrderStatusHistory (order_id, old_status, new_status, changed_by)
        VALUES (NEW.order_id, OLD.task_status, NEW.task_status, NEW.technician_id);

        SELECT fr.asset_id, fr.reporter_id INTO v_asset_id, v_reporter_id
        FROM FaultReports fr WHERE fr.report_id = NEW.report_id;

        INSERT INTO Notifications (user_id, report_id, order_id, message)
        VALUES (v_reporter_id, NEW.report_id, NEW.order_id,
                CONCAT('Your fault report #', NEW.report_id, ' status changed to ', NEW.task_status, '.'));

        IF NEW.task_status IN ('Completed', 'Closed') AND v_asset_id IS NOT NULL THEN
            UPDATE Assets
            SET status = 'Operational'
            WHERE asset_id = v_asset_id AND status <> 'Recommended for Replacement';

            UPDATE FaultReports SET status = 'Completed' WHERE report_id = NEW.report_id;
        END IF;
    END IF;
END$$

-- Khi Asset vượt ngưỡng hỏng hóc: tự chuyển sang "Recommended for
-- Replacement" và ghi AuditLog (DSS3 - FR-10, FR-M05)
CREATE TRIGGER trg_assets_before_update_dss3
BEFORE UPDATE ON Assets
FOR EACH ROW
BEGIN
    IF NEW.failure_count >= 3 AND NEW.status NOT IN ('Retired', 'Recommended for Replacement') THEN
        SET NEW.status = 'Recommended for Replacement';
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- VIEWS - Hỗ trợ 3 module DSS và Dashboard KPI (FR-09, FR-M06)
-- =====================================================================

-- DSS3: Danh sách thiết bị vượt ngưỡng hỏng hóc, đề xuất thay thế
CREATE OR REPLACE VIEW v_dss3_replacement_alerts AS
SELECT
    a.asset_id, a.asset_name, a.asset_type, c.room_name,
    a.failure_count, a.last_fault_at, a.status AS current_status
FROM Assets a
JOIN Classrooms c ON c.room_id = a.room_id
WHERE a.failure_count >= 3 AND a.status <> 'Retired';

-- DSS2: Khối lượng công việc hiện tại của từng kỹ thuật viên, kèm
-- chuyên môn để hỗ trợ mở rộng thuật toán phân bổ trong tương lai
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
WHERE u.role = 'Technician'
GROUP BY u.user_id, u.full_name, u.technician_specialty
ORDER BY active_workload ASC;

-- Dashboard KPI: MTTR (Mean Time To Repair) theo kỹ thuật viên/loại thiết bị
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

-- Dashboard KPI: Thời gian ngừng hoạt động (downtime) theo thiết bị
CREATE OR REPLACE VIEW v_dashboard_asset_downtime AS
SELECT
    a.asset_id, a.asset_name, fr.report_id, fr.reported_at, wo.resolved_at,
    TIMESTAMPDIFF(HOUR, fr.reported_at, wo.resolved_at) AS downtime_hours
FROM FaultReports fr
JOIN Assets a ON a.asset_id = fr.asset_id
LEFT JOIN WorkOrders wo ON wo.report_id = fr.report_id
WHERE wo.resolved_at IS NOT NULL;

-- =====================================================================
-- SAMPLE SEED DATA (dữ liệu mẫu để kiểm thử)
-- =====================================================================
INSERT INTO Users (full_name, email, password_hash, role, technician_specialty) VALUES
('Nguyen Van A',   'lecturer.a@vnuis.edu.vn', 'hash_placeholder_1', 'User',       NULL),
('Tran Thi B',     'student.b@vnuis.edu.vn',  'hash_placeholder_2', 'User',       NULL),
('Le Van C',       'tech.c@vnuis.edu.vn',     'hash_placeholder_3', 'Technician', 'Electrical'),
('Pham Thi D',     'tech.d@vnuis.edu.vn',     'hash_placeholder_4', 'Technician', 'Networking'),
('Hoang Van E',    'manager.e@vnuis.edu.vn',  'hash_placeholder_5', 'Manager',    NULL);

INSERT INTO Classrooms (room_name, qr_code, building, floor_number) VALUES
('R302', 'QR-R302', 'Building A', 3),
('R401', 'QR-R401', 'Building A', 4),
('R512', 'QR-R512', 'Building B', 5);

INSERT INTO Assets (asset_name, asset_type, room_id, status, failure_count) VALUES
('Sony Projector VPL',        'Projector',        1, 'Operational', 0),
('Dell Classroom PC',         'Computer',         1, 'Operational', 0),
('Daikin Air Conditioner',    'Air Conditioner',  2, 'Operational', 0),
('Interactive Smart TV 65in', 'Interactive TV',   3, 'Operational', 0);

INSERT INTO FaultReports (reporter_id, asset_id, room_id, description, priority, status) VALUES
(1, 1, 1, 'Projector shows no signal, screen stays black.', 'High', 'Pending Approval'),
(2, 3, 2, 'Air conditioner not cooling during hot weather.', 'High', 'Pending Approval');

-- Ví dụ tạo work order cho báo cáo #1 (kích hoạt trigger ghi history +
-- notification tự động)
INSERT INTO WorkOrders (report_id, manager_id, technician_id, task_status) VALUES
(1, 5, 3, 'Assigned');

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
