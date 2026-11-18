-- =============================================================================
-- Flyway V028: Enterprise Company Profiles & Detailed User Governance (Admin IAM)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code VARCHAR(50) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    tax_code VARCHAR(40),
    business_license_number VARCHAR(80),
    industry VARCHAR(120),
    company_type VARCHAR(30) NOT NULL DEFAULT 'B2B_CUSTOMER', -- INTERNAL_CORP, B2B_CUSTOMER, PARTNER_3PL, HUB_OPERATOR
    company_phone VARCHAR(30),
    company_email VARCHAR(120),
    headquarters_address TEXT,
    representative_name VARCHAR(120),
    representative_title VARCHAR(100),
    credit_tier VARCHAR(30) NOT NULL DEFAULT 'STANDARD', -- STANDARD, GOLD_NET30, ENTERPRISE_MSA
    credit_limit_vnd BIGINT NOT NULL DEFAULT 0,
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED', -- PENDING, VERIFIED, REJECTED
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_tax_code ON public.companies(tax_code);
CREATE INDEX IF NOT EXISTS idx_companies_kyc ON public.companies(kyc_status);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(150),
    ADD COLUMN IF NOT EXISTS national_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS work_address TEXT,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
    ADD COLUMN IF NOT EXISTS customer_id VARCHAR(60),
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS tax_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30) DEFAULT 'VERIFIED',
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON public.users(customer_id);

-- Seed canonical enterprise companies
INSERT INTO public.companies (
    id, company_code, company_name, tax_code, business_license_number, industry,
    company_type, company_phone, company_email, headquarters_address,
    representative_name, representative_title, credit_tier, credit_limit_vnd, kyc_status
) VALUES
(
    '90000000-0000-0000-0000-000000000001', 'CCADRO_INT',
    'CCADRO Green Logistics Corporation', '0316889901', 'GP-KDVT-2026-0001',
    'Vận tải Xanh & Điều phối Thông minh', 'INTERNAL_CORP',
    '028 3888 8801', 'noc@ccadro.com',
    'Tầng 12, Tòa nhà Smart Logistics, TP. Thủ Đức, TP.HCM',
    'Trần Minh Quản Trị', 'Giám đốc Điều hành NOC', 'ENTERPRISE_MSA', 0, 'VERIFIED'
),
(
    '90000000-0000-0000-0000-000000000002', 'VINAMILK',
    'CTCP Sữa Việt Nam (Vinamilk Logistics)', '0300588569', 'GP-B2B-2025-8821',
    'FMCG & Chuỗi lạnh Thực phẩm', 'B2B_CUSTOMER',
    '028 5415 5555', 'logistics-b2b@vinamilk.com.vn',
    'Số 10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM',
    'Nguyễn Thị Lan Anh', 'Giám đốc Chuỗi cung ứng', 'ENTERPRISE_MSA', 500000000, 'VERIFIED'
),
(
    '90000000-0000-0000-0000-000000000003', 'SAMSUNG_VN',
    'Công ty TNHH Samsung Electronics Việt Nam', '2300325764', 'GP-B2B-2025-4410',
    'Điện tử & Linh kiện Xuất khẩu', 'B2B_CUSTOMER',
    '0222 369 6666', 'scm-vn@samsung.com',
    'KCN Yên Phong I, Huyện Yên Phong, Tỉnh Bắc Ninh',
    'Phạm Minh Đức', 'Trưởng phòng Xuất nhập khẩu', 'GOLD_NET30', 350000000, 'VERIFIED'
),
(
    '90000000-0000-0000-0000-000000000004', 'HUB_DINHBANG_BN',
    'Trung Tâm Phân Phối Đình Bảng - VSIP Bắc Ninh', '2301122334', 'GP-HUB-2026-0112',
    'Vận hành Hub Trung chuyển & Last-Mile', 'HUB_OPERATOR',
    '0222 374 8899', 'dinhbang-hub@ccadro.com',
    'Lô CN-04 KCN VSIP, Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    'Trần Minh Quang', 'Trưởng Trụ sở Hub Đình Bảng', 'STANDARD', 0, 'VERIFIED'
),
(
    '90000000-0000-0000-0000-000000000005', 'DHL_3PL',
    'DHL Supply Chain Việt Nam (Đối tác 3PL)', '0309911223', 'GP-3PL-2025-9902',
    'Kho vận 3PL & Giao nhận Cảng đích', 'PARTNER_3PL',
    '028 3844 6203', 'partner3pl@dhl-logistics.vn',
    'KCN Amata, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    'Lê Quốc Bảo', 'Giám đốc Kho vận Miền Nam', 'GOLD_NET30', 200000000, 'VERIFIED'
)
ON CONFLICT (company_code) DO NOTHING;

UPDATE public.users
SET company_id = '90000000-0000-0000-0000-000000000001',
    customer_id = 'CCADRO_INT',
    company_name = 'CCADRO Green Logistics Corporation',
    tax_code = '0316889901',
    department = COALESCE(department, 'Ban Quản Trị Hạ Tầng & Bảo Mật IAM'),
    job_title = COALESCE(job_title, 'Quản trị viên Hệ thống & Bảo mật'),
    phone_number = COALESCE(phone_number, '028 3888 8801'),
    kyc_status = 'VERIFIED'
WHERE username IN ('admin', 'dispatcher', 'driver', 'auditor', 'safety');

UPDATE public.users
SET company_id = '90000000-0000-0000-0000-000000000002',
    customer_id = 'VINAMILK',
    company_name = 'CTCP Sữa Việt Nam (Vinamilk Logistics)',
    tax_code = '0300588569',
    department = COALESCE(department, 'Phòng Điều Vận & Chuỗi Lạnh B2B'),
    job_title = COALESCE(job_title, 'Trưởng nhóm Điều vận B2B'),
    phone_number = COALESCE(phone_number, '028 5415 5555'),
    kyc_status = 'VERIFIED'
WHERE username = 'customer';

UPDATE public.users
SET company_id = '90000000-0000-0000-0000-000000000004',
    customer_id = 'HUB_DINHBANG_BN',
    company_name = 'Trung Tâm Phân Phối Đình Bảng - VSIP Bắc Ninh',
    tax_code = '2301122334',
    department = COALESCE(department, 'Đội Giao Nhận Đình Bảng • KCN VSIP Bắc Ninh'),
    job_title = COALESCE(job_title, 'Nhân sự Vận hành Hub'),
    kyc_status = 'VERIFIED'
WHERE username IN ('shipper', 'hub_mgr_dinhbang', 'hub_auditor_bn');

