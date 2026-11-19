-- V035__link_driver_account_username_and_trip_arrival.sql
-- Link Driver profile to Identity account username for Driver Portal isolation,
-- persist destination arrival geofence state on trip, and expand container ePOD signature/notes.

-- 1. Link Driver profile to Identity account username for Driver Portal isolation
ALTER TABLE driver ADD COLUMN IF NOT EXISTS account_username VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_driver_account_username ON driver(account_username);

UPDATE driver
SET account_username = 'driver'
WHERE driver_code = 'DRV-FC-001'
  AND (account_username IS NULL OR btrim(account_username) = '');

-- 2. Persist destination arrival geofence state on trip
ALTER TABLE trip ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE trip ADD COLUMN IF NOT EXISTS arrival_status VARCHAR(30) NOT NULL DEFAULT 'AT_ORIGIN';
ALTER TABLE trip ADD COLUMN IF NOT EXISTS distance_to_destination_meters NUMERIC(12, 2);

-- 3. Allow long real ePOD signatures and optional notes on container
ALTER TABLE container ALTER COLUMN epod_signature TYPE TEXT;
ALTER TABLE container ADD COLUMN IF NOT EXISTS epod_notes TEXT;
