-- ==============================================================================
-- V015: Expand Emergency Notification for Hybrid Dual-Channel Operations
-- Supports both Automated Alerts & Safety Manager / Dispatcher Manual Broadcast
-- ==============================================================================

ALTER TABLE emergency_notification
    ADD COLUMN IF NOT EXISTS broadcast_type VARCHAR(30) NOT NULL DEFAULT 'AUTOMATED',
    ADD COLUMN IF NOT EXISTS sender_role VARCHAR(30) DEFAULT 'SYSTEM',
    ADD COLUMN IF NOT EXISTS sender_username VARCHAR(100) DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'DISPATCHER',
    ADD COLUMN IF NOT EXISTS target_corridor VARCHAR(100),
    ADD COLUMN IF NOT EXISTS radius_meters DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS action_directive TEXT;

CREATE INDEX IF NOT EXISTS idx_emerg_notif_broadcast_type ON emergency_notification(broadcast_type);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_target_audience ON emergency_notification(target_audience);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_sender_role ON emergency_notification(sender_role);

-- Seed an example Manual Emergency Broadcast by Safety Manager
INSERT INTO emergency_notification (
    id,
    notification_code,
    event_type,
    severity,
    source_service,
    target_role,
    target_audience,
    broadcast_type,
    sender_role,
    sender_username,
    target_corridor,
    radius_meters,
    action_directive,
    title,
    message,
    latitude,
    longitude,
    metadata_json,
    status
)
VALUES (
    'f0000000-0000-0000-0000-000000000020',
    'BROADCAST-SM-001',
    'WEATHER_DISASTER_ALERT',
    'CRITICAL',
    'notification-service',
    'DRIVER',
    'ALL_DRIVERS',
    'MANUAL_BROADCAST',
    'SAFETY_MANAGER',
    'safety',
    'Hành lang Cát Lái - VSIP 1 (Bình Dương)',
    5000,
    'Giảm tốc độ dưới 30km/h, bật đèn khẩn cấp hoặc tấp vào trạm dịch vụ gần nhất tránh bão.',
    '[CHỈ ĐẠO AN TOÀN] Bão lớn gây đổ cây và ngập diện rộng tuyến QL13 & Vành Đai 2',
    'Ban An toàn Đội xe phát lệnh khẩn cấp: Yêu cầu tất cả tài xế đang lưu thông hướng về Bình Dương chủ động giảm tốc và tránh xa vùng ngập nước.',
    10.8450,
    106.7720,
    '{"weatherCondition": "SEVERE_STORM", "affectedRoads": ["QL13", "Vanh Dai 2"], "urgency": "IMMEDIATE"}'::jsonb,
    'UNREAD'
) ON CONFLICT (notification_code) DO NOTHING;

