CREATE TABLE IF NOT EXISTS super_admins (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  otp         INT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_super_admins_username (username),
  UNIQUE KEY uq_super_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
