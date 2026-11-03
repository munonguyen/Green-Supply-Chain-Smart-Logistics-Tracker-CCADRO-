-- ==============================================================================
-- V013: Add 7-Fuel Price Catalog and Multi-Fuel GLEC v3 Model (TASK-18 / UC12)
-- Enables calculating emissions from Fuel Cost (VND) -> Liters and Fraud Detection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS fuel_price_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fuel_type VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    unit VARCHAR(15) NOT NULL DEFAULT 'LITER', -- LITER, KG, KWH
    unit_price_vnd NUMERIC(12, 2) NOT NULL,
    ttw_kg_co2_per_unit NUMERIC(10, 4) NOT NULL,
    wtt_kg_co2_per_unit NUMERIC(10, 4) NOT NULL,
    wtw_kg_co2_per_unit NUMERIC(10, 4) NOT NULL,
    empty_consumption_per_100km NUMERIC(8, 3) NOT NULL,
    loaded_penalty_per_ton_100km NUMERIC(8, 3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_type ON fuel_price_catalog(fuel_type);

-- Seed 7 reference transportation fuel catalogs with GLEC v3 factors & Vietnam baseline prices
INSERT INTO fuel_price_catalog (
    id, fuel_type, display_name, unit, unit_price_vnd,
    ttw_kg_co2_per_unit, wtt_kg_co2_per_unit, wtw_kg_co2_per_unit,
    empty_consumption_per_100km, loaded_penalty_per_ton_100km, is_active
) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'GASOLINE_RON95',
    'Xăng Không Chì RON 95-V (Euro 5)',
    'LITER',
    24500.00,
    2.3100,
    0.4000,
    2.7100,
    22.500,
    0.650,
    true
),
(
    'e0000000-0000-0000-0000-000000000002',
    'BIO_GASOLINE_E5',
    'Xăng Sinh Học E5 RON 92',
    'LITER',
    23200.00,
    2.1900,
    0.4000,
    2.5900,
    23.500,
    0.680,
    true
),
(
    'e0000000-0000-0000-0000-000000000003',
    'DIESEL_DO_005S',
    'Dầu Diesel DO 0.05S-II (Euro 4 chuẩn)',
    'LITER',
    21300.00,
    2.6800,
    0.5600,
    3.2400,
    20.000,
    0.550,
    true
),
(
    'e0000000-0000-0000-0000-000000000004',
    'DIESEL_DO_0001S',
    'Dầu Diesel DO 0.001S-V (Euro 5 sạch)',
    'LITER',
    22000.00,
    2.6200,
    0.5600,
    3.1800,
    19.200,
    0.520,
    true
),
(
    'e0000000-0000-0000-0000-000000000005',
    'BIODIESEL_B20',
    'Dầu Sinh Học Biodiesel B20 (20% Este dầu cọ/mỡ)',
    'LITER',
    21800.00,
    2.1400,
    0.4900,
    2.6300,
    20.500,
    0.560,
    true
),
(
    'e0000000-0000-0000-0000-000000000006',
    'CNG_COMPRESSED',
    'Khí Thiên Nhiên Nén CNG',
    'KG',
    16500.00,
    2.7500,
    0.2700,
    3.0200,
    18.000,
    0.480,
    true
),
(
    'e0000000-0000-0000-0000-000000000007',
    'EV_GRID_VN',
    'Điện Năng Xe Tải Điện (Lưới Điện Việt Nam 2024)',
    'KWH',
    3500.00,
    0.0000,
    0.6760,
    0.6760,
    95.000,
    2.100,
    true
)
ON CONFLICT (fuel_type) DO UPDATE SET
    unit_price_vnd = EXCLUDED.unit_price_vnd,
    ttw_kg_co2_per_unit = EXCLUDED.ttw_kg_co2_per_unit,
    wtt_kg_co2_per_unit = EXCLUDED.wtt_kg_co2_per_unit,
    wtw_kg_co2_per_unit = EXCLUDED.wtw_kg_co2_per_unit,
    empty_consumption_per_100km = EXCLUDED.empty_consumption_per_100km,
    loaded_penalty_per_ton_100km = EXCLUDED.loaded_penalty_per_ton_100km;

