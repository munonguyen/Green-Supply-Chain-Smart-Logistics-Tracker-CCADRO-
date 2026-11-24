-- Fuel station automation for tractors and refrigerated container gensets (depot RFID + fleet card + e-invoice sync).

CREATE TABLE IF NOT EXISTS fuel_station (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    station_type VARCHAR(30) NOT NULL CHECK (station_type IN ('INTERNAL_DEPOT', 'PARTNER_PETROLIMEX', 'PARTNER_OTHER')),
    price_region INTEGER NOT NULL DEFAULT 1 CHECK (price_region IN (1, 2)),
    corridor_tag VARCHAR(80),
    address VARCHAR(255),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuel_station_nozzle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES fuel_station(id) ON DELETE CASCADE,
    nozzle_code VARCHAR(30) NOT NULL,
    fuel_code VARCHAR(40) NOT NULL,
    tank_capacity_liters NUMERIC(12, 2) NOT NULL CHECK (tank_capacity_liters > 0),
    current_stock_liters NUMERIC(12, 2) NOT NULL CHECK (current_stock_liters >= 0),
    unit_price_vnd NUMERIC(12, 2) NOT NULL CHECK (unit_price_vnd > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (station_id, nozzle_code)
);

CREATE TABLE IF NOT EXISTS container_fuel_unit (
    container_id UUID PRIMARY KEY REFERENCES container(id) ON DELETE CASCADE,
    genset_code VARCHAR(50) NOT NULL UNIQUE,
    rfid_tag VARCHAR(60) UNIQUE,
    preferred_fuel_code VARCHAR(40) NOT NULL,
    tank_capacity_liters NUMERIC(8, 2) NOT NULL CHECK (tank_capacity_liters > 0),
    current_fuel_pct NUMERIC(5, 2) NOT NULL DEFAULT 100 CHECK (current_fuel_pct BETWEEN 0 AND 100),
    rated_liters_per_hour NUMERIC(6, 2) NOT NULL CHECK (rated_liters_per_hour > 0),
    min_quality_level INTEGER NOT NULL DEFAULT 5 CHECK (min_quality_level BETWEEN 2 AND 5),
    max_sulfur_ppm INTEGER NOT NULL DEFAULT 10 CHECK (max_sulfur_ppm >= 0),
    updated_by VARCHAR(120) NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuel_pump_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(80) NOT NULL UNIQUE,
    station_id UUID REFERENCES fuel_station(id) ON DELETE SET NULL,
    nozzle_id UUID REFERENCES fuel_station_nozzle(id) ON DELETE SET NULL,
    station_code VARCHAR(50) NOT NULL,
    nozzle_code VARCHAR(30) NOT NULL,
    asset_kind VARCHAR(30) NOT NULL CHECK (asset_kind IN ('VEHICLE', 'CONTAINER_GENSET')),
    vehicle_id UUID REFERENCES vehicle(id) ON DELETE SET NULL,
    container_id UUID REFERENCES container(id) ON DELETE SET NULL,
    asset_code VARCHAR(60) NOT NULL,
    fuel_code VARCHAR(40) NOT NULL,
    liters NUMERIC(10, 3) NOT NULL CHECK (liters > 0),
    unit_price_vnd NUMERIC(12, 2) NOT NULL CHECK (unit_price_vnd > 0),
    total_cost_vnd NUMERIC(15, 2) NOT NULL CHECK (total_cost_vnd >= 0),
    odometer_km NUMERIC(12, 2),
    engine_hours NUMERIC(10, 2),
    computed_rate NUMERIC(9, 3),
    physical_co2_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
    fossil_co2_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
    biogenic_co2_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
    validation_status VARCHAR(30) NOT NULL CHECK (validation_status IN ('AUTHORIZED', 'BLOCKED_INCOMPATIBLE', 'FLAGGED_ANOMALY')),
    validation_reason VARCHAR(500),
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('DEPOT_RFID', 'FLEET_CARD', 'E_INVOICE_SYNC', 'MANUAL_IMPORT')),
    invoice_ref VARCHAR(80),
    pumped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_tx_pumped_at ON fuel_pump_transaction (pumped_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_tx_asset ON fuel_pump_transaction (asset_kind, asset_code);

INSERT INTO fuel_station (id, station_code, name, station_type, price_region, corridor_tag, address, latitude, longitude, active)
VALUES
    ('a1000000-0000-0000-0000-000000000001', 'DEPOT-CATLAI-01', 'Trạm Bồn Nội Bộ Depot Cát Lái', 'INTERNAL_DEPOT', 1, 'CAT_LAI_DONG_NAI', 'Cổng B Cảng Cát Lái, TP. Thủ Đức, TP.HCM', 10.768900, 106.794500, TRUE),
    ('a1000000-0000-0000-0000-000000000002', 'PTX-QL51-LONGTHANH', 'CHXD Petrolimex Số 18 · QL51', 'PARTNER_PETROLIMEX', 1, 'CAT_LAI_CAI_MEP', 'Km 24 Quốc lộ 51, Long Thành, Đồng Nai', 10.779100, 106.953200, TRUE),
    ('a1000000-0000-0000-0000-000000000003', 'PTX-MYTHO-QL1A', 'CHXD Petrolimex Tiền Giang · Vùng 2', 'PARTNER_PETROLIMEX', 2, 'HCM_MEKONG_DELTA', 'Km 1962 Quốc lộ 1A, Mỹ Tho, Tiền Giang', 10.371200, 106.342800, TRUE)
ON CONFLICT (station_code) DO NOTHING;

INSERT INTO fuel_station_nozzle (station_id, nozzle_code, fuel_code, tank_capacity_liters, current_stock_liters, unit_price_vnd, active)
SELECT s.id, v.nozzle_code, v.fuel_code, v.cap, v.stock, v.price, TRUE
FROM (VALUES
    ('DEPOT-CATLAI-01', 'NZ-DO5-01', 'DIESEL_DO_0001S', 40000.00, 31450.00, 27900.00),
    ('DEPOT-CATLAI-01', 'NZ-DO2-02', 'DIESEL_DO_005S', 30000.00, 18200.00, 26100.00),
    ('PTX-QL51-LONGTHANH', 'PTX-51-A', 'DIESEL_DO_0001S', 50000.00, 42600.00, 28140.00),
    ('PTX-QL51-LONGTHANH', 'PTX-51-B', 'DIESEL_DO_005S', 50000.00, 39100.00, 26340.00),
    ('PTX-QL51-LONGTHANH', 'PTX-51-C', 'E10_RON95_V', 25000.00, 19800.00, 21100.00),
    ('PTX-MYTHO-QL1A', 'PTX-MT-A', 'DIESEL_DO_0001S', 35000.00, 22400.00, 28700.00),
    ('PTX-MYTHO-QL1A', 'PTX-MT-B', 'E10_RON95_III', 25000.00, 17350.00, 19480.00)
) AS v(station_code, nozzle_code, fuel_code, cap, stock, price)
JOIN fuel_station s ON s.station_code = v.station_code
ON CONFLICT (station_id, nozzle_code) DO NOTHING;

