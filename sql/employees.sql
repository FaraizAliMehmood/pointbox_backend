CREATE TABLE IF NOT EXISTS employees (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(50) NULL,
  username      VARCHAR(255) NULL,
  password      VARCHAR(255) NULL,
  duty_address  VARCHAR(500) NOT NULL,
  company_id    BIGINT UNSIGNED NOT NULL,
  company_name  VARCHAR(255) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string) of
  -- whoever activated this employee. No fixed foreign key.
  activated_by  VARCHAR(64) NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'employee',
  permissions   JSON NULL,
  otp           INT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_employees_company_id (company_id),
  KEY idx_employees_email (email),
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Replaces the embedded `fcmTokens` array from the Mongoose schema.
CREATE TABLE IF NOT EXISTS employee_fcm_tokens (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id  BIGINT UNSIGNED NOT NULL,
  token        VARCHAR(500) NOT NULL,
  device_type  ENUM('mobile','web') NOT NULL DEFAULT 'mobile',
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_employee_fcm_tokens (employee_id, token),
  CONSTRAINT fk_employee_fcm_tokens_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
