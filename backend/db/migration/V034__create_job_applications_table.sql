-- ==============================================================================
-- Migration: V033__create_job_applications_table.sql
-- Description: Bổ sung luồng Xác nhận Đơn xin việc & Onboarding (Lái xe mới
--              và các Role nội bộ) + cờ đổi mật khẩu lần đầu cho User mới.
-- ==============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_code VARCHAR(40) NOT NULL UNIQUE,
    lookup_pin VARCHAR(20) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    national_id VARCHAR(30) NOT NULL,
    applied_role_code VARCHAR(40) NOT NULL,
    preferred_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    preferred_branch_code VARCHAR(40),
    preferred_hub_code VARCHAR(50),
    experience_years INTEGER NOT NULL DEFAULT 0,
    expected_salary_vnd BIGINT NOT NULL DEFAULT 18000000,
    resume_summary TEXT,

    license_number VARCHAR(50),
    license_class VARCHAR(20),
    license_expiry_date DATE,
    health_check_declared BOOLEAN NOT NULL DEFAULT FALSE,
    safety_training_declared BOOLEAN NOT NULL DEFAULT FALSE,

    certification_code VARCHAR(60),
    certificate_expiry_date DATE,
    issuing_authority VARCHAR(140),
    inspection_scope VARCHAR(160),

    application_status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
    screening_notes TEXT,
    interview_scheduled_at VARCHAR(40),
    interview_score INTEGER,
    drive_test_passed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by VARCHAR(60),
    approved_by VARCHAR(60),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_staff_id UUID,
    created_user_id UUID,
    created_username VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_app_status ON job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_job_app_role ON job_applications(applied_role_code);
CREATE INDEX IF NOT EXISTS idx_job_app_email ON job_applications(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_job_app_national_id ON job_applications(national_id);

INSERT INTO job_applications (
    id, application_code, lookup_pin, full_name, email, phone, national_id,
    applied_role_code, preferred_branch_id, preferred_branch_code, preferred_hub_code,
    experience_years, expected_salary_vnd, resume_summary,
    license_number, license_class, license_expiry_date, health_check_declared, safety_training_declared,
    certification_code, certificate_expiry_date, issuing_authority, inspection_scope,
    application_status, screening_notes, interview_scheduled_at, interview_score, drive_test_passed, reviewed_by
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001', 'APP-2026-0001', '482910',
        'Nguyễn Hữu Tín', 'tin.nguyen.driver@gmail.com', '0908-771-223', '079093004411',
        'DRIVER', 'a1000000-0000-4000-8000-000000000001', 'BR-HCM-HQ', NULL,
        6, 22500000, '6 năm kinh nghiệm chạy đầu kéo Container tuyến Cát Lái - VSIP - Cái Mép.',
        '790155667788', 'FC', DATE '2030-08-30', TRUE, TRUE,
        NULL, NULL, NULL, NULL,
        'COMPLIANCE_CHECKING', 'Đã vượt qua sát hạch lái thử xe đầu kéo điện EV tại Depot VSIP.',
        '2026-11-16 09:30', 92, TRUE, 'safety'
    ),
    (
        '40000000-0000-0000-0000-000000000002', 'APP-2026-0002', '739204',
        'Phan Văn Lộc', 'loc.shipper.bn@gmail.com', '0974-331-890', '027097008812',
        'HUB_SHIPPER', 'a1000000-0000-4000-8000-000000000002', 'BR-BN-DB', 'HUB-DINHBANG-BN',
        3, 16500000, '3 năm giao hàng nhanh tại KCN Từ Sơn - Yên Phong, thông thạo địa bàn.',
        '270197004455', 'A1', DATE '2031-05-20', TRUE, TRUE,
        NULL, NULL, NULL, NULL,
        'SUBMITTED', 'Hồ sơ mới nộp trực tuyến qua Cổng Tuyển Dụng CCADRO.',
        NULL, NULL, FALSE, NULL
    ),
    (
        '40000000-0000-0000-0000-000000000003', 'APP-2026-0003', '551038',
        'Lý Minh Khang', 'khang.safety.hse@gmail.com', '0919-662-445', '074089002299',
        'SAFETY_MANAGER', 'a1000000-0000-4000-8000-000000000003', 'BR-BD-VSIP', NULL,
        7, 29000000, '7 năm phụ trách thanh tra an toàn giao thông & HSE đội xe vận tải nặng.',
        NULL, NULL, NULL, TRUE, TRUE,
        'HSE-PRO-2026-710', DATE '2029-12-31', 'Cục An Toàn Lao Động', 'PRE_TRIP_UC01, DEMERIT_BRULE18',
        'INTERVIEW_OR_DRIVE_TEST', 'Đã sơ loại CV đạt chuẩn, hẹn phỏng vấn hội đồng an toàn.',
        '2026-11-20 14:00', 88, FALSE, 'admin'
    ),
    (
        '40000000-0000-0000-0000-000000000004', 'APP-2026-0004', '619482',
        'Trương Bảo Ngọc', 'ngoc.esg.audit@gmail.com', '0938-115-992', '001195003344',
        'ESG_AUDITOR', 'a1000000-0000-4000-8000-000000000005', 'BR-HN-LB', NULL,
        4, 26000000, 'Kiểm toán viên GHG Protocol & ISO 14083 cho chuỗi cung ứng lạnh.',
        NULL, NULL, NULL, TRUE, TRUE,
        'ISO14083-LEAD-809', DATE '2029-09-15', 'Smart Freight Centre', 'GLEC_V3_CARBON_UC12, SHA256_REPORT',
        'COMPLIANCE_CHECKING', 'Chứng chỉ GLEC hợp lệ, chờ Admin xác nhận cấp tài khoản Read-only Audit.',
        '2026-11-15 10:00', 95, FALSE, 'admin'
    )
ON CONFLICT (application_code) DO NOTHING;

