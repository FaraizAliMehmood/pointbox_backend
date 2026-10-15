CREATE TABLE IF NOT EXISTS newsletter_emails (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  source      ENUM('manual','footer','signup') NOT NULL DEFAULT 'footer',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_newsletter_emails_email (email),
  KEY idx_newsletter_emails_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
