-- V005__create_trip_tracking.sql
-- Trip and Tracking entities (Tracking & Routing modules - UC09, UC10)

CREATE TABLE IF NOT EXISTS trip (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_code VARCHAR(50) NOT NULL UNIQUE,
    shipment_id UUID NOT NULL REFERENCES shipment(id),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    driver_id UUID NOT NULL REFERENCES driver(id),
    active_route_version_id UUID REFERENCES route_version(id),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, EN_ROUTE, DELAYED, COMPLETED, CANCELLED
    actual_distance_meters NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    timestamp TIMESTAMPTZ NOT NULL,
    location_geom GEOMETRY(Point, 4326) NOT NULL,
    speed_kmh NUMERIC(6, 2),
    heading_degrees NUMERIC(5, 2),
    distance_from_route_meters NUMERIC(10, 2),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deviation_alert (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL, -- YELLOW, RED
    deviation_distance_meters NUMERIC(10, 2) NOT NULL,
    location_geom GEOMETRY(Point, 4326) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED
    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reroute_proposal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    trigger_reason VARCHAR(50) NOT NULL, -- DEVIATION_RED, TRAFFIC_INCIDENT, ROAD_CLOSED
    original_remaining_distance_meters NUMERIC(12, 2) NOT NULL,
    proposed_distance_meters NUMERIC(12, 2) NOT NULL,
    benefit_ratio NUMERIC(6, 4) NOT NULL,
    proposed_geometry GEOMETRY(LineString, 4326),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_DISPATCHER', -- PENDING_DISPATCHER, ACCEPTED, REJECTED, EXPIRED
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_trip ON telemetry_event(trip_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry_event(timestamp);
CREATE INDEX IF NOT EXISTS idx_deviation_trip ON deviation_alert(trip_id);
CREATE INDEX IF NOT EXISTS idx_reroute_trip ON reroute_proposal(trip_id);
