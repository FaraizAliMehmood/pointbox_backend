CREATE TABLE IF NOT EXISTS ai_api_keys (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider    ENUM('openai','anthropic','gemini','stability','elevenlabs','other') NOT NULL,
  label       VARCHAR(255) NOT NULL,
  api_key     TEXT NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  -- Holds a Mongo ObjectId string for a legacy Admin actor or a MySQL integer id
  -- (as a string) for a SuperAdmin actor; no fixed foreign key since the actor
  -- model is polymorphic.
  created_by  VARCHAR(64) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
