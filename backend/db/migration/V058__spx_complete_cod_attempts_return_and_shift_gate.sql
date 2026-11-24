-- ==============================================================================
-- Migration: V058__spx_complete_cod_attempts_return_and_shift_gate.sql
-- Description: Hoàn thiện nghiệp vụ chuẩn SPX Express (Shopee Express) trong PostgreSQL:
--   1. Quản lý Thu hộ COD (Tiền mặt vs QR động), Số lần phát (tối đa 3 lần), Log gọi khách (3 cuộc),
--      Kiểm tra ngoại quan nhận tải, On-Hold (Giữ hàng) vs Return-to-Hub (Hoàn hàng & Quét trả kho).
--   2. Quản lý Ví tiền mặt COD cầm tay của Shipper, Điểm danh đầu ca & Khóa Kết ca 3 điều kiện.
--   3. Bảng biên lai nộp tiền COD về Thủ quỹ Bưu cục / Chuyển khoản định danh (hub_shipper_cod_remittance).
-- ==============================================================================

ALTER TABLE container_cargo_manifest_item
    ADD COLUMN IF NOT EXISTS cod_amount_vnd BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cod_status VARCHAR(32) NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS delivery_attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_delivery_attempts INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS call_attempts_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS package_condition VARCHAR(40) NOT NULL DEFAULT 'INTACT',
    ADD COLUMN IF NOT EXISTS recipient_otp_code VARCHAR(12),
    ADD COLUMN IF NOT EXISTS pod_signature_note VARCHAR(160),
    ADD COLUMN IF NOT EXISTS exception_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS exception_evidence_url TEXT,
    ADD COLUMN IF NOT EXISTS returned_to_hub_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hub_return_received_by VARCHAR(100);

ALTER TABLE hub_local_shipper
    ADD COLUMN IF NOT EXISTS shift_checked_in_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP - INTERVAL '95 minutes'),
    ADD COLUMN IF NOT EXISTS shift_ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cod_holding_vnd BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cod_collected_qr_today_vnd BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cod_remitted_today_vnd BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hub_shipper_cod_remittance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_code VARCHAR(50) NOT NULL UNIQUE,
    hub_code VARCHAR(40) NOT NULL,
    shipper_code VARCHAR(40) NOT NULL,
    shipper_name VARCHAR(150) NOT NULL,
    remitted_amount_vnd BIGINT NOT NULL,
    payment_channel VARCHAR(40) NOT NULL DEFAULT 'HUB_CASHIER',
    cashier_confirmed_by VARCHAR(100),
    item_codes_csv TEXT,
    note VARCHAR(300),
    remitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_cod_remittance_shipper
    ON hub_shipper_cod_remittance (shipper_code, remitted_at DESC);

-- Seed chuẩn thực tế SPX cho tuyến SHP-BN-001 (Trụ sở Đình Bảng):
-- Chặng #1 (PKG-DB-0001): Đã giao POD và thu tiền mặt COD 2.450.000đ (Shipper đang cầm trên người chờ nộp cuối ca)
UPDATE container_cargo_manifest_item
SET
    cod_amount_vnd = 2450000,
    cod_status = 'COLLECTED_CASH',
    delivery_attempt_count = 1,
    max_delivery_attempts = 3,
    call_attempts_count = 1,
    last_called_at = COALESCE(delivered_at, CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
    package_condition = 'INTACT',
    recipient_otp_code = '4182',
    pod_signature_note = 'Đã ký điện tử & xác thực mã nhận hàng'
WHERE item_code = 'PKG-DB-0001';

-- Chặng #2 (PKG-DB-0002): Đang trên xe đi giao (Lần phát 1/3), có COD 1.680.000đ cần thu (Tiền mặt hoặc QR động SPX)
UPDATE container_cargo_manifest_item
SET
    cod_amount_vnd = 1680000,
    cod_status = 'PENDING',
    delivery_attempt_count = 1,
    max_delivery_attempts = 3,
    call_attempts_count = 1,
    last_called_at = CURRENT_TIMESTAMP - INTERVAL '12 minutes',
    package_condition = 'INTACT',
    recipient_otp_code = '6824'
WHERE item_code = 'PKG-DB-0002';

-- Chặng #3 (PKG-DB-0003): Đang chờ quét nhận tải tại bưu cục (Lần phát 0/3), đơn đã thanh toán trước (COD = 0đ)
UPDATE container_cargo_manifest_item
SET
    cod_amount_vnd = 0,
    cod_status = 'NONE',
    delivery_attempt_count = 0,
    max_delivery_attempts = 3,
    call_attempts_count = 0,
    package_condition = 'INTACT',
    recipient_otp_code = '9035'
WHERE item_code = 'PKG-DB-0003';

UPDATE hub_local_shipper
SET
    shift_checked_in_at = CURRENT_TIMESTAMP - INTERVAL '95 minutes',
    shift_ended_at = NULL,
    cod_holding_vnd = 2450000,
    cod_collected_qr_today_vnd = 0,
    cod_remitted_today_vnd = 0
WHERE shipper_code = 'SHP-BN-001';

