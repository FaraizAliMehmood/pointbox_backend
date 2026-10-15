CREATE TABLE IF NOT EXISTS tiers (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  color          VARCHAR(255) NOT NULL DEFAULT 'from-gray-400 to-gray-500',
  bg_color       VARCHAR(255) NOT NULL DEFAULT 'bg-gray-50',
  border_color   VARCHAR(255) NOT NULL DEFAULT 'border-gray-200',
  min_points     INT NOT NULL DEFAULT 0,
  max_points     INT NULL,
  featured       TINYINT(1) NOT NULL DEFAULT 0,
  benefits       JSON NULL,
  expiry_months  TINYINT UNSIGNED NULL,
  `order`        INT NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_by     BIGINT UNSIGNED NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_tiers_created_by (created_by),
  CONSTRAINT fk_tiers_company FOREIGN KEY (created_by) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT chk_tiers_expiry_months CHECK (expiry_months IS NULL OR expiry_months IN (6, 12, 18, 24))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
