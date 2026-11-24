-- Keep engine/powertrain type intact; store actual retail fuel and measured consumption separately.
CREATE TABLE vehicle_fuel_profile (
    vehicle_id UUID PRIMARY KEY REFERENCES vehicle(id),
    selected_fuel_code VARCHAR(40) NOT NULL,
    consumption_per100km NUMERIC(9,3) NOT NULL CHECK(consumption_per100km > 0 AND consumption_per100km <= 200),
    annual_km NUMERIC(12,2) CHECK(annual_km >= 0 AND annual_km <= 1000000),
    min_ron INTEGER,
    max_ethanol_pct INTEGER,
    max_sulfur_ppm INTEGER,
    min_quality_level INTEGER NOT NULL CHECK(min_quality_level BETWEEN 2 AND 5),
    compatibility_evidence VARCHAR(1000) NOT NULL,
    consumption_evidence VARCHAR(1000) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revision BIGINT NOT NULL DEFAULT 0
);
