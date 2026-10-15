CREATE TABLE IF NOT EXISTS customers (
  id                              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username                        VARCHAR(255) NULL,
  email                           VARCHAR(255) NOT NULL,
  password                        VARCHAR(255) NULL,
  phone                           VARCHAR(50) NULL,
  address                         VARCHAR(500) NULL,
  country                         VARCHAR(100) NULL,
  google_id                       VARCHAR(255) NULL,
  is_google_signup                TINYINT(1) NOT NULL DEFAULT 0,
  -- Preserves redeem/tier points for brands the customer has unlinked, so
  -- re-linking can restore them. Format: { "<companyId>": <points> }.
  unlinked_brands_redeem_points   JSON NULL,
  unlinked_brands_tier_points     JSON NULL,
  total_points                    INT NOT NULL DEFAULT 0,
  is_active                       TINYINT(1) NOT NULL DEFAULT 1,
  role                            VARCHAR(50) NOT NULL DEFAULT 'customer',
  created_by                      ENUM('superadmin','company') NOT NULL DEFAULT 'company',
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string),
  -- disambiguated by created_by_model. No fixed foreign key.
  created_by_id                   VARCHAR(64) NULL,
  created_by_model                ENUM('SuperAdmin','Company') NULL,
  otp                             INT NULL,
  device_token                    VARCHAR(500) NULL,
  email_verified                  TINYINT(1) NOT NULL DEFAULT 0,
  created_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_customers_email (email),
  KEY idx_customers_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Replaces the embedded `linkedCompanies` array from the Mongoose schema.
CREATE TABLE IF NOT EXISTS customer_companies (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id   BIGINT UNSIGNED NOT NULL,
  company_id    BIGINT UNSIGNED NOT NULL,
  company_name  VARCHAR(255) NULL,
  linked_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeem_points INT NOT NULL DEFAULT 0,
  tier_points   INT NOT NULL DEFAULT 0,

  UNIQUE KEY uq_customer_companies (customer_id, company_id),
  KEY idx_customer_companies_company_id (company_id),
  CONSTRAINT fk_customer_companies_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_companies_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
