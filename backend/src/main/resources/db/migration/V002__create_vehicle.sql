-- V002__create_vehicle.sql
-- Vehicle and Driver entities (Asset module)

CREATE TABLE IF NOT EXISTS vehicle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_code VARCHAR(50) NOT NULL UNIQUE,
    plate_number VARCHAR(20) NOT NULL,
    fuel_type VARCHAR(30) NOT NULL, -- DIESEL, ELECTRIC, HYBRID, CNG
    euro_standard VARCHAR(20) NOT NULL, -- EURO_4, EURO_5, EURO_6
    max_payload_tons NUMERIC(10, 2) NOT NULL,
    empty_weight_tons NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, IN_TRANSIT, MAINTENANCE
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    license_number VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ON_TRIP, INACTIVE
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_status ON vehicle(status);
CREATE INDEX IF NOT EXISTS idx_driver_status ON driver(status);
