-- V003__create_shipment.sql
-- Shipment entity (Shipment module)

CREATE TABLE IF NOT EXISTS shipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    origin_name VARCHAR(200) NOT NULL,
    origin_address TEXT,
    origin_geom GEOMETRY(Point, 4326) NOT NULL,
    destination_name VARCHAR(200) NOT NULL,
    destination_address TEXT,
    destination_geom GEOMETRY(Point, 4326) NOT NULL,
    cargo_weight_tons NUMERIC(10, 2) NOT NULL,
    cargo_volume_m3 NUMERIC(10, 2),
    required_delivery_time TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PLANNED, DISPATCHED, IN_TRANSIT, DELIVERED, CANCELLED
    assigned_vehicle_id UUID REFERENCES vehicle(id),
    assigned_driver_id UUID REFERENCES driver(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_status ON shipment(status);
CREATE INDEX IF NOT EXISTS idx_shipment_origin_geom ON shipment USING GIST (origin_geom);
CREATE INDEX IF NOT EXISTS idx_shipment_dest_geom ON shipment USING GIST (destination_geom);
