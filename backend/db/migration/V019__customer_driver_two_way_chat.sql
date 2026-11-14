-- ==============================================================================
-- Migration: V019__customer_driver_two_way_chat.sql
-- Description: Nâng cấp hệ thống nhắn tin 2 chiều Customer <-> Driver kiểu Grab/Xanh SM
--              gắn theo ngữ cảnh Container/Chuyến hàng, trạng thái đã đọc (Seen tick)
--              và đồng bộ quyền DRIVER_CHAT cho các role liên quan.
-- ==============================================================================

-- 1. Mở rộng bảng driver_dispatch_message hỗ trợ hội thoại 2 chiều
ALTER TABLE driver_dispatch_message
    ADD COLUMN IF NOT EXISTS sender_role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN IF NOT EXISTS sender_username VARCHAR(80),
    ADD COLUMN IF NOT EXISTS container_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS shipment_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_driver_dispatch_msg_driver_created
    ON driver_dispatch_message(driver_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_driver_dispatch_msg_container
    ON driver_dispatch_message(container_code);

-- 2. Bổ sung quyền DRIVER_CHAT vào ma trận RBAC
INSERT INTO permissions (name, description) VALUES
    ('DRIVER_CHAT', 'Nhắn tin trực tiếp 2 chiều giữa Khách hàng B2B và Tài xế Cabin OS')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('ADMIN', 'DRIVER_CHAT'),
    ('DISPATCHER', 'DRIVER_CHAT'),
    ('DRIVER', 'DRIVER_CHAT'),
    ('SHIPPER', 'DRIVER_CHAT')
ON CONFLICT DO NOTHING;

-- 3. Seed dữ liệu hội thoại mẫu Customer <-> Driver kiểu Grab / Xanh SM
INSERT INTO driver_dispatch_message (
    id, driver_id, sender_name, sender_role, sender_username,
    container_code, shipment_code, message_text, message_type, channel, delivery_status, is_read, created_at
) VALUES
(
    '33333333-3333-4333-8333-333333330001',
    '11111111-1111-4111-8111-111111110001',
    'Vinamilk Logistics Hub', 'CUSTOMER', 'shipper',
    'TCKU-781920-4', 'SHP-2026-8192',
    'Anh Hùng ơi, container TCKU-781920-4 ra khỏi cổng Cát Lái chưa ạ? Nhớ giữ nhiệt độ lạnh -18.5°C giúp bên em nhé.',
    'TEXT', 'GRAB_CHAT', 'READ', TRUE, NOW() - INTERVAL '25 minutes'
),
(
    '33333333-3333-4333-8333-333333330002',
    '11111111-1111-4111-8111-111111110001',
    'Nguyễn Văn Hùng', 'DRIVER', 'driver',
    'TCKU-781920-4', 'SHP-2026-8192',
    'Dạ em vừa qua trạm thu phí Cao tốc Long Thành – Dầu Giây, máy lạnh vẫn ổn định -18.4°C và e-Seal nguyên vẹn ạ.',
    'TEXT', 'GRAB_CHAT', 'READ', TRUE, NOW() - INTERVAL '21 minutes'
),
(
    '33333333-3333-4333-8333-333333330003',
    '11111111-1111-4111-8111-111111110001',
    'Nguyễn Văn Hùng', 'DRIVER', 'driver',
    'TCKU-781920-4', 'SHP-2026-8192',
    'Dự kiến 32 phút nữa em tới KCN Amata Biên Hòa, khi tới cổng kho em gọi số bảo vệ ạ.',
    'TEXT', 'GRAB_CHAT', 'DELIVERED_CABIN_OS', FALSE, NOW() - INTERVAL '14 minutes'
),
(
    '33333333-3333-4333-8333-333333330004',
    '11111111-1111-4111-8111-111111110002',
    'Vinamilk Logistics Hub', 'CUSTOMER', 'shipper',
    'MSKU-492018-7', 'SHP-2026-4920',
    'Anh Khôi chạy chậm qua đoạn vòng xoay Mỹ Thủy giúp em để hạn chế rung lắc linh kiện điện tử nhé.',
    'TEXT', 'GRAB_CHAT', 'READ', TRUE, NOW() - INTERVAL '18 minutes'
),
(
    '33333333-3333-4333-8333-333333330005',
    '11111111-1111-4111-8111-111111110002',
    'Lê Minh Khôi', 'DRIVER', 'driver',
    'MSKU-492018-7', 'SHP-2026-4920',
    'Ok em, xe đầu kéo EV chạy rất êm, gia tốc kế đang chỉ 0.12G. Em cứ theo dõi trực tiếp trên bản đồ nhé!',
    'TEXT', 'GRAB_CHAT', 'DELIVERED_CABIN_OS', FALSE, NOW() - INTERVAL '10 minutes'
),
(
    '33333333-3333-4333-8333-333333330006',
    '11111111-1111-4111-8111-111111110003',
    'Trần Hoàng Nam', 'DRIVER', 'driver',
    'CMAU-821903-2', 'SHP-2026-8219',
    'Chào anh/chị chủ hàng, xe em đang đi tới ngã tư Bình Phước, dự kiến 18 phút nữa vào bãi VSIP 1 ạ.',
    'TEXT', 'GRAB_CHAT', 'DELIVERED_CABIN_OS', FALSE, NOW() - INTERVAL '6 minutes'
)
ON CONFLICT (id) DO NOTHING;

