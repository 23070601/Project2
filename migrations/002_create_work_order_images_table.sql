-- Migration for multi-image evidence support in WorkOrders

CREATE TABLE IF NOT EXISTS WorkOrderImages (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workorderimages_order FOREIGN KEY (order_id) REFERENCES WorkOrders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
