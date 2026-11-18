-- V016__expand_container_and_smart_telematics.sql
-- Nâng cấp lược đồ cơ sở dữ liệu cho Smart Container, Khóa Seal GPS Hải quan và Viễn thông IoT độc lập

-- 1. Bổ sung các cột thuộc tính viễn thông, cảm biến và liên kết vận hành cho bảng container
ALTER TABLE container ADD COLUMN IF NOT EXISTS iso_type VARCHAR(10) DEFAULT '45R1';
ALTER TABLE container ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100) DEFAULT 'Tân Cảng Sài Gòn (SNP Logistics)';
ALTER TABLE container ADD COLUMN IF NOT EXISTS cubic_capacity_m3 NUMERIC(8, 2) DEFAULT 67.9;
ALTER TABLE container ADD COLUMN IF NOT EXISTS e_seal_number VARCHAR(50);
ALTER TABLE container ADD COLUMN IF NOT EXISTS e_seal_status VARCHAR(30) DEFAULT 'LOCKED_SECURE';
ALTER TABLE container ADD COLUMN IF NOT EXISTS e_seal_integrity_pct INTEGER DEFAULT 100;
ALTER TABLE container ADD COLUMN IF NOT EXISTS telematics_model VARCHAR(100) DEFAULT 'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3';
ALTER TABLE container ADD COLUMN IF NOT EXISTS supply_air_temp_c NUMERIC(5, 2) DEFAULT -18.4;
ALTER TABLE container ADD COLUMN IF NOT EXISTS return_air_temp_c NUMERIC(5, 2) DEFAULT -17.9;
ALTER TABLE container ADD COLUMN IF NOT EXISTS humidity_pct NUMERIC(5, 2) DEFAULT 88.0;
ALTER TABLE container ADD COLUMN IF NOT EXISTS shock_g NUMERIC(5, 2) DEFAULT 0.24;
ALTER TABLE container ADD COLUMN IF NOT EXISTS solar_power_watts NUMERIC(5, 2) DEFAULT 42.0;
ALTER TABLE container ADD COLUMN IF NOT EXISTS battery_pct INTEGER DEFAULT 98;
ALTER TABLE container ADD COLUMN IF NOT EXISTS last_latitude NUMERIC(10, 6);
ALTER TABLE container ADD COLUMN IF NOT EXISTS last_longitude NUMERIC(10, 6);
ALTER TABLE container ADD COLUMN IF NOT EXISTS last_location_name VARCHAR(255);
ALTER TABLE container ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5, 2) DEFAULT 0.0;
ALTER TABLE container ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC(5, 2) DEFAULT 0.0;
ALTER TABLE container ADD COLUMN IF NOT EXISTS eta_minutes INTEGER DEFAULT 0;
ALTER TABLE container ADD COLUMN IF NOT EXISTS assigned_shipment_id UUID;
ALTER TABLE container ADD COLUMN IF NOT EXISTS assigned_shipment_code VARCHAR(50);
ALTER TABLE container ADD COLUMN IF NOT EXISTS assigned_driver_id UUID;
ALTER TABLE container ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);
ALTER TABLE container ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);
ALTER TABLE container ADD COLUMN IF NOT EXISTS driver_license VARCHAR(50);
ALTER TABLE container ADD COLUMN IF NOT EXISTS driver_safety_score NUMERIC(3, 2) DEFAULT 4.95;
ALTER TABLE container ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID;
ALTER TABLE container ADD COLUMN IF NOT EXISTS vehicle_license_plate VARCHAR(30);
ALTER TABLE container ADD COLUMN IF NOT EXISTS vehicle_type_label VARCHAR(50);
ALTER TABLE container ADD COLUMN IF NOT EXISTS origin_name VARCHAR(255);
ALTER TABLE container ADD COLUMN IF NOT EXISTS destination_name VARCHAR(255);
ALTER TABLE container ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE container ADD COLUMN IF NOT EXISTS epod_recipient VARCHAR(100);
ALTER TABLE container ADD COLUMN IF NOT EXISTS epod_signature VARCHAR(255);

-- 2. Đánh chỉ mục tìm kiếm và lọc dữ liệu tốc độ cao
CREATE INDEX IF NOT EXISTS idx_container_iso_type ON container(iso_type);
CREATE INDEX IF NOT EXISTS idx_container_driver ON container(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_container_shipment ON container(assigned_shipment_id);
CREATE INDEX IF NOT EXISTS idx_container_eseal ON container(e_seal_number);

-- 3. Khởi tạo dữ liệu mẫu (Seed 5 Smart Containers chuẩn thực tế phía Nam)
INSERT INTO container (
    id,
    container_code,
    container_type,
    iso_type,
    owner_name,
    tare_weight_tons,
    max_payload_tons,
    cubic_capacity_m3,
    is_reefer,
    status,
    e_seal_number,
    e_seal_status,
    e_seal_integrity_pct,
    telematics_model,
    supply_air_temp_c,
    return_air_temp_c,
    humidity_pct,
    shock_g,
    solar_power_watts,
    battery_pct,
    last_latitude,
    last_longitude,
    last_location_name,
    progress_pct,
    speed_kmh,
    eta_minutes,
    assigned_shipment_code,
    driver_name,
    driver_phone,
    driver_license,
    driver_safety_score,
    vehicle_license_plate,
    vehicle_type_label,
    origin_name,
    destination_name
) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'TCKU-781920-4',
    'REEFER_40FT',
    '45R1',
    'Tân Cảng Sài Gòn (SNP Logistics)',
    4.48,
    29.52,
    67.9,
    TRUE,
    'IN_TRANSIT',
    'VN-CUST-819204',
    'LOCKED_SECURE',
    100,
    'Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3',
    -18.4,
    -17.9,
    88.0,
    0.24,
    42.0,
    98,
    10.8492,
    106.7725,
    'Đoạn ngã 4 Thủ Đức • Xa lộ Hà Nội',
    54.0,
    52.0,
    12,
    'SHP-2026-8192',
    'Nguyễn Văn Tài',
    '0903 812 456',
    'GPLX Hạng FC • 9 năm kinh nghiệm',
    4.95,
    '51C-888.99',
    'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    'Cảng Cát Lái, TP. Thủ Đức',
    'ICD Sóng Thần, Dĩ An, Bình Dương'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'MSKU-492018-7',
    'DRY_40FT',
    '45G1',
    'Maersk Line A/S',
    3.90,
    28.60,
    76.4,
    FALSE,
    'IN_TRANSIT',
    'VN-CUST-901423',
    'LOCKED_SECURE',
    100,
    'Orbcomm CT 3500 Solar Asset Tracker',
    26.2,
    26.8,
    52.0,
    0.21,
    45.0,
    99,
    10.7124,
    106.9452,
    'Đoạn nút giao Vành đai 3 • Cao tốc Long Thành',
    68.0,
    60.0,
    26,
    'SHP-2026-4920',
    'Lê Minh Khôi',
    '0908 551 209',
    'GPLX Hạng FC • 7 năm kinh nghiệm',
    4.90,
    '51C-704.33',
    'Xe đầu kéo điện (EV) • 40T BEV',
    'Cảng Cát Lái, TP. Thủ Đức',
    'Cụm Cảng Cái Mép – Thị Vải, BR-VT'
),
(
    'c0000000-0000-0000-0000-000000000003',
    'CMAU-821903-2',
    'DRY_40FT',
    '45G1',
    'CMA CGM Group',
    3.90,
    28.60,
    76.4,
    FALSE,
    'IN_TRANSIT',
    'VN-CUST-774102',
    'LOCKED_SECURE',
    100,
    'Orbcomm CT 3500 Solar Asset Tracker',
    28.0,
    28.5,
    60.0,
    0.28,
    38.0,
    95,
    10.8652,
    106.6712,
    'Đoạn ngã 4 Bình Phước • Quốc lộ 13',
    30.0,
    46.0,
    24,
    'SHP-2026-8219',
    'Trần Hoàng Nam',
    '0914 720 881',
    'GPLX Hạng FC • 11 năm kinh nghiệm',
    4.98,
    '51D-662.18',
    'Xe tải chuẩn Euro 5 SCR',
    'KCN Tân Bình, Q. Tân Phú',
    'KCN VSIP 1, Thuận An, Bình Dương'
),
(
    'c0000000-0000-0000-0000-000000000004',
    'CCLU-619284-5',
    'REEFER_40FT',
    '45R1',
    'CCADRO Green Alliance',
    4.48,
    29.52,
    67.9,
    TRUE,
    'DELIVERED',
    'VN-CUST-619284',
    'UNLOCKED_AUTHORIZED',
    100,
    'Carrier DataCOLD 600 / Nexxiot Edge',
    -18.2,
    -17.8,
    86.0,
    0.18,
    44.0,
    97,
    10.7241,
    106.9182,
    'Kho ngoại quan KCN Nhơn Trạch • Hạ bãi thành công',
    100.0,
    0.0,
    0,
    'SHP-2026-6192',
    'Phạm Quốc Tuấn',
    '0989 341 612',
    'GPLX Hạng C/FC • 8 năm kinh nghiệm',
    4.92,
    '61C-419.52',
    'Xe tải chuẩn Euro 5',
    'Cảng Container Hiệp Phước, Nhà Bè',
    'KCN Nhơn Trạch, Đồng Nai'
),
(
    'c0000000-0000-0000-0000-000000000005',
    'TGHU-330198-1',
    'DRY_20FT',
    '22G1',
    'Textainer Group / Hapag-Lloyd',
    2.20,
    28.28,
    33.2,
    FALSE,
    'DELIVERED',
    'VN-CUST-330198',
    'UNLOCKED_AUTHORIZED',
    100,
    'Sensitech TempTale GEO / CalAmp TTU-2830',
    29.0,
    29.5,
    50.0,
    0.22,
    36.0,
    94,
    11.0512,
    106.6985,
    'Bãi giao nhận Nhà máy Yazaki VSIP 2',
    100.0,
    0.0,
    0,
    'SHP-2026-3301',
    'Võ Thành Đạt',
    '0937 618 904',
    'GPLX Hạng FC • 6 năm kinh nghiệm',
    4.88,
    '51D-402.11',
    'Xe diesel tối ưu lộ trình xanh',
    'Cụm Cảng Cái Mép – Thị Vải',
    'KCN VSIP 2 & TP. Mới Bình Dương'
)
ON CONFLICT (container_code) DO UPDATE SET
    iso_type = EXCLUDED.iso_type,
    owner_name = EXCLUDED.owner_name,
    cubic_capacity_m3 = EXCLUDED.cubic_capacity_m3,
    status = EXCLUDED.status,
    e_seal_number = EXCLUDED.e_seal_number,
    e_seal_status = EXCLUDED.e_seal_status,
    telematics_model = EXCLUDED.telematics_model,
    supply_air_temp_c = EXCLUDED.supply_air_temp_c,
    return_air_temp_c = EXCLUDED.return_air_temp_c,
    humidity_pct = EXCLUDED.humidity_pct,
    shock_g = EXCLUDED.shock_g,
    solar_power_watts = EXCLUDED.solar_power_watts,
    battery_pct = EXCLUDED.battery_pct,
    last_latitude = EXCLUDED.last_latitude,
    last_longitude = EXCLUDED.last_longitude,
    last_location_name = EXCLUDED.last_location_name,
    progress_pct = EXCLUDED.progress_pct,
    speed_kmh = EXCLUDED.speed_kmh,
    eta_minutes = EXCLUDED.eta_minutes,
    assigned_shipment_code = EXCLUDED.assigned_shipment_code,
    driver_name = EXCLUDED.driver_name,
    driver_phone = EXCLUDED.driver_phone,
    driver_license = EXCLUDED.driver_license,
    driver_safety_score = EXCLUDED.driver_safety_score,
    vehicle_license_plate = EXCLUDED.vehicle_license_plate,
    vehicle_type_label = EXCLUDED.vehicle_type_label,
    origin_name = EXCLUDED.origin_name,
    destination_name = EXCLUDED.destination_name;

