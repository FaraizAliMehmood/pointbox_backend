CREATE TABLE IF NOT EXISTS customer_notifications (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id      BIGINT UNSIGNED NOT NULL,
  notification_id  BIGINT UNSIGNED NOT NULL,
  is_read          TINYINT(1) NOT NULL DEFAULT 0,
  read_at          TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_customer_notifications_customer (customer_id),
  KEY idx_customer_notifications_notification (notification_id),
  CONSTRAINT fk_customer_notifications_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_notifications_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
