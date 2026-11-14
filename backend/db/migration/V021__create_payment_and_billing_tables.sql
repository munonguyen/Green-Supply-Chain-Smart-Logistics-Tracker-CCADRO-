-- =========================================================================
-- Migration: V021__create_payment_and_billing_tables.sql
-- Description: Tạo hệ thống thanh toán & hóa đơn B2B (Payment Service) tách riêng
--              tích hợp trực tiếp với Customer Portal (/customer) và GLEC v3 Green Credit
-- =========================================================================

-- 1. Bổ sung quyền thanh toán vào bảng permissions và gán cho CUSTOMER & ADMIN
INSERT INTO permissions (permission_key, description, module) VALUES
    ('PAYMENT_CREATE', 'Khởi tạo yêu cầu thanh toán & hóa đơn vận chuyển xanh', 'PAYMENT'),
    ('PAYMENT_READ_OWN', 'Xem lịch sử giao dịch, hóa đơn VAT & công nợ của doanh nghiệp mình', 'PAYMENT'),
    ('PAYMENT_MANAGE', 'Quản trị đối soát, xác nhận & hoàn tiền giao dịch toàn hệ thống', 'PAYMENT')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_name, permission_key) VALUES
    ('ADMIN', 'PAYMENT_CREATE'),
    ('ADMIN', 'PAYMENT_READ_OWN'),
    ('ADMIN', 'PAYMENT_MANAGE'),
    ('CUSTOMER', 'PAYMENT_CREATE'),
    ('CUSTOMER', 'PAYMENT_READ_OWN'),
    ('DISPATCHER', 'PAYMENT_READ_OWN'),
    ('ESG_AUDITOR', 'PAYMENT_READ_OWN')
ON CONFLICT DO NOTHING;

-- 2. Bảng giao dịch thanh toán & hóa đơn điện tử VAT B2B
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code        VARCHAR(48)  NOT NULL UNIQUE,
    invoice_number          VARCHAR(48)  NOT NULL UNIQUE,
    shipment_code           VARCHAR(64)  NOT NULL,
    customer_id             VARCHAR(100) NOT NULL,
    customer_name           VARCHAR(200),
    created_by_username     VARCHAR(100),
    origin_name             VARCHAR(200),
    destination_name        VARCHAR(200),
    container_code          VARCHAR(40),
    vehicle_type            VARCHAR(140),
    powertrain_type         VARCHAR(40)  DEFAULT 'EV',
    payment_method          VARCHAR(40)  NOT NULL,
    currency                VARCHAR(10)  NOT NULL DEFAULT 'VND',
    base_freight_vnd        BIGINT       NOT NULL CHECK (base_freight_vnd >= 0),
    green_esg_discount_vnd  BIGINT       NOT NULL DEFAULT 0,
    vat_amount_vnd          BIGINT       NOT NULL DEFAULT 0,
    total_amount_vnd        BIGINT       NOT NULL CHECK (total_amount_vnd >= 0),
    co2_saved_kg            DOUBLE PRECISION DEFAULT 0,
    payment_status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    gateway_provider        VARCHAR(80),
    gateway_reference       VARCHAR(120),
    qr_payload              TEXT,
    bank_code               VARCHAR(32),
    bank_account_no         VARCHAR(64),
    card_last4              VARCHAR(8),
    payer_name              VARCHAR(160),
    notes                   TEXT,
    paid_at                 TIMESTAMPTZ,
    due_at                  TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_customer ON payment_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_shipment ON payment_transactions (shipment_code);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status   ON payment_transactions (payment_status);

-- 3. Bảng nhật ký đối soát & vòng đời thanh toán
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code VARCHAR(48) NOT NULL,
    event_type       VARCHAR(48) NOT NULL,
    previous_status  VARCHAR(32),
    new_status       VARCHAR(32) NOT NULL,
    actor            VARCHAR(120) NOT NULL,
    detail           TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_tx_code ON payment_audit_logs (transaction_code);

-- 4. Seed dữ liệu hóa đơn & giao dịch mẫu cho Customer Portal (/customer)
INSERT INTO payment_transactions (
    transaction_code, invoice_number, shipment_code, customer_id, customer_name, created_by_username,
    origin_name, destination_name, container_code, vehicle_type, powertrain_type,
    payment_method, currency, base_freight_vnd, green_esg_discount_vnd, vat_amount_vnd, total_amount_vnd,
    co2_saved_kg, payment_status, gateway_provider, gateway_reference, bank_code, bank_account_no,
    payer_name, notes, paid_at, due_at, created_at
) VALUES
(
    'PAY-2026-819201', 'INV-CCADRO-2026-0001', 'SHP-2026-8192',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'Cảng Cát Lái, TP. Thủ Đức', 'ICD Sóng Thần, Dĩ An, Bình Dương', 'TCKU-781920-4', 'Xe đầu kéo điện (EV) • Heavy-Duty BEV', 'EV',
    'VIETQR_NAPAS', 'VND', 1850000, 92500, 140600, 1898100,
    12.8, 'PAID', 'NAPAS_VIETQR_247', 'FT263189401822', 'VCB', '1038889999',
    'Minh Phú & Vinamilk B2B', 'Thanh toán tự động VietQR Napas 24/7 kèm ưu đãi cước xanh 5% EV',
    NOW() - INTERVAL '2 hours', NOW() + INTERVAL '3 days', NOW() - INTERVAL '3 hours'
),
(
    'PAY-2026-492002', 'INV-CCADRO-2026-0002', 'SHP-2026-4920',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'Cảng Cát Lái, TP. Thủ Đức', 'Cảng Quốc Tế Cái Mép - Thị Vải', 'MSKU-492011-8', 'Xe đầu kéo điện (EV) • Heavy-Duty BEV', 'EV',
    'VNPAY_QR', 'VND', 4200000, 210000, 319200, 4309200,
    38.5, 'PENDING', 'VNPAY_GATEWAY', 'VNP-INTENT-492002', 'BIDV', '3141000888999',
    'Minh Phú & Vinamilk B2B', 'Hóa đơn chờ quét mã VNPay QR cho chuyến container linh kiện Cát Lái → Cái Mép',
    NULL, NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 hour'
),
(
    'PAY-2026-305503', 'INV-CCADRO-2026-0003', 'SHP-2026-3055',
    'DOANH_NGHIEP_B2B', 'Vinamilk Logistics Hub', 'customer',
    'KCN Tân Bình, TP.HCM', 'KCN VSIP 1, Thuận An, Bình Dương', 'OOLU-305519-2', 'Xe tải Hybrid LNG (Low-Carbon)', 'LNG',
    'GREEN_CREDIT_NET30', 'VND', 2350000, 70500, 182360, 2461860,
    16.4, 'NET30_CREDIT', 'CCADRO_GREEN_CREDIT', 'NET30-2026-3055', 'TCB', '190366889900',
    'Minh Phú & Vinamilk B2B', 'Hợp đồng công nợ Xanh Net-30 đối soát cuối kỳ (ưu đãi 3% LNG)',
    NULL, NOW() + INTERVAL '30 days', NOW() - INTERVAL '1 day'
)
ON CONFLICT (transaction_code) DO NOTHING;

INSERT INTO payment_audit_logs (transaction_code, event_type, previous_status, new_status, actor, detail) VALUES
('PAY-2026-819201', 'CREATED', NULL, 'PENDING', 'customer', 'Khởi tạo hóa đơn INV-CCADRO-2026-0001 cho vận đơn SHP-2026-8192'),
('PAY-2026-819201', 'CONFIRMED_PAID', 'PENDING', 'PAID', 'NAPAS_VIETQR_247', 'Xác nhận thanh toán thành công qua VietQR (FT263189401822)'),
('PAY-2026-492002', 'CREATED', NULL, 'PENDING', 'customer', 'Khởi tạo mã QR VNPay chờ thanh toán cho vận đơn SHP-2026-4920'),
('PAY-2026-305503', 'NET30_APPROVED', 'PENDING', 'NET30_CREDIT', 'CCADRO_GREEN_CREDIT', 'Cấp hạn mức công nợ Xanh Net-30 cho vận đơn SHP-2026-3055')
ON CONFLICT DO NOTHING;

