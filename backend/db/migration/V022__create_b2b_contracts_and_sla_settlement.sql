-- =========================================================================
-- Migration: V022__create_b2b_contracts_and_sla_settlement.sql
-- Description: Tạo hệ thống Hợp đồng B2B (Master MSA & Hợp đồng chuyến),
--              sự kiện giám sát SLA & đối soát ePOD liên kết Payment Service
-- =========================================================================

-- 1. Phân quyền Hợp đồng điện tử cho CUSTOMER & ADMIN
INSERT INTO permissions (permission_key, description, module) VALUES
    ('CONTRACT_READ_OWN', 'Xem hợp đồng khung MSA, hợp đồng chuyến & biên bản SLA của doanh nghiệp mình', 'CONTRACT'),
    ('CONTRACT_CREATE', 'Khởi tạo hợp đồng thuê vận tải xanh B2B', 'CONTRACT'),
    ('CONTRACT_SIGN', 'Ký số xác nhận hợp đồng điện tử & nghiệm thu đối soát ePOD', 'CONTRACT'),
    ('CONTRACT_MANAGE', 'Quản trị toàn bộ hợp đồng B2B, hạn mức Net-30 & điều khoản SLA', 'CONTRACT')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_name, permission_key) VALUES
    ('ADMIN', 'CONTRACT_READ_OWN'),
    ('ADMIN', 'CONTRACT_CREATE'),
    ('ADMIN', 'CONTRACT_SIGN'),
    ('ADMIN', 'CONTRACT_MANAGE'),
    ('CUSTOMER', 'CONTRACT_READ_OWN'),
    ('CUSTOMER', 'CONTRACT_CREATE'),
    ('CUSTOMER', 'CONTRACT_SIGN'),
    ('DISPATCHER', 'CONTRACT_READ_OWN'),
    ('ESG_AUDITOR', 'CONTRACT_READ_OWN')
ON CONFLICT DO NOTHING;

-- 2. Bảng Hợp đồng B2B (Hợp đồng khung MSA & Hợp đồng chuyến điện tử)
CREATE TABLE IF NOT EXISTS b2b_contracts (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number             VARCHAR(48)  NOT NULL UNIQUE,
    contract_type               VARCHAR(32)  NOT NULL DEFAULT 'SPOT_TRIP',
    parent_contract_number      VARCHAR(48),
    shipment_code               VARCHAR(64),
    customer_id                 VARCHAR(100) NOT NULL,
    customer_name               VARCHAR(200) NOT NULL,
    signed_by_customer_user     VARCHAR(120),
    customer_signature_hash     VARCHAR(128),
    provider_name               VARCHAR(200) NOT NULL DEFAULT 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridor_scope              VARCHAR(220),
    container_code              VARCHAR(40),
    e_seal_number               VARCHAR(60),
    vehicle_type                VARCHAR(140),
    license_plate               VARCHAR(40),
    sla_on_time_rate_pct        DOUBLE PRECISION NOT NULL DEFAULT 98.5,
    sla_max_temp_deviation_c    DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    sla_penalty_pct_per_breach  DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    min_co2_reduction_kg        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    credit_limit_vnd            BIGINT NOT NULL DEFAULT 500000000,
    used_credit_vnd             BIGINT NOT NULL DEFAULT 0,
    contract_value_vnd          BIGINT NOT NULL DEFAULT 0,
    sla_penalty_deduction_vnd   BIGINT NOT NULL DEFAULT 0,
    final_settlement_vnd        BIGINT NOT NULL DEFAULT 0,
    payment_terms               VARCHAR(32) NOT NULL DEFAULT 'NET30',
    contract_status             VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    effective_from              TIMESTAMPTZ,
    effective_to                TIMESTAMPTZ,
    signed_at                   TIMESTAMPTZ,
    settled_at                  TIMESTAMPTZ,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_contracts_customer ON b2b_contracts (customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_contracts_shipment ON b2b_contracts (shipment_code);
CREATE INDEX IF NOT EXISTS idx_b2b_contracts_status   ON b2b_contracts (contract_status);

-- 3. Bảng sự kiện SLA & đối soát ePOD gắn với Hợp đồng
CREATE TABLE IF NOT EXISTS contract_sla_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number     VARCHAR(48) NOT NULL,
    shipment_code       VARCHAR(64),
    event_type          VARCHAR(48) NOT NULL,
    severity            VARCHAR(20) NOT NULL DEFAULT 'INFO',
    penalty_amount_vnd  BIGINT NOT NULL DEFAULT 0,
    recorded_by         VARCHAR(120) NOT NULL,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_sla_events_num ON contract_sla_events (contract_number);

-- 4. Seed Hợp đồng khung MSA & Hợp đồng chuyến cho DOANH_NGHIEP_B2B
INSERT INTO b2b_contracts (
    contract_number, contract_type, parent_contract_number, shipment_code,
    customer_id, customer_name, signed_by_customer_user, customer_signature_hash,
    corridor_scope, container_code, e_seal_number, vehicle_type, license_plate,
    sla_on_time_rate_pct, sla_max_temp_deviation_c, sla_penalty_pct_per_breach, min_co2_reduction_kg,
    credit_limit_vnd, used_credit_vnd, contract_value_vnd, sla_penalty_deduction_vnd, final_settlement_vnd,
    payment_terms, contract_status, effective_from, effective_to, signed_at, notes
) VALUES
(
    'HDK-CCADRO-2026-0001', 'MASTER_MSA', NULL, NULL,
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    'Toàn tuyến Miền Nam (Cát Lái • Cái Mép • VSIP • Sóng Thần • Tân Bình)', NULL, NULL,
    'Đội xe EV 40T & Hybrid LNG chuẩn GLEC v3', NULL,
    98.5, 2.0, 5.0, 500.0,
    500000000, 2461860, 500000000, 0, 0,
    'NET30', 'SIGNED_ACTIVE', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', NOW() - INTERVAL '30 days',
    'Hợp đồng nguyên tắc vận tải xanh B2B: Ưu đãi 5% EV, 3% LNG, hạn mức tín dụng Net-30 500 triệu VNĐ'
),
(
    'HD-SHP-2026-8192', 'SPOT_TRIP', 'HDK-CCADRO-2026-0001', 'SHP-2026-8192',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'SHA256:4a7d1ed414474e4033ac29ccb8653d9b4a7d1ed414474e4033ac29ccb8653d9b',
    'Cảng Cát Lái, TP. Thủ Đức → ICD Sóng Thần, Dĩ An, Bình Dương (18.6 km)',
    'TCKU-781920-4', 'VN-CUST-819204', 'Xe đầu kéo điện (EV) • Heavy-Duty BEV', '51C-888.99',
    98.5, 2.0, 5.0, 12.8,
    500000000, 0, 1850000, 0, 1850000,
    'PREPAID', 'SIGNED_ACTIVE', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '7 days', NOW() - INTERVAL '3 hours',
    'Hợp đồng chuyến lạnh -18°C chuẩn ISO 17712 • Đã quyết toán VietQR'
),
(
    'HD-SHP-2026-4920', 'SPOT_TRIP', 'HDK-CCADRO-2026-0001', 'SHP-2026-4920',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'SHA256:7c222fb2927d828af22f592134e8932480637c0d7c222fb2927d828af22f5921',
    'Cảng Cát Lái, TP. Thủ Đức → Cảng Quốc Tế Cái Mép - Thị Vải (67.4 km)',
    'MSKU-492011-8', 'VN-CUST-492011', 'Xe đầu kéo điện (EV) • Heavy-Duty BEV', '51C-772.18',
    98.5, 2.0, 5.0, 38.5,
    500000000, 0, 4200000, 0, 4200000,
    'PREPAID', 'SIGNED_ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 hour',
    'Hợp đồng chuyến linh kiện điện tử • Đang chờ quét VNPay QR'
),
(
    'HD-SHP-2026-3055', 'SPOT_TRIP', 'HDK-CCADRO-2026-0001', 'SHP-2026-3055',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'SHA256:356a192b7913b04c54574d18c28d46e6395428ab356a192b7913b04c54574d18',
    'KCN Tân Bình, TP.HCM → KCN VSIP 1, Thuận An, Bình Dương (24.2 km)',
    'OOLU-305519-2', 'VN-CUST-305519', 'Xe tải Hybrid LNG (Low-Carbon)', '51D-603.44',
    98.5, 2.0, 5.0, 16.4,
    500000000, 2461860, 2350000, 0, 2350000,
    'NET30', 'SIGNED_ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', NOW() - INTERVAL '1 day',
    'Hợp đồng chuyến công nợ Xanh Net-30 theo MSA HDK-CCADRO-2026-0001'
)
ON CONFLICT (contract_number) DO NOTHING;

INSERT INTO contract_sla_events (contract_number, shipment_code, event_type, severity, penalty_amount_vnd, recorded_by, description) VALUES
('HDK-CCADRO-2026-0001', NULL, 'SIGNED', 'INFO', 0, 'customer', 'Ký số điện tử Hợp đồng khung MSA hạn mức Net-30 500.000.000 VNĐ'),
('HD-SHP-2026-8192', 'SHP-2026-8192', 'SIGNED', 'INFO', 0, 'customer', 'Ký hợp đồng chuyến điện tử HĐ-SHP-2026-8192 (Cont TCKU-781920-4)'),
('HD-SHP-2026-4920', 'SHP-2026-4920', 'SIGNED', 'INFO', 0, 'customer', 'Ký hợp đồng chuyến điện tử HĐ-SHP-2026-4920 (Cont MSKU-492011-8)'),
('HD-SHP-2026-3055', 'SHP-2026-3055', 'SIGNED', 'INFO', 0, 'customer', 'Ký hợp đồng chuyến công nợ Net-30 HĐ-SHP-2026-3055')
ON CONFLICT DO NOTHING;

