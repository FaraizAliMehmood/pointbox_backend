CREATE TABLE IF NOT EXISTS settings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  terms_condition TEXT NULL,
  address         VARCHAR(500) NOT NULL,
  phone           VARCHAR(50) NULL,
  email           VARCHAR(255) NULL,
  location        VARCHAR(500) NULL,
  logo_url        VARCHAR(500) NOT NULL,
  public_id       VARCHAR(255) NULL,
  instagram       VARCHAR(255) NULL,
  facebook        VARCHAR(255) NULL,
  x               VARCHAR(255) NULL,
  youtube         VARCHAR(255) NULL,
  tiktok          VARCHAR(255) NULL,
  linkedin        VARCHAR(255) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
