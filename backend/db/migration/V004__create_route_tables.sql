-- V004__create_route_tables.sql
-- Routing entities (Routing module - UC05)

CREATE TABLE IF NOT EXISTS route_candidate (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE CASCADE,
    candidate_name VARCHAR(100) NOT NULL,
    provider_name VARCHAR(50) NOT NULL, -- OSRM, GRAPHHOPPER, MOCK
    distance_meters NUMERIC(12, 2) NOT NULL,
    duration_seconds NUMERIC(12, 2) NOT NULL,
    estimated_fuel_liters NUMERIC(10, 2),
    estimated_co2_kg NUMERIC(10, 2) NOT NULL,
    composite_score NUMERIC(6, 4),
    route_geometry GEOMETRY(LineString, 4326),
    waypoints_json JSONB,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_decision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE CASCADE,
    selected_candidate_id UUID NOT NULL REFERENCES route_candidate(id),
    decision_type VARCHAR(50) NOT NULL DEFAULT 'RECOMMENDED', -- RECOMMENDED, MANUAL_OVERRIDE
    dispatcher_notes TEXT,
    decided_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    decided_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    route_geometry GEOMETRY(LineString, 4326),
    total_distance_meters NUMERIC(12, 2) NOT NULL,
    total_duration_seconds NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    reason VARCHAR(100) NOT NULL DEFAULT 'INITIAL_PLANNING', -- INITIAL_PLANNING, REROUTE_DEVIATION, REROUTE_TRAFFIC
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shipment_version UNIQUE(shipment_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_candidate_shipment ON route_candidate(shipment_id);
CREATE INDEX IF NOT EXISTS idx_route_version_shipment ON route_version(shipment_id);
