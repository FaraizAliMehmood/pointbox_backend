CREATE TABLE IF NOT EXISTS companies (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_name    VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NULL,
  password        VARCHAR(255) NOT NULL,
  phone           VARCHAR(50) NULL,
  license_number  VARCHAR(255) NOT NULL,
  vat_number      VARCHAR(255) NOT NULL,
  address         VARCHAR(500) NULL,
  company_logo    VARCHAR(500) NULL,
  public_id       VARCHAR(255) NULL,
  country         VARCHAR(100) NULL,
  role            VARCHAR(50) NOT NULL DEFAULT 'company',
  employee_count  INT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  ai_api_enabled  TINYINT(1) NOT NULL DEFAULT 0,
  otp             INT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_companies_license_number (license_number),
  UNIQUE KEY uq_companies_vat_number (vat_number),
  KEY idx_companies_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
