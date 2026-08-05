-- Migration for WorkOrderComments table to support Manager-Technician communication timeline

CREATE TABLE IF NOT EXISTS WorkOrderComments (
    comment_id  INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    user_id     INT NOT NULL,
    comment     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wocomments_order FOREIGN KEY (order_id) REFERENCES WorkOrders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_wocomments_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
