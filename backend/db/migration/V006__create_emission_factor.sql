-- V006__create_emission_factor.sql
-- Carbon calculation and benchmarking entities (Carbon module - UC12, UC13)

CREATE TABLE IF NOT EXISTS emission_factor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_code VARCHAR(50) NOT NULL UNIQUE,
    fuel_type VARCHAR(30) NOT NULL, -- DIESEL, ELECTRIC, HYBRID, CNG
    vehicle_category VARCHAR(50) NOT NULL, -- RIGID_TRUCK, ARTICULATED_TRUCK, VAN
    euro_standard VARCHAR(20) NOT NULL, -- EURO_4, EURO_5, EURO_6
    empty_factor_kg_per_km NUMERIC(10, 6) NOT NULL,
    full_factor_kg_per_km NUMERIC(10, 6) NOT NULL,
    default_tonne_km_factor NUMERIC(10, 6) NOT NULL DEFAULT 0.080000, -- GLEC / DEFRA default
    source_reference VARCHAR(100) NOT NULL DEFAULT 'GLEC_FRAMEWORK_V3',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emission_calculation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    calculation_type VARCHAR(30) NOT NULL, -- PLANNING, IN_TRANSIT, POST_TRIP_ACCOUNTING
    calculation_method VARCHAR(50) NOT NULL DEFAULT 'GLEC_V3', -- GLEC_V3, DEFRA, DISTANCE_WEIGHTED
    total_co2e_kg NUMERIC(12, 4) NOT NULL,
    cargo_payload_tons NUMERIC(10, 2) NOT NULL,
    total_distance_km NUMERIC(12, 3) NOT NULL,
    empty_running_distance_km NUMERIC(12, 3) NOT NULL DEFAULT 0,
    details_json JSONB,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carbon_benchmark (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    benchmark_name VARCHAR(100) NOT NULL,
    origin_zone VARCHAR(100) NOT NULL,
    destination_zone VARCHAR(100) NOT NULL,
    average_co2e_per_tonne_km NUMERIC(10, 6) NOT NULL,
    best_in_class_co2e_per_tonne_km NUMERIC(10, 6) NOT NULL,
    period_month VARCHAR(7) NOT NULL, -- e.g. '2026-10'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emission_trip ON emission_calculation(trip_id);
CREATE INDEX IF NOT EXISTS idx_emission_type ON emission_calculation(calculation_type);
CREATE INDEX IF NOT EXISTS idx_benchmark_corridor ON carbon_benchmark(origin_zone, destination_zone);
