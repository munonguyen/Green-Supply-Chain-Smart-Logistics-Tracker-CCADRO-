-- ==============================================================================
-- Migration: V057__shipper_realtime_field_ops_and_settlement.sql
-- Description: Lưu trữ đầy đủ dữ liệu tác nghiệp thời gian thực của Shipper trực tiếp
--              trong PostgreSQL (Check-in GPS tới điểm, Hình thức bàn giao, Nhiệt độ chuỗi lạnh,
--              Biên bản sự cố NDR, Telemetry GPS trực tiếp & Bảng đối soát thu nhập cuối ca).
-- ==============================================================================

ALTER TABLE container_cargo_manifest_item
    ADD COLUMN IF NOT EXISTS arrived_at_stop BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS handover_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS measured_temp_c DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ndr_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ndr_reason VARCHAR(300),
    ADD COLUMN IF NOT EXISTS last_ndr_at TIMESTAMPTZ;

UPDATE container_cargo_manifest_item
SET
    arrived_at_stop = TRUE,
    arrived_at = COALESCE(delivered_at, CURRENT_TIMESTAMP - INTERVAL '40 minutes'),
    handover_method = CASE WHEN requires_cold_chain THEN 'COLD_DOCK_GATE' ELSE 'DIRECT_CONSIGNEE' END,
    measured_temp_c = CASE WHEN requires_cold_chain THEN required_temp_c ELSE NULL END
WHERE dispatch_status = 'DELIVERED_POD'
  AND arrived_at IS NULL;

ALTER TABLE hub_local_shipper
    ADD COLUMN IF NOT EXISTS last_telemetry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS hub_shipper_shift_settlement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_code VARCHAR(50) NOT NULL UNIQUE,
    hub_code VARCHAR(40) NOT NULL,
    shipper_code VARCHAR(40) NOT NULL,
    shipper_name VARCHAR(150) NOT NULL,
    shift_date VARCHAR(20) NOT NULL,
    delivered_pod_count INTEGER NOT NULL DEFAULT 0,
    total_stops_count INTEGER NOT NULL DEFAULT 0,
    base_fee_vnd BIGINT NOT NULL DEFAULT 0,
    weight_surcharge_vnd BIGINT NOT NULL DEFAULT 0,
    cold_chain_bonus_vnd BIGINT NOT NULL DEFAULT 0,
    sla_gem_bonus_vnd BIGINT NOT NULL DEFAULT 0,
    total_earned_vnd BIGINT NOT NULL DEFAULT 0,
    settlement_status VARCHAR(30) NOT NULL DEFAULT 'SETTLED',
    settled_by VARCHAR(80),
    note VARCHAR(400),
    settled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_shipper_settlement_hub_date
    ON hub_shipper_shift_settlement (hub_code, shift_date DESC);

CREATE INDEX IF NOT EXISTS idx_hub_shipper_settlement_shipper_date
    ON hub_shipper_shift_settlement (shipper_code, shift_date DESC);

