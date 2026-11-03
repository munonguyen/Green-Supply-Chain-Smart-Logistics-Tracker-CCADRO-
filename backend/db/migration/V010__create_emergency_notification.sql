-- ==============================================================================
-- V010: Emergency Notification Microservice Schema (Bookteria Pattern - Port 8087)
-- Supports Kafka Event Consumption, Deduplication, Real-time SSE & Dispatcher ACK
-- ==============================================================================

CREATE TABLE IF NOT EXISTS emergency_notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_code VARCHAR(60) NOT NULL UNIQUE,
    event_type VARCHAR(50) NOT NULL, -- INCIDENT_CRITICAL, DEVIATION_RED, REROUTE_PROPOSED, PRE_TRIP_FAILED, DEMERIT_REVIEW_REQUIRED
    severity VARCHAR(20) NOT NULL DEFAULT 'CRITICAL', -- CRITICAL, HIGH, WARNING, INFO
    source_service VARCHAR(50) NOT NULL DEFAULT 'incident-service', -- incident-service, tracking-service, asset-service, carbon-service
    target_role VARCHAR(30) NOT NULL DEFAULT 'DISPATCHER', -- DISPATCHER, SAFETY_MANAGER, DRIVER, ESG_AUDITOR
    recipient_id UUID,
    trip_id UUID,
    reference_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'UNREAD', -- UNREAD, READ, ACKNOWLEDGED
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    action_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emerg_notif_status ON emergency_notification(status);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_severity ON emergency_notification(severity);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_trip ON emergency_notification(trip_id);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_role ON emergency_notification(target_role);
CREATE INDEX IF NOT EXISTS idx_emerg_notif_created ON emergency_notification(created_at DESC);

-- Seed baseline emergency notifications for immediate Dispatcher Map verification
INSERT INTO emergency_notification (
    id,
    notification_code,
    event_type,
    severity,
    source_service,
    target_role,
    trip_id,
    reference_id,
    title,
    message,
    latitude,
    longitude,
    metadata_json,
    status
)
VALUES (
    'f0000000-0000-0000-0000-000000000010',
    'NOTIF-RED-DEV-001',
    'DEVIATION_RED',
    'CRITICAL',
    'tracking-service',
    'DISPATCHER',
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    '[BÁO ĐỘNG ĐỎ UC09] Xe V001 lệch hành lang 300m (> 200m)',
    'Phát hiện 3 điểm GPS hợp lệ liên tiếp vượt ngưỡng 200m trên tuyến Võ Chí Công -> VSIP 1. Đã kích hoạt đề xuất đổi tuyến động (UC10).',
    10.8525,
    106.7430,
    '{"vehicleCode": "V001", "licensePlate": "51C-888.99", "deviationMeters": 300, "consecutivePoints": 3}'::jsonb,
    'UNREAD'
),
(
    'f0000000-0000-0000-0000-000000000011',
    'NOTIF-INC-CRIT-002',
    'INCIDENT_CRITICAL',
    'HIGH',
    'incident-service',
    'DISPATCHER',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '[SỰ CỐ KHẨN CẤP UC16] Phong tỏa làn container Vành Đai 2',
    'Tài xế Nguyễn Văn An báo cáo tai nạn liên hoàn gây ùn tắc nghiêm trọng tại cầu Phú Hữu. Chờ Điều phối viên phê duyệt phương án đổi lộ trình.',
    10.8200,
    106.7600,
    '{"incidentType": "ACCIDENT", "driverName": "Nguyen Van An", "brule": "BRULE-17"}'::jsonb,
    'UNREAD'
) ON CONFLICT (notification_code) DO NOTHING;

