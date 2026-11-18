-- ==============================================================================
-- Migration: V025__create_dedicated_hub_shipper_iam_and_security_audit.sql
-- Description: Thiết kế kho dữ liệu IAM riêng biệt (dedicated schema `hub_iam`)
--              dành cho hệ thống Trụ sở & Shipper với đầy đủ Role theo chức năng,
--              ràng buộc cô lập Trụ sở (assigned_hub_code), mật khẩu BCrypt,
--              chống Brute-Force Lockout và Nhật ký kiểm toán bảo mật (Audit Log).
-- ==============================================================================

-- 1. Tạo dedicated PostgreSQL schema `hub_iam` tách biệt hoàn toàn khỏi schema nghiệp vụ
CREATE SCHEMA IF NOT EXISTS hub_iam;

-- 2. Mở rộng bảng `public.users` với thông tin phân vùng Trụ sở & Bảo mật Brute-force Lockout
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS assigned_hub_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS assigned_shipper_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_assigned_hub ON public.users(assigned_hub_code);
CREATE INDEX IF NOT EXISTS idx_users_assigned_shipper ON public.users(assigned_shipper_code);

-- 3. Bảng Định nghĩa Vai trò Chức năng Trụ sở & Shipper (hub_iam.hub_functional_roles)
CREATE TABLE IF NOT EXISTS hub_iam.hub_functional_roles (
    role_code VARCHAR(40) PRIMARY KEY,
    role_title VARCHAR(150) NOT NULL,
    portal_path VARCHAR(60) NOT NULL DEFAULT '/shipper',
    can_manage_hub_dispatch BOOLEAN NOT NULL DEFAULT FALSE,
    can_assign_code_range BOOLEAN NOT NULL DEFAULT FALSE,
    can_submit_photo_pod BOOLEAN NOT NULL DEFAULT FALSE,
    can_provision_hub_accounts BOOLEAN NOT NULL DEFAULT FALSE,
    is_read_only_audit BOOLEAN NOT NULL DEFAULT FALSE,
    hub_isolation_level VARCHAR(40) NOT NULL DEFAULT 'STRICT_SINGLE_HUB',
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hub_iam.hub_functional_roles (
    role_code, role_title, portal_path,
    can_manage_hub_dispatch, can_assign_code_range, can_submit_photo_pod,
    can_provision_hub_accounts, is_read_only_audit, hub_isolation_level, description
) VALUES
(
    'HUB_MANAGER',
    'Trưởng Trụ sở / Điều phối Nội khu',
    '/shipper',
    TRUE, TRUE, TRUE, TRUE, FALSE, 'STRICT_SINGLE_HUB',
    'Quản lý duy nhất 01 Trụ sở được phân công: nhận Manifest từ Container, chia đơn theo vị trí, giao nhiệm vụ theo dải mã số cho Shipper và cấp/khóa tài khoản Shipper thuộc Trụ sở đó.'
),
(
    'HUB_SHIPPER',
    'Nhân viên Giao hàng Chặng cuối (Shipper Trụ sở)',
    '/shipper',
    FALSE, FALSE, TRUE, FALSE, FALSE, 'STRICT_HUB_AND_SHIPPER',
    'Chỉ được đăng nhập vào đúng Trụ sở & mã Shipper của mình, xem Chính sách Shipper, Phạm vi giao hôm nay, danh sách hàng thuộc dải mã được giao, cập nhật trạng thái và nộp Ảnh POD.'
),
(
    'HUB_AUDITOR',
    'Kiểm tra viên Chất lượng POD & SLA Trụ sở',
    '/shipper',
    FALSE, FALSE, FALSE, FALSE, TRUE, 'STRICT_SINGLE_HUB',
    'Chế độ Chỉ đọc (Read-only): Kiểm tra ảnh xác thực POD, giám sát tuân thủ nhiệt độ/SLA và đối soát chính sách trong phạm vi Trụ sở được phân công.'
),
(
    'ADMIN',
    'Quản trị viên Bảo mật & Hệ thống Toàn cục',
    '/portal',
    TRUE, TRUE, TRUE, TRUE, FALSE, 'MULTI_HUB_SUPERVISOR',
    'Toàn quyền quản trị hệ thống, giám sát đa Trụ sở, kiểm tra Nhật ký bảo mật IAM và cấp phát tài khoản.'
)
ON CONFLICT (role_code) DO UPDATE SET
    role_title = EXCLUDED.role_title,
    can_manage_hub_dispatch = EXCLUDED.can_manage_hub_dispatch,
    can_assign_code_range = EXCLUDED.can_assign_code_range,
    can_submit_photo_pod = EXCLUDED.can_submit_photo_pod,
    can_provision_hub_accounts = EXCLUDED.can_provision_hub_accounts,
    is_read_only_audit = EXCLUDED.is_read_only_audit,
    hub_isolation_level = EXCLUDED.hub_isolation_level,
    description = EXCLUDED.description;

-- 4. Kho Tài khoản Phân quyền Chuyên biệt cho Hệ thống Trụ sở & Shipper (hub_iam.hub_accounts)
CREATE TABLE IF NOT EXISTS hub_iam.hub_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(40) NOT NULL UNIQUE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_algo VARCHAR(30) NOT NULL DEFAULT 'BCRYPT-10',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(40),
    functional_role VARCHAR(40) NOT NULL REFERENCES hub_iam.hub_functional_roles(role_code),
    assigned_hub_code VARCHAR(40),
    assigned_shipper_code VARCHAR(40),
    scope_summary VARCHAR(300) NOT NULL,
    can_ingest_manifest BOOLEAN NOT NULL DEFAULT FALSE,
    can_assign_code_range BOOLEAN NOT NULL DEFAULT FALSE,
    can_submit_photo_pod BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_accounts BOOLEAN NOT NULL DEFAULT FALSE,
    read_only_audit BOOLEAN NOT NULL DEFAULT FALSE,
    max_session_minutes INT NOT NULL DEFAULT 480,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(60),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(60) NOT NULL DEFAULT 'SYSTEM_SECURITY_SEED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_accounts_hub ON hub_iam.hub_accounts(assigned_hub_code);
CREATE INDEX IF NOT EXISTS idx_hub_accounts_role ON hub_iam.hub_accounts(functional_role);

-- 5. Nhật ký Kiểm toán Bảo mật Đăng nhập & Truy cập Chéo Trụ sở (hub_iam.hub_auth_audit_logs)
CREATE TABLE IF NOT EXISTS hub_iam.hub_auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(60) NOT NULL,
    functional_role VARCHAR(40),
    hub_code VARCHAR(40),
    event_type VARCHAR(50) NOT NULL,
    http_status INT NOT NULL DEFAULT 200,
    client_ip VARCHAR(60) DEFAULT '127.0.0.1',
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_auth_audit_time ON hub_iam.hub_auth_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_auth_audit_user ON hub_iam.hub_auth_audit_logs(username);

-- 6. Bổ sung Roles & Permissions chuẩn vào `public.roles`, `public.permissions`, `public.role_permissions`
INSERT INTO public.roles (name, description, is_system_fixed) VALUES
    ('HUB_MANAGER', 'Trưởng Trụ sở Giao nhận: Điều phối nội khu, nhận Manifest và giao nhiệm vụ theo Dải mã số trong phạm vi Trụ sở', TRUE),
    ('HUB_SHIPPER', 'Shipper Nội khu Trụ sở: Xem chính sách Shipper, phạm vi giao hôm nay, dải mã được giao & chụp ảnh xác thực POD', TRUE),
    ('HUB_AUDITOR', 'Kiểm tra viên Ảnh POD & SLA Trụ sở: Chỉ đọc đối soát chất lượng giao hàng & tuân thủ nhiệt độ tại Trụ sở', TRUE)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_system_fixed = TRUE;

INSERT INTO public.permissions (name, description) VALUES
    ('HUB_WORKSPACE_READ', 'Truy cập không gian làm việc nội bộ của Trụ sở được phân công'),
    ('CONTAINER_MANIFEST_INGEST', 'Nhận dữ liệu Manifest kiện hàng từ Container đường dài vào Trụ sở'),
    ('HUB_DISPATCH_AUTO', 'Chạy thuật toán chia đơn theo khoảng cách GPS trong Trụ sở'),
    ('HUB_TASK_RANGE_ASSIGN', 'Giao nhiệm vụ cho Shipper theo dải mã số (Từ mã -> Tới mã)'),
    ('SHIPPER_POLICY_READ', 'Xem chính sách vận hành và bảo mật dành riêng cho Shipper Trụ sở'),
    ('SHIPPER_OWN_SCOPE_READ', 'Xem phạm vi địa bàn giao hàng hôm nay của chính tài khoản Shipper'),
    ('SHIPPER_ITEM_STATUS_UPDATE', 'Cập nhật trạng thái xuất phát giao hàng chặng cuối'),
    ('POD_PHOTO_SUBMIT', 'Chụp và nộp ảnh xác thực giao hàng (Photo POD)'),
    ('POD_PHOTO_VIEW', 'Xem và đối soát ảnh bằng chứng giao hàng (Photo POD)'),
    ('HUB_AUDIT_READ', 'Kiểm toán tuân thủ SLA và nhật ký bảo mật Trụ sở (Chỉ đọc)'),
    ('HUB_ACCOUNT_MANAGE', 'Khởi tạo và khóa/mở khóa tài khoản Shipper nội bộ Trụ sở')
ON CONFLICT (name) DO NOTHING;

-- Gán quyền chuẩn cho ADMIN
INSERT INTO public.role_permissions (role_name, permission_name)
SELECT 'ADMIN', name FROM public.permissions
ON CONFLICT DO NOTHING;

-- Gán quyền chuẩn cho HUB_MANAGER (Không có quyền ADMIN toàn cục, khóa phạm vi Trụ sở)
INSERT INTO public.role_permissions (role_name, permission_name) VALUES
    ('HUB_MANAGER', 'HUB_WORKSPACE_READ'),
    ('HUB_MANAGER', 'SHIPMENT_READ_INBOUND'),
    ('HUB_MANAGER', 'CONTAINER_MANIFEST_INGEST'),
    ('HUB_MANAGER', 'HUB_DISPATCH_AUTO'),
    ('HUB_MANAGER', 'HUB_TASK_RANGE_ASSIGN'),
    ('HUB_MANAGER', 'SHIPPER_POLICY_READ'),
    ('HUB_MANAGER', 'POD_PHOTO_VIEW'),
    ('HUB_MANAGER', 'POD_SUBMIT'),
    ('HUB_MANAGER', 'EPOD_CONFIRM'),
    ('HUB_MANAGER', 'TRACKING_LIVE'),
    ('HUB_MANAGER', 'EXTERNAL_3PL_SYNC'),
    ('HUB_MANAGER', 'DRIVER_CHAT'),
    ('HUB_MANAGER', 'HUB_ACCOUNT_MANAGE')
ON CONFLICT DO NOTHING;

-- Gán quyền chuẩn cho HUB_SHIPPER (Tuyệt đối KHÔNG có HUB_TASK_RANGE_ASSIGN, CONTAINER_MANIFEST_INGEST hay HUB_ACCOUNT_MANAGE)
INSERT INTO public.role_permissions (role_name, permission_name) VALUES
    ('HUB_SHIPPER', 'HUB_WORKSPACE_READ'),
    ('HUB_SHIPPER', 'SHIPMENT_READ_INBOUND'),
    ('HUB_SHIPPER', 'SHIPPER_POLICY_READ'),
    ('HUB_SHIPPER', 'SHIPPER_OWN_SCOPE_READ'),
    ('HUB_SHIPPER', 'SHIPPER_ITEM_STATUS_UPDATE'),
    ('HUB_SHIPPER', 'POD_PHOTO_SUBMIT'),
    ('HUB_SHIPPER', 'POD_PHOTO_VIEW'),
    ('HUB_SHIPPER', 'POD_SUBMIT'),
    ('HUB_SHIPPER', 'TRACKING_LIVE')
ON CONFLICT DO NOTHING;

-- Gán quyền chuẩn cho HUB_AUDITOR (Read-only Audit)
INSERT INTO public.role_permissions (role_name, permission_name) VALUES
    ('HUB_AUDITOR', 'HUB_WORKSPACE_READ'),
    ('HUB_AUDITOR', 'SHIPMENT_READ_INBOUND'),
    ('HUB_AUDITOR', 'SHIPPER_POLICY_READ'),
    ('HUB_AUDITOR', 'POD_PHOTO_VIEW'),
    ('HUB_AUDITOR', 'HUB_AUDIT_READ'),
    ('HUB_AUDITOR', 'TRACKING_LIVE')
ON CONFLICT DO NOTHING;

-- Đồng bộ quyền cho role SHIPPER truyền thống thành chuẩn HUB_SHIPPER
DELETE FROM public.role_permissions WHERE role_name = 'SHIPPER';
INSERT INTO public.role_permissions (role_name, permission_name)
SELECT 'SHIPPER', permission_name FROM public.role_permissions WHERE role_name = 'HUB_SHIPPER'
ON CONFLICT DO NOTHING;

-- 7. Seed Tài khoản đầy đủ Role theo Chức năng vào `public.users` & `hub_iam.hub_accounts`
-- Password mặc định được băm BCrypt cost 10: ccadro@123
INSERT INTO public.users (
    id, username, password, email, first_name, last_name, status,
    assigned_hub_code, assigned_shipper_code
) VALUES
(
    '10000000-0000-0000-0000-000000000011', 'hub_mgr_dinhbang',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'mgr.dinhbang@ccadro.com', 'Bắc Ninh', 'Trưởng Trụ sở Đình Bảng', 'ACTIVE',
    'HUB-DINHBANG-BN', NULL
),
(
    '10000000-0000-0000-0000-000000000012', 'hub_mgr_amata',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'mgr.amata@ccadro.com', 'Biên Hòa', 'Trưởng Trụ sở Amata', 'ACTIVE',
    'HUB-AMATA-BH', NULL
),
(
    '10000000-0000-0000-0000-000000000013', 'shipper_bn2',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'shipper.bn2@ccadro.com', 'Đình Sơn', 'Trần', 'ACTIVE',
    'HUB-DINHBANG-BN', 'SHP-BN-002'
),
(
    '10000000-0000-0000-0000-000000000014', 'shipper_bn3',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'shipper.bn3@ccadro.com', 'Kinh Bắc', 'Lê Hoàng', 'ACTIVE',
    'HUB-DINHBANG-BN', 'SHP-BN-003'
),
(
    '10000000-0000-0000-0000-000000000015', 'shipper_amata',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'shipper.amata@ccadro.com', 'Quốc Bảo', 'Đặng', 'ACTIVE',
    'HUB-AMATA-BH', 'SHP-BH-101'
),
(
    '10000000-0000-0000-0000-000000000016', 'hub_inspector_bn',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'inspector.dinhbang@ccadro.com', 'Thanh Tra POD', 'Trụ sở Đình Bảng', 'ACTIVE',
    'HUB-DINHBANG-BN', NULL
)
ON CONFLICT (username) DO UPDATE SET
    assigned_hub_code = EXCLUDED.assigned_hub_code,
    assigned_shipper_code = EXCLUDED.assigned_shipper_code;

-- Gắn tài khoản `shipper` mặc định vào đúng Trụ sở Đình Bảng & SHP-BN-001
UPDATE public.users
SET assigned_hub_code = 'HUB-DINHBANG-BN',
    assigned_shipper_code = 'SHP-BN-001',
    first_name = 'Văn Bắc',
    last_name = 'Nguyễn (Shipper Đình Bảng)'
WHERE username = 'shipper';

INSERT INTO public.user_roles (user_id, role_name) VALUES
    ('10000000-0000-0000-0000-000000000011', 'HUB_MANAGER'),
    ('10000000-0000-0000-0000-000000000012', 'HUB_MANAGER'),
    ('10000000-0000-0000-0000-000000000013', 'HUB_SHIPPER'),
    ('10000000-0000-0000-0000-000000000014', 'HUB_SHIPPER'),
    ('10000000-0000-0000-0000-000000000015', 'HUB_SHIPPER'),
    ('10000000-0000-0000-0000-000000000016', 'HUB_AUDITOR'),
    ('10000000-0000-0000-0000-000000000006', 'HUB_SHIPPER')
ON CONFLICT DO NOTHING;

-- Đổ đầy đủ vào kho tài khoản riêng `hub_iam.hub_accounts`
INSERT INTO hub_iam.hub_accounts (
    account_code, user_id, username, password_hash, full_name, email, phone,
    functional_role, assigned_hub_code, assigned_shipper_code, scope_summary,
    can_ingest_manifest, can_assign_code_range, can_submit_photo_pod, can_manage_accounts, read_only_audit
) VALUES
(
    'ACC-ROOT-ADMIN', '10000000-0000-0000-0000-000000000001', 'admin',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Quản Trị Viên Bảo Mật Hệ Thống', 'admin@ccadro.com', '028 3888 9999',
    'ADMIN', NULL, NULL,
    'Toàn quyền quản trị hệ thống, cấu hình IAM & giám sát đa Trụ sở',
    TRUE, TRUE, TRUE, TRUE, FALSE
),
(
    'ACC-BN-MGR-01', '10000000-0000-0000-0000-000000000011', 'hub_mgr_dinhbang',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Trưởng Trụ sở Đình Bảng (Từ Sơn, Bắc Ninh)', 'mgr.dinhbang@ccadro.com', '0222 3741 100',
    'HUB_MANAGER', 'HUB-DINHBANG-BN', NULL,
    'Điều phối Trụ sở HUB-DINHBANG-BN: Nhận Manifest Container, Giao Dải mã số & Quản trị tài khoản Shipper nội khu',
    TRUE, TRUE, TRUE, TRUE, FALSE
),
(
    'ACC-AMATA-MGR-01', '10000000-0000-0000-0000-000000000012', 'hub_mgr_amata',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Trưởng Trụ sở KCN Amata (Biên Hòa, Đồng Nai)', 'mgr.amata@ccadro.com', '0251 3891 100',
    'HUB_MANAGER', 'HUB-AMATA-BH', NULL,
    'Điều phối Trụ sở HUB-AMATA-BH: Nhận Manifest Container, Chia đơn theo vị trí & Giao Dải mã số nội khu Amata',
    TRUE, TRUE, TRUE, TRUE, FALSE
),
(
    'ACC-BN-SHP-01', '10000000-0000-0000-0000-000000000006', 'shipper',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Nguyễn Văn Bắc (Shipper Tuyến 01 Đình Bảng)', 'shipper-3pl@ccadro.com', '0978 312 689',
    'HUB_SHIPPER', 'HUB-DINHBANG-BN', 'SHP-BN-001',
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới - KCN Tiên Sơn • Dải mã PKG-DB-0001..0003',
    FALSE, FALSE, TRUE, FALSE, FALSE
),
(
    'ACC-BN-SHP-02', '10000000-0000-0000-0000-000000000013', 'shipper_bn2',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Trần Đình Sơn (Shipper Tuyến 02 VSIP Bắc Ninh)', 'shipper.bn2@ccadro.com', '0982 604 115',
    'HUB_SHIPPER', 'HUB-DINHBANG-BN', 'SHP-BN-002',
    'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng • Dải mã PKG-DB-0004..0005',
    FALSE, FALSE, TRUE, FALSE, FALSE
),
(
    'ACC-BN-SHP-03', '10000000-0000-0000-0000-000000000014', 'shipper_bn3',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Lê Hoàng Kinh Bắc (Shipper Tuyến 03 Chợ Giầu)', 'shipper.bn3@ccadro.com', '0916 882 309',
    'HUB_SHIPPER', 'HUB-DINHBANG-BN', 'SHP-BN-003',
    'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn • Dải mã PKG-DB-0006',
    FALSE, FALSE, TRUE, FALSE, FALSE
),
(
    'ACC-AMATA-SHP-01', '10000000-0000-0000-0000-000000000015', 'shipper_amata',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Đặng Quốc Bảo (Shipper Bắc KCN Amata)', 'shipper.amata@ccadro.com', '0902 418 229',
    'HUB_SHIPPER', 'HUB-AMATA-BH', 'SHP-BH-101',
    'Phân khu Bắc KCN Amata & Kho Lạnh Long Bình • Dải mã WB-AMATA-8192-01',
    FALSE, FALSE, TRUE, FALSE, FALSE
),
(
    'ACC-BN-AUD-01', '10000000-0000-0000-0000-000000000016', 'hub_inspector_bn',
    '$2a$10$WATB9flu0sozXqZxBXXF3eCtctwC/hyc8MLCAJ4r7wH0ATxL.wJtK',
    'Kiểm tra viên Chất lượng & Ảnh POD Đình Bảng', 'inspector.dinhbang@ccadro.com', '0222 3741 888',
    'HUB_AUDITOR', 'HUB-DINHBANG-BN', NULL,
    'Chỉ đọc (Read-only): Thẩm định Ảnh POD, nhiệt độ chuỗi lạnh & Chính sách nội khu Đình Bảng',
    FALSE, FALSE, FALSE, FALSE, TRUE
)
ON CONFLICT (username) DO UPDATE SET
    functional_role = EXCLUDED.functional_role,
    assigned_hub_code = EXCLUDED.assigned_hub_code,
    assigned_shipper_code = EXCLUDED.assigned_shipper_code,
    scope_summary = EXCLUDED.scope_summary,
    can_ingest_manifest = EXCLUDED.can_ingest_manifest,
    can_assign_code_range = EXCLUDED.can_assign_code_range,
    can_submit_photo_pod = EXCLUDED.can_submit_photo_pod,
    can_manage_accounts = EXCLUDED.can_manage_accounts,
    read_only_audit = EXCLUDED.read_only_audit;

-- Seed Audit Log khởi tạo
INSERT INTO hub_iam.hub_auth_audit_logs (
    username, functional_role, hub_code, event_type, http_status, detail
) VALUES
(
    'hub_mgr_dinhbang', 'HUB_MANAGER', 'HUB-DINHBANG-BN', 'ACCOUNT_PROVISIONED', 201,
    'Khởi tạo tài khoản Trưởng Trụ sở Đình Bảng trong kho bảo mật hub_iam.hub_accounts'
),
(
    'shipper', 'HUB_SHIPPER', 'HUB-DINHBANG-BN', 'ACCOUNT_PROVISIONED', 201,
    'Khởi tạo tài khoản Shipper SHP-BN-001 (Nguyễn Văn Bắc) gắn cứng Trụ sở HUB-DINHBANG-BN'
);

