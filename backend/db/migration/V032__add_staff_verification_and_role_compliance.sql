-- ==============================================================================
-- Migration: V032__add_staff_verification_and_role_compliance.sql
-- Description: Bổ sung hồ sơ kiểm duyệt nghiệp vụ chuyên sâu cho Nhân viên Lái xe
--              (DRIVER, HUB_SHIPPER) và Nhân viên Kiểm soát (SAFETY_MANAGER,
--              ESG_AUDITOR, HUB_AUDITOR) theo đúng Role của hệ thống CCADRO.
-- ==============================================================================

ALTER TABLE staff_profiles
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(30),
    ADD COLUMN IF NOT EXISTS staff_category VARCHAR(30) NOT NULL DEFAULT 'OPS_DISPATCH',
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN IF NOT EXISTS verified_by VARCHAR(60),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS background_check_passed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS license_class VARCHAR(20),
    ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS health_check_passed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS health_check_date DATE,
    ADD COLUMN IF NOT EXISTS safety_training_certified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS assigned_vehicle_plate VARCHAR(30),
    ADD COLUMN IF NOT EXISTS assigned_hub_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS demerit_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS certification_code VARCHAR(60),
    ADD COLUMN IF NOT EXISTS certificate_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(140),
    ADD COLUMN IF NOT EXISTS inspection_scope VARCHAR(160),
    ADD COLUMN IF NOT EXISTS can_sign_off_compliance BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_staff_category ON staff_profiles(staff_category);
CREATE INDEX IF NOT EXISTS idx_staff_verification_status ON staff_profiles(verification_status);

UPDATE staff_profiles
SET staff_category = CASE
        WHEN role_code IN ('DRIVER', 'HUB_SHIPPER') THEN 'DRIVER_FLEET'
        WHEN role_code IN ('SAFETY_MANAGER', 'ESG_AUDITOR', 'HUB_AUDITOR') THEN 'CONTROL_AUDIT'
        WHEN role_code = 'ADMIN' THEN 'MANAGEMENT'
        ELSE 'OPS_DISPATCH'
    END,
    verification_status = 'APPROVED',
    verified_by = 'admin',
    verified_at = CURRENT_TIMESTAMP,
    background_check_passed = TRUE,
    safety_training_certified = TRUE
WHERE employee_code IN ('NV-ADM-001', 'NV-DSP-002', 'NV-SAF-003', 'NV-ESG-004', 'NV-DRV-005', 'NV-HUB-006', 'NV-SHP-007', 'NV-AUD-008');

UPDATE staff_profiles
SET national_id = '079092001234',
    license_number = '790145889201',
    license_class = 'FC',
    license_expiry_date = DATE '2029-12-31',
    health_check_passed = TRUE,
    health_check_date = DATE '2026-08-15',
    assigned_vehicle_plate = '51C-888.99',
    demerit_points = 0,
    verification_notes = 'Đạt chuẩn bằng FC, khám sức khỏe định kỳ & chứng chỉ lái xe điện an toàn.'
WHERE employee_code = 'NV-DRV-005';

UPDATE staff_profiles
SET national_id = '027098004512',
    license_number = '270198002314',
    license_class = 'A1',
    license_expiry_date = DATE '2030-06-30',
    health_check_passed = TRUE,
    health_check_date = DATE '2026-09-01',
    assigned_vehicle_plate = '99B1-EV08',
    assigned_hub_code = 'HUB-DINHBANG-BN',
    demerit_points = 0,
    verification_notes = 'Shipper nội khu HUB-DINHBANG-BN đạt kiểm duyệt Photo POD & PCCC.'
WHERE employee_code = 'NV-SHP-007';

UPDATE staff_profiles
SET national_id = '075087003399',
    certification_code = 'HSE-AN-TOAN-2026-003',
    certificate_expiry_date = DATE '2028-12-31',
    issuing_authority = 'Cục Đăng Kiểm & An Toàn Lao Động',
    inspection_scope = 'PRE_TRIP_UC01, DEMERIT_BRULE18, INCIDENT_UC16',
    can_sign_off_compliance = TRUE,
    verification_notes = 'Đủ thẩm quyền duyệt kiểm tra trước chuyến và xử lý sự cố khẩn cấp.'
WHERE employee_code = 'NV-SAF-003';

UPDATE staff_profiles
SET national_id = '001190008811',
    certification_code = 'GLEC-ISO14083-VN-042',
    certificate_expiry_date = DATE '2028-09-30',
    issuing_authority = 'Smart Freight Centre / GLEC v3 Accredited',
    inspection_scope = 'GLEC_V3_CARBON_UC12, CORRIDOR_BENCHMARK_UC13, SHA256_REPORT',
    can_sign_off_compliance = TRUE,
    verification_notes = 'Kiểm toán viên độc lập Scope 3 đạt chứng nhận ISO 14083.'
WHERE employee_code = 'NV-ESG-004';

UPDATE staff_profiles
SET national_id = '027193007722',
    certification_code = 'HUB-QA-3PL-2026-019',
    certificate_expiry_date = DATE '2028-05-15',
    issuing_authority = 'Ban Kiểm Soát Chất Lượng CCADRO',
    inspection_scope = 'HUB_POD_PHOTO, COLD_CHAIN_TEMP, HUB_SLA_READONLY',
    assigned_hub_code = 'HUB-DINHBANG-BN',
    can_sign_off_compliance = TRUE,
    verification_notes = 'Kiểm tra viên đối soát chứng từ ePOD độc lập tại Hub Đình Bảng.'
WHERE employee_code = 'NV-AUD-008';

INSERT INTO staff_profiles (
    employee_code, full_name, username, email, phone, role_code, staff_category,
    department, job_title, branch_id, branch_code, contract_type, shift_name, base_salary_vnd, status,
    national_id, verification_status, verification_notes, background_check_passed,
    license_number, license_class, license_expiry_date, health_check_passed, health_check_date,
    safety_training_certified, assigned_vehicle_plate, assigned_hub_code, demerit_points, notes
)
VALUES
    (
        'NV-DRV-009', 'Trần Quốc Tuấn', 'driver_tuan', 'tuan.driver@ccadro.vn', '0904-556-778',
        'DRIVER', 'DRIVER_FLEET', 'Đội Xe Đầu Kéo Điện VSIP', 'Tài Xế Xe Tải Điện 15T',
        'a1000000-0000-4000-8000-000000000003', 'BR-BD-VSIP', 'FULL_TIME', 'CA_SANG', 20500000, 'ACTIVE',
        '074091009988', 'PENDING_REVIEW', 'Đang chờ Admin/Safety thẩm định phiếu khám sức khỏe định kỳ Q4.',
        TRUE, '740182993412', 'C', DATE '2028-11-20', FALSE, NULL,
        TRUE, '61C-339.79', NULL, 2, 'Tài xế mới điều chuyển sang tuyến VSIP 1 - Cát Lái'
    ),
    (
        'NV-SHP-010', 'Hoàng Đức Thịnh', 'shipper_thinh', 'thinh.shipper@ccadro.vn', '0972-881-220',
        'HUB_SHIPPER', 'DRIVER_FLEET', 'Đội Giao Nhận Last-Mile 3PL', 'Nhân Viên Giao Hàng Nội Khu',
        'a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'CONTRACT', 'CA_CHIEU', 15500000, 'ACTIVE',
        '027099006655', 'REVISION_REQUIRED', 'Yêu cầu bổ sung ảnh GPLX bản mới & chứng chỉ tập huấn an toàn PCCC.',
        TRUE, '270201009911', 'A1', DATE '2026-04-10', TRUE, DATE '2026-09-12',
        FALSE, '99G1-EV12', 'HUB-DINHBANG-BN', 0, 'Cần hoàn tất lớp PCCC & gia hạn bằng lái trước khi giao đơn giá trị cao'
    )
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO staff_profiles (
    employee_code, full_name, username, email, phone, role_code, staff_category,
    department, job_title, branch_id, branch_code, contract_type, shift_name, base_salary_vnd, status,
    national_id, verification_status, verified_by, verified_at, verification_notes, background_check_passed,
    certification_code, certificate_expiry_date, issuing_authority, inspection_scope, assigned_hub_code,
    can_sign_off_compliance, notes
)
VALUES
    (
        'NV-SAF-011', 'Nguyễn Thanh Tùng', 'safety_tung', 'tung.safety@ccadro.vn', '0918-332-449',
        'SAFETY_MANAGER', 'CONTROL_AUDIT', 'Ban Kiểm Soát An Toàn Miền Nam', 'Chuyên Viên Kiểm Định Pre-Trip & Camera',
        'a1000000-0000-4000-8000-000000000001', 'BR-HCM-HQ', 'FULL_TIME', 'CA_24_7', 24500000, 'ACTIVE',
        '079088005432', 'PENDING_REVIEW', NULL, NULL, 'Chờ xác nhận cấp quyền ký duyệt đình chỉ xe (canSignOffCompliance).', TRUE,
        'HSE-DRV-2026-088', DATE '2028-08-31', 'Sở LĐTBXH TP.HCM', 'PRE_TRIP_UC01, CAMERA_AI_VIOLATION', NULL,
        FALSE, 'Phụ trách giám sát hành trình cảng Cát Lái'
    ),
    (
        'NV-AUD-012', 'Võ Ngọc Bích', 'hub_auditor_vsip', 'bich.audit@ccadro.vn', '0939-612-880',
        'HUB_AUDITOR', 'CONTROL_AUDIT', 'Bộ Phận Kiểm Soát SLA & Kho Lạnh', 'Kiểm Tra Viên Chuỗi Lạnh Hub VSIP',
        'a1000000-0000-4000-8000-000000000003', 'BR-BD-VSIP', 'FULL_TIME', 'CA_HANH_CHINH', 21000000, 'ACTIVE',
        '074194002190', 'APPROVED', 'admin', CURRENT_TIMESTAMP, 'Đã kiểm duyệt đầy đủ chứng chỉ kiểm soát nhiệt độ -18°C & Photo POD.', TRUE,
        'HUB-COLD-QA-055', DATE '2029-01-31', 'Trung Tâm Kiểm Định CCADRO', 'COLD_CHAIN_TEMP, HUB_POD_PHOTO', 'HUB-VSIP-BD',
        TRUE, 'Kiểm soát chất lượng bảo ôn hàng dược & thực phẩm đông lạnh'
    )
ON CONFLICT (employee_code) DO NOTHING;

