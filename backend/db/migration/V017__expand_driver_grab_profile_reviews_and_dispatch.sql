-- V017__expand_driver_grab_profile_reviews_and_dispatch.sql
-- Mở rộng lược đồ quản lý đội ngũ tài xế chuẩn Grab Driver Profile, nhật ký HOS, đánh giá khách hàng B2B và lệnh điều phối

-- 1. Mở rộng bảng driver với thông tin cá nhân, GPLX FC, hiệu suất và giờ lái an toàn HOS
ALTER TABLE driver ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(20);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS national_id VARCHAR(30);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS hometown VARCHAR(150);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS license_class VARCHAR(20) NOT NULL DEFAULT 'FC';
ALTER TABLE driver ADD COLUMN IF NOT EXISTS license_expiry_date VARCHAR(20);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS experience_years INTEGER NOT NULL DEFAULT 5;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) NOT NULL DEFAULT 4.95;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS total_trips INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS on_time_rate NUMERIC(5, 2) NOT NULL DEFAULT 99.00;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS eco_score INTEGER NOT NULL DEFAULT 95;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS green_km_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS violations_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS hos_continuous_min INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS hos_daily_min INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS pre_trip_passed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE driver ADD COLUMN IF NOT EXISTS pre_trip_time VARCHAR(120);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS assigned_vehicle_plate VARCHAR(30);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS assigned_vehicle_type VARCHAR(120);
ALTER TABLE driver ADD COLUMN IF NOT EXISTS safety_certs_json TEXT NOT NULL DEFAULT '["Eco-Driving GLEC v3","An Toàn Container"]';

CREATE INDEX IF NOT EXISTS idx_driver_license_class ON driver(license_class);
CREATE INDEX IF NOT EXISTS idx_driver_phone ON driver(phone);

-- 2. Bảng lưu đánh giá & phản hồi từ khách hàng doanh nghiệp B2B (Grab-style Star Reviews)
CREATE TABLE IF NOT EXISTS driver_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE CASCADE,
    author_name VARCHAR(150) NOT NULL,
    shipment_code VARCHAR(50),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_review_driver ON driver_review(driver_id);

-- 3. Bảng lưu lịch sử tin nhắn điều phối gửi xuống Cabin OS / SMS tài xế
CREATE TABLE IF NOT EXISTS driver_dispatch_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE CASCADE,
    sender_name VARCHAR(150) NOT NULL DEFAULT 'Điều phối B2B',
    message_text TEXT NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'CABIN_OS_SMS',
    delivery_status VARCHAR(40) NOT NULL DEFAULT 'SENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_dispatch_driver ON driver_dispatch_message(driver_id);

-- 4. Seed 6 hồ sơ tài xế chuẩn Grab Driver & HOS đồng bộ với 5 Smart Containers ở V016
INSERT INTO driver (
    id, driver_code, full_name, phone, email, date_of_birth, national_id, hometown,
    license_class, license_number, license_expiry_date, experience_years, verified,
    status, rating, total_trips, on_time_rate, eco_score, green_km_total, violations_count,
    hos_continuous_min, hos_daily_min, pre_trip_passed, pre_trip_time,
    assigned_vehicle_plate, assigned_vehicle_type, safety_certs_json
) VALUES
(
    '11111111-1111-4111-8111-111111110001', 'DRV-FC-001', 'Nguyễn Văn Tài', '0903 812 456',
    'tai.nguyen@ccadro-fleet.vn', '14/05/1988', '0790 8800 4129', 'TP. Thủ Đức, TP. Hồ Chí Minh',
    'FC', '7901-8842-9012', '18/10/2029', 9, TRUE,
    'ON_TRIP', 4.95, 418, 99.40, 97, 42860.00, 0,
    118, 275, TRUE, '06:45 Sáng nay (6/6 Đạt)',
    '51C-888.99', 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    '["Eco-Driving GLEC v3","Chuỗi Lạnh -25°C","An Toàn Cảng Biển"]'
),
(
    '11111111-1111-4111-8111-111111110002', 'DRV-FC-002', 'Lê Minh Khôi', '0908 551 209',
    'khoi.le@ccadro-fleet.vn', '22/09/1991', '0790 9101 5832', 'Quận 7, TP. Hồ Chí Minh',
    'FC', '7901-9124-5501', '04/03/2030', 7, TRUE,
    'ON_TRIP', 4.90, 312, 98.70, 95, 36420.00, 0,
    145, 310, TRUE, '07:10 Sáng nay (6/6 Đạt)',
    '51C-704.33', 'Xe đầu kéo điện (EV) • 40T BEV',
    '["Eco-Driving GLEC v3","Vận Chuyển Hàng Điện Tử","Sơ Cấp Cứu Đường Bộ"]'
),
(
    '11111111-1111-4111-8111-111111110003', 'DRV-FC-003', 'Trần Hoàng Nam', '0914 720 881',
    'nam.tran@ccadro-fleet.vn', '03/11/1985', '0740 8500 2271', 'TP. Dĩ An, Bình Dương',
    'FC', '7401-8511-2271', '29/08/2028', 11, TRUE,
    'ON_TRIP', 4.98, 589, 99.80, 98, 61540.00, 0,
    95, 220, TRUE, '08:00 Sáng nay (6/6 Đạt)',
    '51D-662.18', 'Xe tải chuẩn Euro 5 SCR',
    '["Tài Xế Vàng 5 Năm","Eco-Driving GLEC v3","PCCC & Hàng Hóa Nhẹ"]'
),
(
    '11111111-1111-4111-8111-111111110004', 'DRV-FC-004', 'Phạm Quốc Tuấn', '0989 341 612',
    'tuan.pham@ccadro-fleet.vn', '19/02/1989', '0750 8900 7743', 'TP. Biên Hòa, Đồng Nai',
    'FC', '7501-8900-7743', '12/12/2029', 8, TRUE,
    'AVAILABLE', 4.92, 364, 99.10, 94, 39180.00, 0,
    0, 185, TRUE, '05:50 Sáng nay (6/6 Đạt)',
    '61C-419.52', 'Xe tải chuẩn Euro 5',
    '["Chuỗi Lạnh -25°C","Eco-Driving GLEC v3"]'
),
(
    '11111111-1111-4111-8111-111111110005', 'DRV-FC-005', 'Võ Thành Đạt', '0937 618 904',
    'dat.vo@ccadro-fleet.vn', '28/07/1992', '0790 9203 1904', 'Quận Bình Tân, TP. Hồ Chí Minh',
    'FC', '7902-9203-1904', '15/06/2031', 6, TRUE,
    'AVAILABLE', 4.88, 245, 98.00, 92, 27900.00, 0,
    0, 160, TRUE, '04:40 Sáng nay (6/6 Đạt)',
    '51D-402.11', 'Xe diesel tối ưu lộ trình xanh',
    '["Eco-Driving GLEC v3","An Toàn Cảng Cái Mép"]'
),
(
    '11111111-1111-4111-8111-111111110006', 'DRV-C-006', 'Đặng Hữu Phước', '0975 440 218',
    'phuoc.dang@ccadro-fleet.vn', '10/01/1986', '0770 8600 3318', 'TX. Phú Mỹ, Bà Rịa - Vũng Tàu',
    'C', '7701-8600-3318', '20/04/2028', 10, TRUE,
    'INACTIVE', 4.91, 402, 98.90, 93, 45120.00, 0,
    0, 0, FALSE, 'Đang nghỉ bù HOS sau ca đêm',
    '72C-195.80', 'Xe tải nhẹ Hybrid/EV 15T',
    '["Eco-Driving GLEC v3","An Toàn Depot Cái Mép"]'
)
ON CONFLICT (driver_code) DO UPDATE SET
    email = COALESCE(driver.email, EXCLUDED.email),
    date_of_birth = COALESCE(driver.date_of_birth, EXCLUDED.date_of_birth),
    national_id = COALESCE(driver.national_id, EXCLUDED.national_id),
    hometown = COALESCE(driver.hometown, EXCLUDED.hometown),
    license_class = COALESCE(driver.license_class, EXCLUDED.license_class),
    license_expiry_date = COALESCE(driver.license_expiry_date, EXCLUDED.license_expiry_date),
    experience_years = EXCLUDED.experience_years,
    assigned_vehicle_plate = COALESCE(driver.assigned_vehicle_plate, EXCLUDED.assigned_vehicle_plate),
    assigned_vehicle_type = COALESCE(driver.assigned_vehicle_type, EXCLUDED.assigned_vehicle_type);

-- 5. Liên kết khóa ngoại assigned_driver_id cho 5 Smart Containers đã seed ở V016
UPDATE container SET assigned_driver_id = '11111111-1111-4111-8111-111111110001' WHERE container_code = 'TCKU-781920-4' AND assigned_driver_id IS NULL;
UPDATE container SET assigned_driver_id = '11111111-1111-4111-8111-111111110002' WHERE container_code = 'MSKU-492018-7' AND assigned_driver_id IS NULL;
UPDATE container SET assigned_driver_id = '11111111-1111-4111-8111-111111110003' WHERE container_code = 'CMAU-821903-2' AND assigned_driver_id IS NULL;
UPDATE container SET assigned_driver_id = '11111111-1111-4111-8111-111111110004' WHERE container_code = 'CCLU-619284-5' AND assigned_driver_id IS NULL;
UPDATE container SET assigned_driver_id = '11111111-1111-4111-8111-111111110005' WHERE container_code = 'TGHU-330198-1' AND assigned_driver_id IS NULL;

-- 6. Seed đánh giá B2B mẫu cho tài xế
INSERT INTO driver_review (id, driver_id, author_name, shipment_code, rating, comment) VALUES
('22222222-2222-4222-8222-222222220001', '11111111-1111-4111-8111-111111110001', 'Minh Phú Seafood', 'SHP-2026-8192', 5, 'Nhiệt độ cont lạnh giữ ổn định -18.4°C, tài xế cập cảng rất đúng giờ.'),
('22222222-2222-4222-8222-222222220002', '11111111-1111-4111-8111-111111110002', 'Samsung Electronics VN', 'SHP-2026-4920', 5, 'Gia tốc kế < 0.25G suốt hành trình cao tốc, bảo vệ linh kiện cực tốt.'),
('22222222-2222-4222-8222-222222220003', '11111111-1111-4111-8111-111111110003', 'Unilever VN', 'SHP-2026-8219', 5, 'Tài xế kinh nghiệm dày dạn, xử lý ùn tắc QL13 rất linh hoạt.'),
('22222222-2222-4222-8222-222222220004', '11111111-1111-4111-8111-111111110004', 'Vinamilk Mega', 'SHP-2026-6192', 5, 'Bàn giao ePOD đầy đủ chứng từ và mở seal đúng quy trình tại Nhơn Trạch.')
ON CONFLICT (id) DO NOTHING;

