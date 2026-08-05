-- Migration for multi-image evidence support in FaultReports

CREATE TABLE IF NOT EXISTS ReportImages (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reportimages_report FOREIGN KEY (report_id) REFERENCES FaultReports(report_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
