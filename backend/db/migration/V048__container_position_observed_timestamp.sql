-- Preserve the GPS device observation time separately from when the server received the packet.
ALTER TABLE container
    ADD COLUMN IF NOT EXISTS last_position_observed_at TIMESTAMPTZ;

-- For legacy positions without a device observation timestamp, the server receipt time is
-- the closest trustworthy freshness boundary already available.
UPDATE container
SET last_position_observed_at = last_position_received_at
WHERE last_position_observed_at IS NULL
  AND last_position_received_at IS NOT NULL;
