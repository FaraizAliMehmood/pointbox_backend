CREATE TABLE IF NOT EXISTS queries (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id     BIGINT UNSIGNED NULL,
  customer_email  VARCHAR(255) NOT NULL,
  customer_name   VARCHAR(255) NULL,
  subject         VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  brand_id        BIGINT UNSIGNED NULL,
  transaction_id  VARCHAR(255) NULL,
  status          ENUM('pending','in_progress','resolved','closed') NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_queries_customer_id (customer_id),
  KEY idx_queries_brand_id (brand_id),
  CONSTRAINT fk_queries_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_queries_brand FOREIGN KEY (brand_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Replaces the embedded `responses` array from the Mongoose schema.
CREATE TABLE IF NOT EXISTS query_responses (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  query_id        BIGINT UNSIGNED NOT NULL,
  -- Mixed actor id (Mongo ObjectId string or MySQL integer id as string),
  -- disambiguated by response_model. No fixed foreign key.
  responded_by    VARCHAR(64) NULL,
  response_model  ENUM('SuperAdmin','Admin') NOT NULL DEFAULT 'SuperAdmin',
  response        TEXT NOT NULL,
  responded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_query_responses_query_id (query_id),
  CONSTRAINT fk_query_responses_query FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
