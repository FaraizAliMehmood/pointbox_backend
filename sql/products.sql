CREATE TABLE IF NOT EXISTS products (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NULL,
  description      TEXT NULL,
  image            VARCHAR(500) NOT NULL,
  redeem_points    INT NOT NULL,
  coupon_code      VARCHAR(255) NULL,
  -- Mixed creator id (Company id or Employee id, as a string), disambiguated
  -- by created_by_model. No fixed foreign key.
  company          VARCHAR(64) NOT NULL,
  created_by_model ENUM('Company','Employee') NOT NULL DEFAULT 'Company',
  company_name     VARCHAR(255) NOT NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_products_company (company),
  KEY idx_products_is_active (is_active),
  CONSTRAINT chk_products_redeem_points CHECK (redeem_points >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
