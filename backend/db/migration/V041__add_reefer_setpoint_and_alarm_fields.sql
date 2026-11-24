ALTER TABLE container
    ADD COLUMN IF NOT EXISTS reefer_set_point_temp_c NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS reefer_temperature_alarm_status VARCHAR(50);
