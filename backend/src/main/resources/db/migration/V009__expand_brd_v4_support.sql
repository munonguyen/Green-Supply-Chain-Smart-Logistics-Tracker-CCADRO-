-- V009__expand_brd_v4_support.sql
-- Comprehensive Schema Expansion supporting CCADRO BRD v4.0 (5 Modules / 18 Use Cases)

-- ==============================================================================
-- 1. MODULE 1: Asset & Vehicle Management (UC01, UC02, UC03)
-- ==============================================================================

-- Container Profile (UC01)
CREATE TABLE IF NOT EXISTS container (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_code VARCHAR(50) NOT NULL UNIQUE,
    container_type VARCHAR(30) NOT NULL, -- DRY_20FT, DRY_40FT, REEFER_20FT, REEFER_40FT, FLAT_RACK, OPEN_TOP
    tare_weight_tons NUMERIC(10, 2) NOT NULL,
    max_payload_tons NUMERIC(10, 2) NOT NULL,
    is_reefer BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, IN_TRANSIT, MAINTENANCE
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_container_status ON container(status);

-- Vehicle Maintenance & Readiness (UC02)
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(30) NOT NULL, -- PERIODIC, PREVENTIVE, CORRECTIVE, EMERGENCY
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    odometer_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    description TEXT,
    cost NUMERIC(12, 2),
    performed_by VARCHAR(100),
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON vehicle_maintenance(status);

-- Pre-trip Safety Checklist (UC03 - BRULE-01)
CREATE TABLE IF NOT EXISTS pre_trip_inspection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver(id),
    shipment_id UUID REFERENCES shipment(id),
    inspection_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PASSED', -- PASSED, FAILED
    checklist_json JSONB NOT NULL DEFAULT '{}',
    critical_failures_count INT NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspection_vehicle ON pre_trip_inspection(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspection_driver ON pre_trip_inspection(driver_id);

-- ==============================================================================
-- 2. MODULE 2: Shipment & Carbon-aware Routing (UC04, UC05, UC06)
-- ==============================================================================

-- Expand shipment with container & time windows (UC04)
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES container(id);
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS container_type_required VARCHAR(30);
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS pickup_time_window_start TIMESTAMPTZ;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS pickup_time_window_end TIMESTAMPTZ;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS delivery_time_window_start TIMESTAMPTZ;
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS delivery_time_window_end TIMESTAMPTZ;

-- Dispatch Order (UC06)
CREATE TABLE IF NOT EXISTS dispatch_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_code VARCHAR(50) NOT NULL UNIQUE,
    shipment_id UUID NOT NULL REFERENCES shipment(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    driver_id UUID NOT NULL REFERENCES driver(id),
    container_id UUID REFERENCES container(id),
    assigned_route_version_id UUID REFERENCES route_version(id),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_by VARCHAR(100) NOT NULL DEFAULT 'DISPATCHER',
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispatch_shipment ON dispatch_order(shipment_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON dispatch_order(status);

-- Expand route_candidate with multi-objective details (UC05)
ALTER TABLE route_candidate ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5, 4) DEFAULT 0.0500;
ALTER TABLE route_candidate ADD COLUMN IF NOT EXISTS metrics_breakdown_json JSONB DEFAULT '{}';

-- ==============================================================================
-- 3. MODULE 3: Real-time Tracking & Dynamic Routing (UC07, UC08, UC09, UC10)
-- ==============================================================================

-- Telemetry Quality Gate & Offline Buffering (UC07, SOP-10)
ALTER TABLE telemetry_event ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC(8, 2) DEFAULT 5.0;
ALTER TABLE telemetry_event ADD COLUMN IF NOT EXISTS battery_percentage NUMERIC(5, 2);
ALTER TABLE telemetry_event ADD COLUMN IF NOT EXISTS is_offline_buffered BOOLEAN DEFAULT FALSE;
ALTER TABLE telemetry_event ADD COLUMN IF NOT EXISTS quality_passed BOOLEAN DEFAULT TRUE;

-- Deviation Alert Persistence & Versioning (UC09 - BRULE-10)
ALTER TABLE deviation_alert ADD COLUMN IF NOT EXISTS persistence_count INT DEFAULT 1;
ALTER TABLE deviation_alert ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;
ALTER TABLE deviation_alert ADD COLUMN IF NOT EXISTS threshold_version VARCHAR(50) DEFAULT 'v1.0';
ALTER TABLE deviation_alert ADD COLUMN IF NOT EXISTS route_version_id UUID REFERENCES route_version(id);

-- ==============================================================================
-- 4. MODULE 4: Carbon Accounting & Reporting (UC11, UC12, UC13, UC14)
-- ==============================================================================

-- Proof of Delivery & Actual Distance Provenance (UC11 - BRULE-11)
CREATE TABLE IF NOT EXISTS proof_of_delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES shipment(id),
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20),
    delivery_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signature_url TEXT,
    photo_evidence_url TEXT,
    actual_distance_km NUMERIC(10, 3) NOT NULL,
    distance_source VARCHAR(30) NOT NULL DEFAULT 'GPS_ACTUAL', -- GPS_ACTUAL, ODOMETER, APPROVED_FALLBACK
    is_quality_approved BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pod_trip ON proof_of_delivery(trip_id);

-- GLEC v3 Accounting Enhancement (UC12 - BRULE-06, BRULE-11, BRULE-12, BRULE-13)
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS ttw_co2e_kg NUMERIC(12, 4);
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS wtt_co2e_kg NUMERIC(12, 4);
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS wtw_co2e_kg NUMERIC(12, 4);
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS data_quality_tier VARCHAR(30) DEFAULT 'TIER_1_PRIMARY'; -- TIER_1_PRIMARY, TIER_2_MODELED, TIER_3_DEFAULT
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS factor_version VARCHAR(50) DEFAULT 'GLEC_v3.0';
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS calculation_status VARCHAR(30) DEFAULT 'CALCULATED'; -- CALCULATED, BLOCKED, SUPERSEDED
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS is_daf_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE emission_calculation ADD COLUMN IF NOT EXISTS version_number INT DEFAULT 1;

-- Carbon Benchmark Comparative Evaluation (UC13 - BRULE-15)
CREATE TABLE IF NOT EXISTS carbon_benchmark_result (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trip(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipment(id),
    benchmark_corridor_id UUID REFERENCES carbon_benchmark(id),
    benchmark_type VARCHAR(50) NOT NULL DEFAULT 'EX_POST_MODELLED', -- EX_ANTE_SAME_SNAPSHOT, EX_POST_MODELLED, REFERENCE_ONLY
    baseline_route_type VARCHAR(50) NOT NULL DEFAULT 'SHORTEST_DISTANCE', -- SHORTEST_DISTANCE, FASTEST_TIME, BAU_CONVENTIONAL
    baseline_co2e_kg NUMERIC(12, 4) NOT NULL,
    ccadro_co2e_kg NUMERIC(12, 4) NOT NULL,
    carbon_reduction_percent NUMERIC(6, 2) NOT NULL,
    time_tradeoff_minutes NUMERIC(8, 2) DEFAULT 0,
    distance_tradeoff_km NUMERIC(10, 3) DEFAULT 0,
    estimation_error_percent NUMERIC(6, 2),
    comparability_status VARCHAR(30) NOT NULL DEFAULT 'COMPARABLE', -- COMPARABLE, REFERENCE_ONLY, INCONCLUSIVE
    confidence_score NUMERIC(5, 2) DEFAULT 0.95,
    limitations_notes TEXT,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benchmark_result_trip ON carbon_benchmark_result(trip_id);

-- Emission Report Export Audit (UC14)
CREATE TABLE IF NOT EXISTS carbon_report_export (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name VARCHAR(200) NOT NULL,
    export_format VARCHAR(20) NOT NULL DEFAULT 'CSV', -- CSV, EXCEL, JSON, PDF
    filter_params_json JSONB,
    total_shipments_count INT NOT NULL DEFAULT 0,
    total_co2e_kg NUMERIC(14, 4) NOT NULL DEFAULT 0,
    file_hash VARCHAR(128),
    exported_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    exported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 5. MODULE 5: Driver & Exception Management (UC15, UC16, UC17, UC18)
-- ==============================================================================

-- Driver Shift Responsibility (UC15)
CREATE TABLE IF NOT EXISTS driver_shift (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, ACTIVE, COMPLETED, CANCELLED
    handover_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shift_driver ON driver_shift(driver_id);
CREATE INDEX IF NOT EXISTS idx_shift_vehicle ON driver_shift(vehicle_id);

-- Field Incident & Evidence Capture (UC16)
CREATE TABLE IF NOT EXISTS field_incident (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_code VARCHAR(50) NOT NULL UNIQUE,
    trip_id UUID REFERENCES trip(id) ON DELETE SET NULL,
    driver_id UUID NOT NULL REFERENCES driver(id),
    incident_type VARCHAR(50) NOT NULL, -- CONGESTION, ACCIDENT, BREAKDOWN, ROAD_CLOSURE, SEVERE_WEATHER, DEVIATION_ESCALATION
    severity VARCHAR(20) NOT NULL DEFAULT 'MODERATE', -- MINOR, MODERATE, CRITICAL
    incident_location GEOMETRY(Point, 4326),
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, APPROVED, REJECTED, RESOLVED
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incident_trip ON field_incident(trip_id);
CREATE INDEX IF NOT EXISTS idx_incident_driver ON field_incident(driver_id);
CREATE INDEX IF NOT EXISTS idx_incident_status ON field_incident(status);

-- Exception Appraisal & Resolution (UC17)
CREATE TABLE IF NOT EXISTS exception_resolution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES field_incident(id) ON DELETE CASCADE,
    reviewed_by VARCHAR(100) NOT NULL,
    decision VARCHAR(50) NOT NULL, -- APPROVED_TRIGGER_REROUTE, APPROVED_EXCUSED, REJECTED, ESCALATE_TO_DEMERIT
    review_notes TEXT,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resolution_incident ON exception_resolution(incident_id);

-- Demerit Points & Blacklist Review (UC18 - BRULE-17, BRULE-18)
CREATE TABLE IF NOT EXISTS demerit_record (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES field_incident(id),
    points INT NOT NULL DEFAULT 0,
    violation_category VARCHAR(50) NOT NULL, -- ROUTE_DEVIATION_UNAUTHORIZED, SPEEDING, SAFETY_CHECK_BYPASS, DELAY_UNREPORTED
    status VARCHAR(30) NOT NULL DEFAULT 'RECORDED', -- RECORDED, REVIEW_REQUIRED, WARNING, SUSPENDED, BLACKLISTED, DISMISSED
    reviewed_by VARCHAR(100),
    audit_decision VARCHAR(50),
    decision_notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_demerit_driver ON demerit_record(driver_id);
CREATE INDEX IF NOT EXISTS idx_demerit_status ON demerit_record(status);

-- ==============================================================================
-- 6. SEED COMPREHENSIVE BASELINE DEMO DATA
-- ==============================================================================

-- Container C001 (40ft High Cube Container)
INSERT INTO container (
    id,
    container_code,
    container_type,
    tare_weight_tons,
    max_payload_tons,
    is_reefer,
    status
)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'CONT-40HC-001',
    'DRY_40FT',
    3.80,
    26.50,
    FALSE,
    'AVAILABLE'
) ON CONFLICT (container_code) DO NOTHING;

-- Link SH001 to C001
UPDATE shipment 
SET container_id = 'f0000000-0000-0000-0000-000000000001',
    container_type_required = 'DRY_40FT',
    pickup_time_window_start = CURRENT_TIMESTAMP,
    pickup_time_window_end = CURRENT_TIMESTAMP + INTERVAL '2 hours',
    delivery_time_window_start = CURRENT_TIMESTAMP + INTERVAL '6 hours',
    delivery_time_window_end = CURRENT_TIMESTAMP + INTERVAL '10 hours'
WHERE shipment_code = 'SH001';

-- Pre-trip Inspection for V001 & D001 (PASSED)
INSERT INTO pre_trip_inspection (
    id,
    vehicle_id,
    driver_id,
    shipment_id,
    status,
    checklist_json,
    critical_failures_count,
    remarks
)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'PASSED',
    '{"tires": "OK", "brakes": "OK", "lights": "OK", "fluids": "OK", "fire_extinguisher": "OK", "cargo_securing": "OK"}'::jsonb,
    0,
    'All safety checks verified before departure from Cat Lai port.'
) ON CONFLICT DO NOTHING;

-- Completed Maintenance Record for V001
INSERT INTO vehicle_maintenance (
    id,
    vehicle_id,
    maintenance_type,
    scheduled_date,
    completed_date,
    odometer_km,
    status,
    description,
    cost,
    performed_by
)
VALUES (
    'f0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'PERIODIC',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '14 days',
    45200.00,
    'COMPLETED',
    'Periodic 45,000 km checkup: engine oil changed, brake pads inspected, tire pressure calibrated.',
    3500000.00,
    'Thaco Auto Service Center'
) ON CONFLICT DO NOTHING;
