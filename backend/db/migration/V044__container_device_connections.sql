CREATE TABLE container_device_connection (
    container_code VARCHAR(50) PRIMARY KEY REFERENCES container(container_code),
    device_id VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    configured_by VARCHAR(100) NOT NULL,
    configured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_received_at TIMESTAMPTZ,
    last_observed_at TIMESTAMPTZ
);
CREATE TABLE container_device_packet (
    event_id UUID PRIMARY KEY,
    container_code VARCHAR(50) NOT NULL REFERENCES container(container_code),
    device_id VARCHAR(100) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trip_id UUID REFERENCES trip(id),
    vehicle_id UUID REFERENCES vehicle(id),
    payload JSONB NOT NULL,
    forward_status VARCHAR(30) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ
);
CREATE INDEX idx_device_packet_forward ON container_device_packet(forward_status,received_at);
CREATE INDEX idx_device_packet_recent ON container_device_packet(container_code,received_at DESC);
ALTER TABLE telemetry_event ADD COLUMN external_event_id UUID;
CREATE UNIQUE INDEX idx_telemetry_external_event ON telemetry_event(external_event_id)
    WHERE external_event_id IS NOT NULL;
