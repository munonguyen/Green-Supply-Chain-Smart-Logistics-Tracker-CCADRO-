#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "==> Seeding baseline CCADRO demo data into PostgreSQL..."

docker compose exec -T postgres psql -U ${POSTGRES_USER:-ccadro} -d ${POSTGRES_DB:-ccadro} <<-EOSQL
  -- 1. Vehicle V001
  INSERT INTO vehicle (id, vehicle_code, plate_number, fuel_type, euro_standard, max_payload_tons, empty_weight_tons, status)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'V001', '51C-888.99', 'DIESEL', 'EURO_5', 20.00, 8.00, 'AVAILABLE')
  ON CONFLICT (vehicle_code) DO NOTHING;

  -- 2. Driver D001
  INSERT INTO driver (id, driver_code, full_name, phone, license_number, status)
  VALUES ('b0000000-0000-0000-0000-000000000001', 'D001', 'Nguyen Van Tai', '0901234567', 'FC-79102456', 'AVAILABLE')
  ON CONFLICT (driver_code) DO NOTHING;

  -- 3. Shipment SH001 (Cat Lai -> VSIP 1)
  INSERT INTO shipment (id, shipment_code, customer_id, origin_name, origin_address, origin_geom, destination_name, destination_address, destination_geom, cargo_weight_tons, cargo_volume_m3, required_delivery_time, status, assigned_vehicle_id, assigned_driver_id)
  VALUES (
      'c0000000-0000-0000-0000-000000000001', 'SH001', 'CUST-LOGIX-01',
      'Cang Cat Lai (Cat Lai Port)', 'Nguyen Thi Dinh, District 2, Ho Chi Minh City',
      ST_SetSRID(ST_MakePoint(106.795677, 10.762622), 4326),
      'VSIP 1 Binh Duong', 'Dai lo Huu Nghi, Thuan An, Binh Duong',
      ST_SetSRID(ST_MakePoint(106.697426, 10.931215), 4326),
      15.00, 32.00, CURRENT_TIMESTAMP + INTERVAL '8 hours', 'PLANNED',
      'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'
  ) ON CONFLICT (shipment_code) DO NOTHING;

  -- 4. Emission Factor EF001
  INSERT INTO emission_factor (id, factor_code, fuel_type, vehicle_category, euro_standard, empty_factor_kg_per_km, full_factor_kg_per_km, default_tonne_km_factor, source_reference, is_active)
  VALUES ('d0000000-0000-0000-0000-000000000001', 'EF001', 'DIESEL', 'HEAVY_DUTY_TRUCK', 'EURO_5', 0.620000, 0.950000, 0.080000, 'GLEC_FRAMEWORK_V3', TRUE)
  ON CONFLICT (factor_code) DO NOTHING;

  -- 5. Carbon Corridor Benchmark
  INSERT INTO carbon_benchmark (id, benchmark_name, origin_zone, destination_zone, average_co2e_per_tonne_km, best_in_class_co2e_per_tonne_km, period_month)
  VALUES ('e0000000-0000-0000-0000-000000000001', 'HCMC to Binh Duong Heavy Industrial Corridor', 'HCMC_PORT_CLUSTER', 'BINH_DUONG_VSIP_CLUSTER', 0.082000, 0.068000, TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
  ON CONFLICT DO NOTHING;

  -- 6. Demo Trip T001
  INSERT INTO trip (id, trip_code, shipment_id, vehicle_id, driver_id, start_time, status, actual_distance_meters)
  VALUES ('f0000000-0000-0000-0000-000000000001', 'TRIP-SH001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP, 'EN_ROUTE', 14200.00)
  ON CONFLICT (trip_code) DO NOTHING;
EOSQL

echo "✓ Baseline demo data seeded successfully:"
echo "  • Vehicle: V001 (Diesel Euro 5, 20t payload)"
echo "  • Driver: D001 (Nguyen Van Tai)"
echo "  • Shipment: SH001 (Cat Lai Port -> VSIP 1)"
echo "  • Emission Factor: EF001 (0.08 kgCO2e/tonne-km GLEC)"
echo "  • Demo Trip: TRIP-SH001 (En Route)"
