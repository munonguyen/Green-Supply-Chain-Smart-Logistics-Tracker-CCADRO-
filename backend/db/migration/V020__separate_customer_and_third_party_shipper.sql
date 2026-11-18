-- ==============================================================================
-- Migration: V020__separate_customer_and_third_party_shipper.sql
-- Description: Tách biệt hoàn toàn vai trò CUSTOMER (Chủ hàng B2B đặt dịch vụ
--              tại /customer) và SHIPPER (Đối tác kho/giao nhận điểm đích tại /shipper
--              kết nối qua hệ thống thứ 3 / WMS / 3PL). Tạo bảng third_party_shipper_handover.
-- ==============================================================================

-- 1. Thêm role cứng CUSTOMER và cập nhật mô tả role SHIPPER
INSERT INTO roles (name, description, is_system_fixed) VALUES
    ('CUSTOMER', 'Khách hàng / Chủ hàng Doanh nghiệp B2B: Đặt xe xanh, giám sát container IoT, chat tài xế và tải chứng chỉ Carbon', TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system_fixed = TRUE;

UPDATE roles
SET description = 'Đối tác Giao nhận / Kho Điểm Đích (Bên thứ 3 - /shipper): Tiếp nhận container đến bãi, xác nhận ePOD & đồng bộ hệ thống 3PL/WMS',
    is_system_fixed = TRUE
WHERE name = 'SHIPPER';

-- 2. Thêm các quyền chuyên biệt cho đối tác Shipper điểm đích / Hệ thống thứ 3
INSERT INTO permissions (name, description) VALUES
    ('SHIPMENT_READ_INBOUND', 'Xem danh sách container & chuyến hàng sắp giao tới kho/bãi điểm đích'),
    ('EXTERNAL_3PL_SYNC', 'Đồng bộ trạng thái bàn giao, Dock-In và Webhook qua hệ thống 3PL/WMS thứ 3')
ON CONFLICT (name) DO NOTHING;

-- 3. Gán quyền chuẩn cho ADMIN và tách ma trận quyền CUSTOMER vs SHIPPER
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('ADMIN', 'SHIPMENT_READ_INBOUND'),
    ('ADMIN', 'EXTERNAL_3PL_SYNC'),
    ('CUSTOMER', 'SHIPMENT_CREATE'),
    ('CUSTOMER', 'SHIPMENT_READ_OWN'),
    ('CUSTOMER', 'POD_VIEW_OWN'),
    ('CUSTOMER', 'CARBON_READ'),
    ('CUSTOMER', 'DRIVER_CHAT')
ON CONFLICT DO NOTHING;

-- Gỡ quyền đặt hàng B2B khỏi SHIPPER (chỉ CUSTOMER mới có quyền đặt xe & xem đơn đặt B2B)
DELETE FROM role_permissions
WHERE role_name = 'SHIPPER'
  AND permission_name IN ('SHIPMENT_CREATE', 'SHIPMENT_READ_OWN', 'CARBON_READ');

INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('SHIPPER', 'SHIPMENT_READ_INBOUND'),
    ('SHIPPER', 'POD_SUBMIT'),
    ('SHIPPER', 'EPOD_CONFIRM'),
    ('SHIPPER', 'EXTERNAL_3PL_SYNC'),
    ('SHIPPER', 'TRACKING_LIVE'),
    ('SHIPPER', 'DRIVER_CHAT')
ON CONFLICT DO NOTHING;

-- 4. Tạo tài khoản hạt nhân riêng cho CUSTOMER (tách khỏi SHIPPER 3PL)
INSERT INTO users (id, username, password, email, first_name, last_name, status) VALUES
    ('10000000-0000-0000-0000-000000000007', 'customer', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'customer@ccadro.com', 'Minh Phu', 'Seafood B2B', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_name) VALUES
    ('10000000-0000-0000-0000-000000000007', 'CUSTOMER')
ON CONFLICT DO NOTHING;

UPDATE users
SET email = 'shipper-3pl@ccadro.com',
    first_name = 'Gemadept',
    last_name = 'Destination 3PL Hub'
WHERE username = 'shipper';

-- 5. Bảng lưu nghiệp vụ giao nhận tại điểm đích & đồng bộ hệ thống thứ 3 (3PL / WMS)
CREATE TABLE IF NOT EXISTS third_party_shipper_handover (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_code VARCHAR(40) NOT NULL UNIQUE,
    shipment_code VARCHAR(50),
    destination_hub VARCHAR(200) NOT NULL,
    shipper_company VARCHAR(200) NOT NULL,
    external_system_name VARCHAR(120) NOT NULL,
    external_tracking_ref VARCHAR(100) NOT NULL,
    webhook_endpoint VARCHAR(255) NOT NULL,
    dock_gate VARCHAR(80),
    handover_status VARCHAR(40) NOT NULL DEFAULT 'AWAITING_ARRIVAL',
    epod_signed_by VARCHAR(150),
    epod_signature_hash VARCHAR(120),
    last_sync_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    last_sync_payload TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_3pl_handover_status ON third_party_shipper_handover(handover_status);

INSERT INTO third_party_shipper_handover (
    id, container_code, shipment_code, destination_hub, shipper_company,
    external_system_name, external_tracking_ref, webhook_endpoint,
    dock_gate, handover_status, epod_signed_by, epod_signature_hash,
    last_sync_status, last_synced_at
) VALUES
(
    '44444444-4444-4444-8444-444444440001', 'TCKU-781920-4', 'SHP-2026-8192',
    'KCN Amata Biên Hòa • Kho Lạnh Trung Tâm', 'Kerry Cold Chain 3PL',
    'Kerry SmartWMS v4', '3PL-AMATA-8192', 'https://api.kerry-wms.example.vn/v2/webhooks/ccadro/handover',
    'Cổng B • Dock Lạnh D-04', 'AWAITING_ARRIVAL', NULL, NULL,
    'SUBSCRIBED', NOW() - INTERVAL '12 minutes'
),
(
    '44444444-4444-4444-8444-444444440002', 'MSKU-492018-7', 'SHP-2026-4920',
    'Khu Công Nghệ Cao Quận 9 (SHTP)', 'Samsung SDS Logistics WMS',
    'SAP EWM 9.5 SHTP', 'SHTP-INB-4920', 'https://ewm-gateway.sds-vn.example.com/api/inbound/container',
    'Gate 2 • Ramp ESD-02', 'AWAITING_ARRIVAL', NULL, NULL,
    'SUBSCRIBED', NOW() - INTERVAL '8 minutes'
),
(
    '44444444-4444-4444-8444-444444440003', 'CMAU-821903-2', 'SHP-2026-8219',
    'KCN VSIP 1 Thuận An, Bình Dương', 'Gemadept Distribution 3PL',
    'Gemadept SmartPort API', 'GMD-VSIP-8219', 'https://connect.gemadept.example.vn/webhook/container-arrived',
    'Bay 07 • Inbound FMCG', 'AT_GATE_DOCKED', NULL, NULL,
    'SYNCED_3PL', NOW() - INTERVAL '3 minutes'
),
(
    '44444444-4444-4444-8444-444444440004', 'CCLU-619284-5', 'SHP-2026-6192',
    'KCN Nhơn Trạch 2, Đồng Nai', 'ViettelPost Cold Chain Hub',
    'VTP Fulfillment Core', 'VTP-NT2-6192', 'https://partner-gw.viettelpost.example.vn/ccadro/epod-sync',
    'Dock Lạnh C-01', 'SYNCED_3PL', 'Nguyễn Minh Tuấn (Thủ kho 3PL Nhơn Trạch)', 'SHA256:9f84b1c208aa34d1',
    'SYNCED_3PL', NOW() - INTERVAL '45 minutes'
),
(
    '44444444-4444-4444-8444-444444440005', 'TGHU-330198-1', 'SHP-2026-3301',
    'KCN VSIP 2 & TP. Mới Bình Dương', 'Nippon Express 3PL VSIP2',
    'NE Global Cargo ERP', 'NE-VSIP2-3301', 'https://edi.nipponexpress-vn.example.com/v1/inbound/confirm',
    'Gate A • Dock 11', 'SYNCED_3PL', 'Trần Thị Thu Thảo (Điều phối kho)', 'SHA256:4e71a92c00fb7710',
    'SYNCED_3PL', NOW() - INTERVAL '1 hour'
)
ON CONFLICT (container_code) DO NOTHING;

