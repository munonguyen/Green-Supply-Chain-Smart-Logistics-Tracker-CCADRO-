-- ==============================================================================
-- Migration: V054__shipper_kyc_and_compliance_profile.sql
-- Description: Bổ sung hồ sơ xác thực thực tế (eKYC CCCD, LLTP, GPLX, Chứng chỉ lạnh,
--              Đăng kiểm xe, Bảo hiểm TNDS & Chỉ số SLA) cho bảng hub_local_shipper.
-- ==============================================================================

ALTER TABLE hub_local_shipper
    ADD COLUMN IF NOT EXISTS cccd_masked VARCHAR(24),
    ADD COLUMN IF NOT EXISTS cccd_issued_by VARCHAR(140) DEFAULT 'Cục CSQLHC về TTXH',
    ADD COLUMN IF NOT EXISTS cccd_issued_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kyc_verified_by VARCHAR(80),
    ADD COLUMN IF NOT EXISTS kyc_note VARCHAR(500),
    ADD COLUMN IF NOT EXISTS permanent_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS criminal_record_code VARCHAR(60),
    ADD COLUMN IF NOT EXISTS criminal_record_status VARCHAR(30) DEFAULT 'CLEAR',
    ADD COLUMN IF NOT EXISTS health_check_expiry_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS driver_license_class VARCHAR(16),
    ADD COLUMN IF NOT EXISTS driver_license_masked VARCHAR(32),
    ADD COLUMN IF NOT EXISTS driver_license_expiry_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cold_chain_certified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vehicle_registration_no VARCHAR(40),
    ADD COLUMN IF NOT EXISTS inspection_expiry_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS insurance_expiry_date VARCHAR(20),
    ADD COLUMN IF NOT EXISTS gps_device_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS on_time_rate_pct DOUBLE PRECISION NOT NULL DEFAULT 98.0,
    ADD COLUMN IF NOT EXISTS pod_compliance_pct DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    ADD COLUMN IF NOT EXISTS completed_orders_month INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cod_limit_vnd BIGINT NOT NULL DEFAULT 20000000;

UPDATE hub_local_shipper
SET
    cccd_masked = '027094****86',
    cccd_issued_date = '2022-05-14',
    kyc_status = 'VERIFIED',
    kyc_verified_at = COALESCE(kyc_verified_at, CURRENT_TIMESTAMP - INTERVAL '14 days'),
    kyc_verified_by = 'hub_mgr_dinhbang',
    kyc_note = 'Đã đối chiếu CCCD gắn chip, bằng B2, LLTP số 1 & đăng kiểm xe bảo ôn 99C-182.68.',
    permanent_address = 'Khu phố Thượng, P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    emergency_contact_name = 'Nguyễn Thị Hoa (Vợ)',
    emergency_contact_phone = '0984 112 340',
    criminal_record_code = 'LLTP-BN-2026-0142',
    criminal_record_status = 'CLEAR',
    health_check_expiry_date = '2027-08-30',
    driver_license_class = 'B2',
    driver_license_masked = '27021****812',
    driver_license_expiry_date = '2031-04-12',
    cold_chain_certified = TRUE,
    vehicle_registration_no = '99A-041826',
    inspection_expiry_date = '2027-06-15',
    insurance_expiry_date = '2027-05-01',
    gps_device_code = 'GSHT-BN-001',
    on_time_rate_pct = 99.1,
    pod_compliance_pct = 100.0,
    completed_orders_month = 148,
    cod_limit_vnd = 30000000
WHERE shipper_code = 'SHP-BN-001';

UPDATE hub_local_shipper
SET
    cccd_masked = '027091****24',
    cccd_issued_date = '2023-02-18',
    kyc_status = 'VERIFIED',
    kyc_verified_at = COALESCE(kyc_verified_at, CURRENT_TIMESTAMP - INTERVAL '10 days'),
    kyc_verified_by = 'hub_mgr_dinhbang',
    kyc_note = 'Đạt chuẩn hồ sơ lái xe tải nhẹ hạng C phụ trách cụm KCN VSIP.',
    permanent_address = 'Thôn Phù Chẩn, P. Phù Chẩn, TP. Từ Sơn, Bắc Ninh',
    emergency_contact_name = 'Trần Văn Hùng (Anh trai)',
    emergency_contact_phone = '0975 339 021',
    criminal_record_code = 'LLTP-BN-2026-0188',
    criminal_record_status = 'CLEAR',
    health_check_expiry_date = '2027-03-20',
    driver_license_class = 'C',
    driver_license_masked = '27019****445',
    driver_license_expiry_date = '2029-11-20',
    cold_chain_certified = FALSE,
    vehicle_registration_no = '99A-052419',
    inspection_expiry_date = '2027-02-28',
    insurance_expiry_date = '2027-04-15',
    gps_device_code = 'GSHT-BN-002',
    on_time_rate_pct = 97.8,
    pod_compliance_pct = 99.2,
    completed_orders_month = 132,
    cod_limit_vnd = 25000000
WHERE shipper_code = 'SHP-BN-002';

UPDATE hub_local_shipper
SET
    cccd_masked = '027096****51',
    cccd_issued_date = '2023-09-04',
    kyc_status = 'PENDING_REVIEW',
    kyc_note = 'Chờ gia hạn tem kiểm định định kỳ quý tới; đã xác thực CCCD & chứng chỉ lạnh.',
    permanent_address = 'P. Đồng Nguyên, TP. Từ Sơn, Bắc Ninh',
    emergency_contact_name = 'Lê Thị Minh (Mẹ)',
    emergency_contact_phone = '0913 704 118',
    criminal_record_code = 'LLTP-BN-2026-0215',
    criminal_record_status = 'CLEAR',
    health_check_expiry_date = '2027-07-10',
    driver_license_class = 'B2',
    driver_license_masked = '27022****903',
    driver_license_expiry_date = '2032-01-15',
    cold_chain_certified = TRUE,
    vehicle_registration_no = '99A-063097',
    inspection_expiry_date = '2026-12-10',
    insurance_expiry_date = '2027-01-20',
    gps_device_code = 'GSHT-BN-003',
    on_time_rate_pct = 98.4,
    pod_compliance_pct = 100.0,
    completed_orders_month = 119,
    cod_limit_vnd = 20000000
WHERE shipper_code = 'SHP-BN-003';

UPDATE hub_local_shipper
SET
    cccd_masked = '075093****17',
    cccd_issued_date = '2022-11-22',
    kyc_status = 'VERIFIED',
    kyc_verified_at = COALESCE(kyc_verified_at, CURRENT_TIMESTAMP - INTERVAL '21 days'),
    kyc_verified_by = 'hub_mgr_amata',
    kyc_note = 'Đã xác thực đầy đủ eKYC, GPLX B2, chứng chỉ vận hành chuỗi lạnh & bảo hiểm hàng hóa.',
    permanent_address = 'P. Long Bình, TP. Biên Hòa, Đồng Nai',
    emergency_contact_name = 'Đặng Thị Thu (Vợ)',
    emergency_contact_phone = '0909 551 782',
    criminal_record_code = 'LLTP-DN-2026-0309',
    criminal_record_status = 'CLEAR',
    health_check_expiry_date = '2027-09-12',
    driver_license_class = 'B2',
    driver_license_masked = '75021****631',
    driver_license_expiry_date = '2030-08-19',
    cold_chain_certified = TRUE,
    vehicle_registration_no = '60C-192450',
    inspection_expiry_date = '2027-07-05',
    insurance_expiry_date = '2027-06-30',
    gps_device_code = 'GSHT-DN-101',
    on_time_rate_pct = 99.3,
    pod_compliance_pct = 100.0,
    completed_orders_month = 164,
    cod_limit_vnd = 30000000
WHERE shipper_code = 'SHP-BH-101';

