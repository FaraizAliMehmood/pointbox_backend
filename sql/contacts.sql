CREATE TABLE IF NOT EXISTS contacts (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(50) NULL,
  subject     ENUM('general','support','billing','partnership','feedback','other') NOT NULL,
  message     TEXT NOT NULL,
  status      ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
  read_at     TIMESTAMP NULL,
  replied_at  TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_contacts_status_created_at (status, created_at),
  KEY idx_contacts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
