CREATE TABLE IF NOT EXISTS banners (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  badge            VARCHAR(255) NULL,
  title            VARCHAR(255) NOT NULL,
  description      TEXT NULL,
  image_url        VARCHAR(500) NOT NULL,
  public_id        VARCHAR(255) NULL,
  start_date       VARCHAR(50) NULL,
  end_date         VARCHAR(50) NULL,
  type             ENUM('regular','special_event') NOT NULL DEFAULT 'regular',
  language         ENUM('en','ar') NOT NULL DEFAULT 'en',
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  product_url      VARCHAR(500) NULL,
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string),
  -- disambiguated by created_by_model. No fixed foreign key.
  created_by       VARCHAR(64) NOT NULL,
  created_by_model ENUM('SuperAdmin','Admin','Company','Employee') NOT NULL DEFAULT 'SuperAdmin',
  points           INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_banners_is_active (is_active),
  KEY idx_banners_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
