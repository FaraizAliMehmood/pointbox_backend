-- Adds structured columns for tier-specific fields that were previously only
-- encoded as free text inside `benefits`:
--   earn_rate        -> "points earned per $1 spent" (Silver/Gold/Platinum/etc.)
--   birthday_points  -> flat bonus points awarded on the Birthday Reward tier
--   valid_from/to    -> membership validity window for the Exclusive Members tier
ALTER TABLE tiers
  ADD COLUMN earn_rate DECIMAL(6,2) NULL AFTER expiry_months,
  ADD COLUMN birthday_points INT UNSIGNED NULL AFTER earn_rate,
  ADD COLUMN valid_from DATE NULL AFTER birthday_points,
  ADD COLUMN valid_to DATE NULL AFTER valid_from;
