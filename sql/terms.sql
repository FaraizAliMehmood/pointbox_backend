CREATE TABLE IF NOT EXISTS terms (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  content          TEXT NOT NULL,
  section          ENUM('general','user-agreement','privacy','points-policy','refund','liability') NOT NULL DEFAULT 'general',
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string),
  -- disambiguated by created_by_model. No fixed foreign key.
  created_by       VARCHAR(64) NOT NULL,
  created_by_model ENUM('SuperAdmin','Admin') NOT NULL DEFAULT 'SuperAdmin',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
