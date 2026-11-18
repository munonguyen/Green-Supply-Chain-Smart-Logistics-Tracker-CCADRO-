-- ==============================================================================
-- Migration: V031__create_branches_and_staff_directory.sql
-- Description: Khởi tạo danh mục Chi nhánh vận hành (branches) & Hồ sơ Nhân viên
--              theo từng Vai trò (staff_profiles) phục vụ quản trị CRUD doanh nghiệp.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_code VARCHAR(40) NOT NULL UNIQUE,
    branch_name VARCHAR(180) NOT NULL,
    region VARCHAR(60) NOT NULL DEFAULT 'MIEN_NAM',
    branch_type VARCHAR(50) NOT NULL DEFAULT 'REGIONAL_HUB',
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(100),
    manager_username VARCHAR(50),
    manager_name VARCHAR(120),
    vehicle_capacity INTEGER NOT NULL DEFAULT 30,
    monthly_revenue_target_vnd BIGINT NOT NULL DEFAULT 500000000,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_branches_region ON branches(region);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_is_deleted ON branches(is_deleted);

CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(40) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(50),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    role_code VARCHAR(40) NOT NULL,
    department VARCHAR(120) NOT NULL,
    job_title VARCHAR(120) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    branch_code VARCHAR(40),
    contract_type VARCHAR(40) NOT NULL DEFAULT 'FULL_TIME',
    shift_name VARCHAR(40) DEFAULT 'CA_HANH_CHINH',
    base_salary_vnd BIGINT NOT NULL DEFAULT 15000000,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_role_code ON staff_profiles(role_code);
CREATE INDEX IF NOT EXISTS idx_staff_branch_id ON staff_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_is_deleted ON staff_profiles(is_deleted);

INSERT INTO branches (id, branch_code, branch_name, region, branch_type, city, address, phone, email, manager_username, manager_name, vehicle_capacity, monthly_revenue_target_vnd, status)
VALUES
    ('a1000000-0000-4000-8000-000000000001', 'BR-HCM-HQ', 'Trụ Sở Chính Cát Lái • TP.HCM', 'MIEN_NAM', 'HEADQUARTERS', 'TP. Hồ Chí Minh', 'Đường Nguyễn Thị Định, Cảng Cát Lái, TP. Thủ Đức', '028-3897-8888', 'catlai.hq@ccadro.vn', 'admin', 'Nguyễn Hoàng Quản Trị', 85, 2400000000, 'ACTIVE'),
    ('a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'Chi Nhánh Bắc Ninh • Hub Đình Bảng', 'MIEN_BAC', 'REGIONAL_HUB', 'Bắc Ninh', 'KCN Đình Bảng, TP. Từ Sơn, Bắc Ninh', '0222-3832-668', 'dinhbang.bn@ccadro.vn', 'hub_mgr_dinhbang', 'Nguyễn Minh Đạt', 48, 1250000000, 'ACTIVE'),
    ('a1000000-0000-4000-8000-000000000003', 'BR-BD-VSIP', 'Chi Nhánh Bình Dương • VSIP 1', 'DONG_NAM_BO', 'DISTRIBUTION_CENTER', 'Bình Dương', 'Số 8 Hữu Nghị, KCN VSIP 1, Thuận An, Bình Dương', '0274-3768-999', 'vsip1.bd@ccadro.vn', 'dispatcher', 'Phạm Thảo Vy', 52, 1450000000, 'ACTIVE'),
    ('a1000000-0000-4000-8000-000000000004', 'BR-DN-AMATA', 'Chi Nhánh Đồng Nai • KCN Amata', 'DONG_NAM_BO', 'REGIONAL_HUB', 'Đồng Nai', 'Đại lộ Amata, P. Long Bình, TP. Biên Hòa, Đồng Nai', '0251-3936-555', 'amata.dn@ccadro.vn', 'safety', 'Trần Quốc Bảo', 40, 980000000, 'ACTIVE'),
    ('a1000000-0000-4000-8000-000000000005', 'BR-HN-LB', 'Chi Nhánh Hà Nội • Hub Long Biên', 'MIEN_BAC', 'CUSTOMS_PORT', 'Hà Nội', 'KCN Sài Đồng B, Q. Long Biên, Hà Nội', '024-3875-2266', 'longbien.hn@ccadro.vn', 'esg_auditor', 'Lê Thu Hà', 32, 860000000, 'ACTIVE')
ON CONFLICT (branch_code) DO NOTHING;

INSERT INTO staff_profiles (employee_code, full_name, username, email, phone, role_code, department, job_title, branch_id, branch_code, contract_type, shift_name, base_salary_vnd, status, notes)
VALUES
    ('NV-ADM-001', 'Nguyễn Hoàng Quản Trị', 'admin', 'admin@ccadro.vn', '0901-888-999', 'ADMIN', 'Ban Quản Trị Hệ Thống', 'Root System Administrator', 'a1000000-0000-4000-8000-000000000001', 'BR-HCM-HQ', 'FULL_TIME', 'CA_HANH_CHINH', 38000000, 'ACTIVE', 'Quản trị toàn bộ RBAC, IAM & Doanh thu hệ thống'),
    ('NV-DSP-002', 'Phạm Thảo Vy', 'dispatcher', 'dispatcher@ccadro.vn', '0908-112-334', 'DISPATCHER', 'Trung Tâm Điều Phối NOC 24/7', 'Trưởng ca Điều phối Pareto UC05', 'a1000000-0000-4000-8000-000000000003', 'BR-BD-VSIP', 'FULL_TIME', 'CA_24_7', 24000000, 'ACTIVE', 'Chuyên trách xuất bến và tối ưu lộ trình xanh'),
    ('NV-SAF-003', 'Trần Quốc Bảo', 'safety', 'safety@ccadro.vn', '0912-445-667', 'SAFETY_MANAGER', 'An Toàn Đội Xe & HSE (UC16)', 'Trưởng phòng An toàn Kỹ thuật', 'a1000000-0000-4000-8000-000000000004', 'BR-DN-AMATA', 'FULL_TIME', 'CA_HANH_CHINH', 26500000, 'ACTIVE', 'Thẩm định pre-trip, tốc độ & điểm phạt Demerit'),
    ('NV-ESG-004', 'Lê Thu Hà', 'esg_auditor', 'esg.auditor@ccadro.vn', '0933-778-899', 'ESG_AUDITOR', 'Kiểm Toán Carbon GLEC v3', 'Chuyên viên Kiểm toán Net-Zero ISO 14083', 'a1000000-0000-4000-8000-000000000005', 'BR-HN-LB', 'FULL_TIME', 'CA_HANH_CHINH', 25000000, 'ACTIVE', 'Ký số báo cáo ESG & đối chuẩn hành lang UC13'),
    ('NV-DRV-005', 'Nguyễn Văn Hùng', 'driver', 'driver.hung@ccadro.vn', '0903-812-456', 'DRIVER', 'Đội Xe Đầu Kéo Điện & Smart Container', 'Tài xế Hạng FC (Cabin OS)', 'a1000000-0000-4000-8000-000000000001', 'BR-HCM-HQ', 'FULL_TIME', 'CA_24_7', 21000000, 'ACTIVE', 'Tuyến Cát Lái - VSIP 1 • 0/20 điểm phạt'),
    ('NV-HUB-006', 'Nguyễn Minh Đạt', 'hub_mgr_dinhbang', 'hub.dinhbang@ccadro.vn', '0988-221-330', 'HUB_MANAGER', 'Điều Hành Trụ Sở & Giao Nhận 3PL', 'Trưởng Trụ Sở Hub Đình Bảng', 'a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'FULL_TIME', 'CA_HANH_CHINH', 27000000, 'ACTIVE', 'Quản lý dải mã & Webhook 3PL Hub Đình Bảng'),
    ('NV-SHP-007', 'Lê Minh Khôi', 'shipper', 'shipper.khoi@ccadro.vn', '0977-654-321', 'HUB_SHIPPER', 'Đội Giao Nhận Last-Mile 3PL', 'Nhân viên Giao nhận Photo POD', 'a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'FULL_TIME', 'CA_SANG', 16500000, 'ACTIVE', 'Phụ trách khu vực KCN Từ Sơn - Bắc Ninh'),
    ('NV-AUD-008', 'Đặng Thị Minh Châu', 'hub_auditor_dinhbang', 'audit.dinhbang@ccadro.vn', '0945-909-101', 'HUB_AUDITOR', 'Kiểm Toán & Đối Soát 3PL', 'Kiểm toán viên Đối soát ePOD', 'a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'FULL_TIME', 'CA_HANH_CHINH', 19500000, 'ACTIVE', 'Đối soát chứng từ giao nhận đọc-duy-nhất')
ON CONFLICT (employee_code) DO NOTHING;
