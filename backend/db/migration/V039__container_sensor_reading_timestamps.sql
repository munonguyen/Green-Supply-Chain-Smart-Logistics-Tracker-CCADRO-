-- Track sensor-group receipt times separately; partial packets must not make older readings look fresh.
ALTER TABLE container
    ADD COLUMN IF NOT EXISTS last_location_name_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_speed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_supply_air_temp_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_return_air_temp_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_reefer_set_point_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_reefer_alarm_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_humidity_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_shock_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_solar_power_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_battery_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_eta_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_seal_at TIMESTAMPTZ;
