-- ==============================================================================
-- Migration: V018__finalize_core_rbac_roles_and_permissions.sql
-- Description: Chốt cứng 6 vai trò RBAC chuẩn CCADRO v4.0 (ADMIN, DISPATCHER,
--              SAFETY_MANAGER, DRIVER, ESG_AUDITOR, SHIPPER), đồng bộ toàn bộ
--              mã quyền Frontend/Backend và gắn cờ hệ thống cho 6 role cốt lõi.
-- ==============================================================================

-- 1. Thêm cờ đánh dấu vai trò cố định hệ thống (idempotent)
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS is_system_fixed BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE roles
SET is_system_fixed = TRUE
WHERE name IN ('ADMIN', 'DISPATCHER', 'SAFETY_MANAGER', 'DRIVER', 'ESG_AUDITOR', 'SHIPPER');

-- 2. Đồng bộ đầy đủ danh mục Permissions thống nhất giữa Backend & Frontend
INSERT INTO permissions (name, description) VALUES
    ('ROLE_MANAGE', 'Phân quyền vai trò và quản trị ma trận RBAC'),
    ('SHIPMENT_READ_OWN', 'Xem danh sách vận đơn của riêng doanh nghiệp chủ hàng'),
    ('SHIPMENT_WRITE', 'Cập nhật thông tin vận đơn và trạng thái điều phối'),
    ('SHIPMENT_DISPATCH', 'Phát lệnh điều xe xuất bến (UC06)'),
    ('ROUTE_SELECT', 'Chọn phương án lộ trình xanh Pareto (UC05)'),
    ('REROUTE_APPROVE', 'Phê duyệt hoặc từ chối tái định tuyến động (UC10)'),
    ('POD_SUBMIT', 'Ký xác nhận bàn giao hàng điện tử ePOD (UC11)'),
    ('POD_VIEW_OWN', 'Tải biên bản và chứng từ ePOD thuộc doanh nghiệp'),
    ('CARBON_READ', 'Tra cứu sổ cái phát thải CO2e theo chuyến'),
    ('BENCHMARK_READ', 'Xem định mức phát thải hành lang vận tải (UC13)'),
    ('REPORT_EXPORT', 'Xuất chứng nhận phát thải chuẩn ISO 14083 / SHA-256 (UC14)')
ON CONFLICT (name) DO NOTHING;

-- 3. Cập nhật ma trận Role - Permissions cho 6 vai trò cứng
-- 3.1 ADMIN: Toàn quyền hệ thống
INSERT INTO role_permissions (role_name, permission_name)
SELECT 'ADMIN', name FROM permissions
ON CONFLICT DO NOTHING;

-- 3.2 DISPATCHER: Điều phối, định tuyến, điều xe, giám sát GPS & duyệt đổi tuyến
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('DISPATCHER', 'SHIPMENT_WRITE'),
    ('DISPATCHER', 'SHIPMENT_DISPATCH'),
    ('DISPATCHER', 'ROUTE_SELECT'),
    ('DISPATCHER', 'REROUTE_APPROVE'),
    ('DISPATCHER', 'BENCHMARK_READ'),
    ('DISPATCHER', 'CARBON_CALCULATE')
ON CONFLICT DO NOTHING;

-- 3.3 SAFETY_MANAGER: Thanh tra an toàn, bảo dưỡng, xử lý sự cố & điểm phạt
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('SAFETY_MANAGER', 'VEHICLE_READ'),
    ('SAFETY_MANAGER', 'VEHICLE_WRITE'),
    ('SAFETY_MANAGER', 'MAINTENANCE_MANAGE'),
    ('SAFETY_MANAGER', 'INSPECTION_REVIEW'),
    ('SAFETY_MANAGER', 'EXCEPTION_RESOLVE'),
    ('SAFETY_MANAGER', 'DEMERIT_MANAGE'),
    ('SAFETY_MANAGER', 'ALERT_ACK'),
    ('SAFETY_MANAGER', 'TRACKING_LIVE')
ON CONFLICT DO NOTHING;

-- 3.4 DRIVER: Tài xế vận tải hành lang xanh (Terminal /driver)
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('DRIVER', 'INSPECTION_SUBMIT'),
    ('DRIVER', 'TELEMETRY_SEND'),
    ('DRIVER', 'INCIDENT_REPORT'),
    ('DRIVER', 'POD_SUBMIT'),
    ('DRIVER', 'VEHICLE_READ')
ON CONFLICT DO NOTHING;

-- 3.5 ESG_AUDITOR: Kiểm toán phát thải độc lập GLEC v3 (Read-only & Export)
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('ESG_AUDITOR', 'CARBON_READ'),
    ('ESG_AUDITOR', 'BENCHMARK_READ'),
    ('ESG_AUDITOR', 'REPORT_EXPORT'),
    ('ESG_AUDITOR', 'SHIPMENT_READ')
ON CONFLICT DO NOTHING;

-- 3.6 SHIPPER: Khách hàng / Chủ hàng B2B (Portal /customer)
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('SHIPPER', 'SHIPMENT_CREATE'),
    ('SHIPPER', 'SHIPMENT_READ_OWN'),
    ('SHIPPER', 'POD_VIEW_OWN'),
    ('SHIPPER', 'CARBON_READ')
ON CONFLICT DO NOTHING;

-- 4. Đảm bảo 6 tài khoản hạt nhân cố định và ánh xạ user_roles luôn tồn tại
INSERT INTO users (id, username, password, email, first_name, last_name, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'admin@ccadro.com', 'System', 'Admin', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000002', 'dispatcher', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'dispatcher@ccadro.com', 'Van Nam', 'Nguyen', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000003', 'driver', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'driver@ccadro.com', 'Van Tai', 'Tran', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000004', 'auditor', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'auditor@ccadro.com', 'Thi Kiem Toan', 'Le', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000005', 'safety', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'safety@ccadro.com', 'Van An Toan', 'Pham', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000006', 'shipper', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'shipper@ccadro.com', 'Vinamilk', 'Logistics Hub', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

INSERT INTO user_roles (user_id, role_name) VALUES
    ('10000000-0000-0000-0000-000000000001', 'ADMIN'),
    ('10000000-0000-0000-0000-000000000002', 'DISPATCHER'),
    ('10000000-0000-0000-0000-000000000003', 'DRIVER'),
    ('10000000-0000-0000-0000-000000000004', 'ESG_AUDITOR'),
    ('10000000-0000-0000-0000-000000000005', 'SAFETY_MANAGER'),
    ('10000000-0000-0000-0000-000000000006', 'SHIPPER')
ON CONFLICT DO NOTHING;

