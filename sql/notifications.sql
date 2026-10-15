CREATE TABLE IF NOT EXISTS notifications (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  type             ENUM('website','mobile','both') NOT NULL DEFAULT 'both',
  target           ENUM('all','customers','company','specific') NOT NULL DEFAULT 'all',
  -- Array of Customer or Company ids (as strings), disambiguated by target_model.
  target_ids       JSON NULL,
  target_model     ENUM('Customer','Company') NULL,
  company_id       BIGINT UNSIGNED NULL,
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string),
  -- disambiguated by created_by_model. No fixed foreign key.
  created_by       VARCHAR(64) NOT NULL,
  created_by_model ENUM('SuperAdmin','Admin','Company') NULL,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  sent_at          TIMESTAMP NULL,
  data             JSON NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_notifications_company_id (company_id),
  CONSTRAINT fk_notifications_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
