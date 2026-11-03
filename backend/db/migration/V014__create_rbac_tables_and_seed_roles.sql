-- ==============================================================================
-- Migration: V014__create_rbac_tables_and_seed_roles.sql
-- Description: Khởi tạo kiến trúc RBAC phân quyền chuyên sâu: permissions, roles,
--              role_permissions, users, user_roles, invalidated_tokens
--              Seed 6 Roles chuẩn CCADRO v4.0 và các tài khoản mẫu ban đầu.
-- ==============================================================================

-- 1. Bảng Permissions: Danh mục quyền nguyên tử
CREATE TABLE IF NOT EXISTS permissions (
    name VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255)
);

-- 2. Bảng Roles: Danh mục vai trò nghiệp vụ
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255)
);

-- 3. Bảng Role - Permissions Mapping (N-N)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_name VARCHAR(50) NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
    permission_name VARCHAR(50) NOT NULL REFERENCES permissions(name) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_name)
);

-- 4. Bảng Users: Tài khoản đăng nhập hệ thống
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. Bảng User - Roles Mapping (N-N)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_name)
);

-- 6. Bảng Invalidated Tokens: Blacklist JWT đã đăng xuất (Logout)
CREATE TABLE IF NOT EXISTS invalidated_tokens (
    id VARCHAR(255) PRIMARY KEY, -- JTI ID của token
    expiry_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invalidated_tokens_expiry ON invalidated_tokens(expiry_time);

-- ==============================================================================
-- SEED DỮ LIỆU: PERMISSIONS
-- ==============================================================================
INSERT INTO permissions (name, description) VALUES
    ('USER_MANAGE', 'Quản trị danh sách người dùng và phân quyền tài khoản'),
    ('SYSTEM_CONFIG', 'Cấu hình tham số hệ thống toàn cục và trọng số tối ưu'),
    ('VEHICLE_READ', 'Xem thông tin danh sách đội xe và hồ sơ phương tiện'),
    ('VEHICLE_WRITE', 'Thêm mới hoặc hiệu chỉnh thông tin phương tiện'),
    ('MAINTENANCE_MANAGE', 'Lên lịch bảo dưỡng khẩn cấp/định kỳ và nghiệm thu kỹ thuật'),
    ('INSPECTION_SUBMIT', 'Gửi biên bản kiểm tra an toàn 6 điểm tiền xuất bến'),
    ('INSPECTION_REVIEW', 'Thẩm định và tra cứu biên bản kiểm tra kỹ thuật phương tiện'),
    ('SHIPMENT_CREATE', 'Khởi tạo đơn hàng vận chuyển mới'),
    ('SHIPMENT_READ', 'Tra cứu chi tiết và trạng thái vận đơn'),
    ('DISPATCH_ORDER', 'Lập lệnh điều vận, chọn xe và tài xế đủ điều kiện'),
    ('ROUTE_PLAN', 'Khởi tạo bài toán tính toán lộ trình xanh đa tiêu chí Pareto'),
    ('ROUTE_APPROVE', 'Phê duyệt phương án tuyến và lưu phiên bản RouteVersion bất biến'),
    ('REROUTE_DECIDE', 'Phê duyệt hoặc từ chối đề xuất đổi tuyến động Human-in-the-Loop'),
    ('TELEMETRY_SEND', 'Truyền luồng dữ liệu GPS Telemetry thời gian thực'),
    ('TRACKING_LIVE', 'Giám sát hành trình xe di chuyển trên bản đồ số'),
    ('ALERT_ACK', 'Tiếp nhận và xử lý cảnh báo lệch tuyến Vàng / Đỏ'),
    ('INCIDENT_REPORT', 'Báo cáo sự cố hiện trường từ xe chở hàng'),
    ('EXCEPTION_RESOLVE', 'Thẩm định và phân giải các ngoại lệ hiện trường'),
    ('DEMERIT_MANAGE', 'Quản trị điểm phạt tài xế và xem xét hồ sơ kỷ luật'),
    ('CARBON_CALCULATE', 'Tính toán phát thải thực tế sau chuyến chuẩn GLEC v3'),
    ('BENCHMARK_ANALYZE', 'Đối chuẩn hiệu quả giảm phát thải hành lang logistics'),
    ('ESG_EXPORT', 'Xuất báo cáo kiểm toán carbon chính thức có chữ ký số SHA-256'),
    ('FUEL_CATALOG_EDIT', 'Quản lý bảng giá nhiên liệu và hệ số phát thải cơ sở'),
    ('EPOD_CONFIRM', 'Ký nhận và xác thực giao hàng điện tử ePOD')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- SEED DỮ LIỆU: 6 ROLES DOANH NGHIỆP
-- ==============================================================================
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Quản trị viên toàn hệ thống: Toàn quyền cấu hình, tài khoản và danh mục'),
    ('DISPATCHER', 'Điều phối viên vận tải: Lập tuyến carbon, điều xe, giám sát GPS và duyệt đổi tuyến'),
    ('DRIVER', 'Tài xế vận tải: Kiểm tra an toàn trước chuyến, phát GPS, báo sự cố và ký ePOD'),
    ('ESG_AUDITOR', 'Chuyên viên kiểm toán ESG: Kế toán GLEC v3, đối chuẩn hành lang và xuất báo cáo SHA-256'),
    ('SAFETY_MANAGER', 'Quản lý an toàn kỹ thuật: Quản lý bảo dưỡng xe, thẩm định sự cố và điểm phạt'),
    ('SHIPPER', 'Chủ hàng / Khách hàng: Tạo đơn hàng, theo dõi hành trình và chứng chỉ carbon')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- SEED DỮ LIỆU: ROLE_PERMISSIONS MAPPING
-- ==============================================================================
-- 1. ADMIN: Toàn bộ permissions
INSERT INTO role_permissions (role_name, permission_name)
SELECT 'ADMIN', name FROM permissions
ON CONFLICT DO NOTHING;

-- 2. DISPATCHER:
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('DISPATCHER', 'VEHICLE_READ'),
    ('DISPATCHER', 'INSPECTION_REVIEW'),
    ('DISPATCHER', 'SHIPMENT_CREATE'),
    ('DISPATCHER', 'SHIPMENT_READ'),
    ('DISPATCHER', 'DISPATCH_ORDER'),
    ('DISPATCHER', 'ROUTE_PLAN'),
    ('DISPATCHER', 'ROUTE_APPROVE'),
    ('DISPATCHER', 'REROUTE_DECIDE'),
    ('DISPATCHER', 'TRACKING_LIVE'),
    ('DISPATCHER', 'ALERT_ACK'),
    ('DISPATCHER', 'EXCEPTION_RESOLVE'),
    ('DISPATCHER', 'BENCHMARK_ANALYZE')
ON CONFLICT DO NOTHING;

-- 3. DRIVER:
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('DRIVER', 'INSPECTION_SUBMIT'),
    ('DRIVER', 'SHIPMENT_READ'),
    ('DRIVER', 'TELEMETRY_SEND'),
    ('DRIVER', 'TRACKING_LIVE'),
    ('DRIVER', 'INCIDENT_REPORT'),
    ('DRIVER', 'EPOD_CONFIRM')
ON CONFLICT DO NOTHING;

-- 4. ESG_AUDITOR:
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('ESG_AUDITOR', 'VEHICLE_READ'),
    ('ESG_AUDITOR', 'SHIPMENT_READ'),
    ('ESG_AUDITOR', 'CARBON_CALCULATE'),
    ('ESG_AUDITOR', 'BENCHMARK_ANALYZE'),
    ('ESG_AUDITOR', 'ESG_EXPORT'),
    ('ESG_AUDITOR', 'FUEL_CATALOG_EDIT')
ON CONFLICT DO NOTHING;

-- 5. SAFETY_MANAGER:
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('SAFETY_MANAGER', 'VEHICLE_READ'),
    ('SAFETY_MANAGER', 'VEHICLE_WRITE'),
    ('SAFETY_MANAGER', 'MAINTENANCE_MANAGE'),
    ('SAFETY_MANAGER', 'INSPECTION_REVIEW'),
    ('SAFETY_MANAGER', 'TRACKING_LIVE'),
    ('SAFETY_MANAGER', 'ALERT_ACK'),
    ('SAFETY_MANAGER', 'EXCEPTION_RESOLVE'),
    ('SAFETY_MANAGER', 'DEMERIT_MANAGE')
ON CONFLICT DO NOTHING;

-- 6. SHIPPER:
INSERT INTO role_permissions (role_name, permission_name) VALUES
    ('SHIPPER', 'SHIPMENT_CREATE'),
    ('SHIPPER', 'SHIPMENT_READ'),
    ('SHIPPER', 'TRACKING_LIVE'),
    ('SHIPPER', 'BENCHMARK_ANALYZE'),
    ('SHIPPER', 'ESG_EXPORT')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- SEED DỮ LIỆU: TÀI KHOẢN MẪU BAN ĐẦU (Password mặc định: ccadro@123)
-- BCrypt Hash: $2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK
-- ==============================================================================
INSERT INTO users (id, username, password, email, first_name, last_name, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'admin@ccadro.com', 'System', 'Admin', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000002', 'dispatcher', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'dispatcher@ccadro.com', 'Van Nam', 'Nguyen', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000003', 'driver', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'driver@ccadro.com', 'Van Test', 'Tran', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000004', 'auditor', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'auditor@ccadro.com', 'Thi Kiem Toan', 'Le', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000005', 'safety', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'safety@ccadro.com', 'Van An Toan', 'Pham', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000006', 'shipper', '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK', 'shipper@ccadro.com', 'Vinamilk', 'Logistics Hub', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

-- Gán Role tương ứng cho từng tài khoản mẫu
INSERT INTO user_roles (user_id, role_name) VALUES
    ('10000000-0000-0000-0000-000000000001', 'ADMIN'),
    ('10000000-0000-0000-0000-000000000002', 'DISPATCHER'),
    ('10000000-0000-0000-0000-000000000003', 'DRIVER'),
    ('10000000-0000-0000-0000-000000000004', 'ESG_AUDITOR'),
    ('10000000-0000-0000-0000-000000000005', 'SAFETY_MANAGER'),
    ('10000000-0000-0000-0000-000000000006', 'SHIPPER')
ON CONFLICT DO NOTHING;

