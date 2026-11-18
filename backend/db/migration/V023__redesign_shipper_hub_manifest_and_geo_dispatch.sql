-- ==============================================================================
-- Migration: V023__redesign_shipper_hub_manifest_and_geo_dispatch.sql
-- Description: Thiết kế lại mô hình Shipper chuẩn Logistics Hub-and-Spoke (Middle-Mile
--              Container -> Trụ sở Bưu cục Khu vực / Local Distribution Hub ->
--              Bóc tách Danh mục Hàng hóa (Cargo Manifest) -> Phân bổ tự động
--              cho từng Shipper địa phương dựa trên Vị trí được phân công (Geo-Proximity)).
-- ==============================================================================

-- 1. Bổ sung mã Trụ sở (hub_code) và trạng thái đồng bộ Manifest vào bảng bàn giao Container
ALTER TABLE third_party_shipper_handover
    ADD COLUMN IF NOT EXISTS hub_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS manifest_parcel_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manifest_total_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS manifest_ingested BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS manifest_ingested_at TIMESTAMPTZ;

-- 2. Bảng Trụ sở / Bưu cục Điều phối Giao nhận Khu vực (Local Distribution Hub)
CREATE TABLE IF NOT EXISTS local_distribution_hub (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_code VARCHAR(40) NOT NULL UNIQUE,
    hub_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    external_system_name VARCHAR(120) NOT NULL,
    webhook_endpoint VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    district_zone VARCHAR(120) NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    coverage_radius_km DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Đội ngũ Shipper Địa phương thuộc Trụ sở (mỗi Shipper có Vị trí Phân công cố định)
CREATE TABLE IF NOT EXISTS hub_local_shipper (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipper_code VARCHAR(40) NOT NULL UNIQUE,
    hub_code VARCHAR(40) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    vehicle_type VARCHAR(60) NOT NULL,
    vehicle_plate VARCHAR(40) NOT NULL,
    assigned_zone_name VARCHAR(160) NOT NULL,
    assigned_lat DOUBLE PRECISION NOT NULL,
    assigned_lng DOUBLE PRECISION NOT NULL,
    coverage_radius_km DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    cold_chain_capable BOOLEAN NOT NULL DEFAULT FALSE,
    max_capacity_kg DOUBLE PRECISION NOT NULL DEFAULT 1500.0,
    current_load_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    active_item_count INT NOT NULL DEFAULT 0,
    shift_status VARCHAR(40) NOT NULL DEFAULT 'AVAILABLE',
    rating DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_shipper_hub_code ON hub_local_shipper(hub_code);

-- 4. Bảng Danh mục Hàng hóa trong Container gửi sang Hệ thống Trụ sở (Cargo Manifest Items)
CREATE TABLE IF NOT EXISTS container_cargo_manifest_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) NOT NULL UNIQUE,
    container_code VARCHAR(40) NOT NULL,
    shipment_code VARCHAR(50),
    hub_code VARCHAR(40) NOT NULL,
    cargo_name VARCHAR(220) NOT NULL,
    cargo_category VARCHAR(60) NOT NULL,
    consignee_name VARCHAR(180) NOT NULL,
    consignee_phone VARCHAR(40) NOT NULL,
    delivery_address VARCHAR(255) NOT NULL,
    delivery_zone_name VARCHAR(160) NOT NULL,
    delivery_lat DOUBLE PRECISION NOT NULL,
    delivery_lng DOUBLE PRECISION NOT NULL,
    weight_kg DOUBLE PRECISION NOT NULL,
    parcel_count INT NOT NULL DEFAULT 1,
    required_temp_c DOUBLE PRECISION,
    requires_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
    sla_window VARCHAR(80) NOT NULL,
    dispatch_status VARCHAR(40) NOT NULL DEFAULT 'IN_CONTAINER',
    assigned_shipper_code VARCHAR(40),
    assigned_shipper_name VARCHAR(150),
    proximity_distance_km DOUBLE PRECISION,
    match_score DOUBLE PRECISION,
    dispatch_reason VARCHAR(300),
    assigned_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    recipient_pod_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manifest_item_hub ON container_cargo_manifest_item(hub_code);
CREATE INDEX IF NOT EXISTS idx_manifest_item_container ON container_cargo_manifest_item(container_code);
CREATE INDEX IF NOT EXISTS idx_manifest_item_shipper ON container_cargo_manifest_item(assigned_shipper_code);

-- 5. Seed dữ liệu 4 Trụ sở Phân phối Khu vực (Local Distribution Hubs)
INSERT INTO local_distribution_hub (
    id, hub_code, hub_name, company_name, external_system_name,
    webhook_endpoint, address, district_zone, center_lat, center_lng, coverage_radius_km
) VALUES
(
    '55555555-5555-4555-8555-555555550001', 'HUB-AMATA-BH',
    'Trụ sở Giao nhận Khu vực Amata • Biên Hòa', 'Kerry Cold Chain 3PL',
    'Kerry SmartWMS v4 (Hub Biên Hòa)', 'https://api.kerry-wms.example.vn/v2/webhooks/ccadro/handover',
    'Đại lộ Amata, P. Long Bình, TP. Biên Hòa, Đồng Nai', 'Cụm KCN Amata - Long Bình - Tam Hiệp',
    10.9465, 106.8920, 6.5
),
(
    '55555555-5555-4555-8555-555555550002', 'HUB-SHTP-Q9',
    'Trụ sở Điều phối Khu Công Nghệ Cao Quận 9 (SHTP)', 'Samsung SDS Logistics WMS',
    'SAP EWM 9.5 SHTP Hub', 'https://ewm-gateway.sds-vn.example.com/api/inbound/container',
    'Lô I-3B Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức', 'Cụm SHTP - Tân Phú - Long Thạnh Mỹ',
    10.8552, 106.7850, 6.0
),
(
    '55555555-5555-4555-8555-555555550003', 'HUB-VSIP1-BD',
    'Trụ sở Bưu cục Trung tâm VSIP 1 • Thuận An', 'Gemadept Distribution 3PL',
    'Gemadept SmartPort DMS', 'https://connect.gemadept.example.vn/webhook/container-arrived',
    'Số 8 Hữu Nghị, KCN VSIP 1, TP. Thuận An, Bình Dương', 'Cụm VSIP 1 - Bình Hòa - An Phú',
    10.9280, 106.7130, 6.0
),
(
    '55555555-5555-4555-8555-555555550004', 'HUB-NT2-DN',
    'Trụ sở Kho Lạnh & Giao nhận Nhơn Trạch 2', 'ViettelPost Cold Chain Hub',
    'VTP Fulfillment Core DMS', 'https://partner-gw.viettelpost.example.vn/ccadro/epod-sync',
    'Đường 25B, KCN Nhơn Trạch 2, H. Nhơn Trạch, Đồng Nai', 'Cụm Nhơn Trạch 1 - Nhơn Trạch 2 - Hiệp Phước',
    10.7360, 106.8790, 7.0
)
ON CONFLICT (hub_code) DO NOTHING;

-- Liên kết các Container hiện có về đúng Trụ sở phụ trách
UPDATE third_party_shipper_handover
SET hub_code = 'HUB-AMATA-BH', manifest_parcel_count = 3, manifest_total_weight_kg = 1120.0, manifest_ingested = FALSE
WHERE container_code = 'TCKU-781920-4';

UPDATE third_party_shipper_handover
SET hub_code = 'HUB-SHTP-Q9', manifest_parcel_count = 3, manifest_total_weight_kg = 860.0, manifest_ingested = FALSE
WHERE container_code = 'MSKU-492018-7';

UPDATE third_party_shipper_handover
SET hub_code = 'HUB-VSIP1-BD', manifest_parcel_count = 3, manifest_total_weight_kg = 1350.0, manifest_ingested = TRUE, manifest_ingested_at = NOW() - INTERVAL '10 minutes'
WHERE container_code = 'CMAU-821903-2';

UPDATE third_party_shipper_handover
SET hub_code = 'HUB-NT2-DN', manifest_parcel_count = 3, manifest_total_weight_kg = 940.0, manifest_ingested = TRUE, manifest_ingested_at = NOW() - INTERVAL '45 minutes'
WHERE container_code = 'CCLU-619284-5';

-- 6. Seed Đội ngũ Shipper tại từng Trụ sở (mỗi Shipper được phân công 1 vị trí/tuyến cố định quanh Trụ sở)
INSERT INTO hub_local_shipper (
    id, shipper_code, hub_code, full_name, phone, vehicle_type, vehicle_plate,
    assigned_zone_name, assigned_lat, assigned_lng, coverage_radius_km,
    current_lat, current_lng, cold_chain_capable, max_capacity_kg, current_load_kg,
    active_item_count, shift_status, rating
) VALUES
-- Trụ sở HUB-AMATA-BH (Biên Hòa)
(
    '66666666-6666-4666-8666-666666660101', 'SHP-BH-101', 'HUB-AMATA-BH',
    'Đặng Quốc Bảo', '0902 418 229', 'EV_VAN_COLD_1500KG', '60C-192.45',
    'Phân khu Bắc KCN Amata & Kho Lạnh Long Bình', 10.9520, 106.8965, 2.2,
    10.9508, 106.8952, TRUE, 1500.0, 240.0, 1, 'AVAILABLE', 4.96
),
(
    '66666666-6666-4666-8666-666666660102', 'SHP-BH-102', 'HUB-AMATA-BH',
    'Võ Minh Khang', '0908 773 910', 'EV_VAN_COLD_1500KG', '60C-338.12',
    'Phân khu Nam Amata & Cụm Thương Mại Tam Hiệp', 10.9385, 106.8845, 2.4,
    10.9396, 106.8858, TRUE, 1500.0, 180.0, 1, 'AVAILABLE', 4.91
),
(
    '66666666-6666-4666-8666-666666660103', 'SHP-BH-103', 'HUB-AMATA-BH',
    'Huỳnh Gia Huy', '0933 612 804', 'EV_TRUCK_LIGHT_2000KG', '60C-510.88',
    'Phân khu Đông Amata & Khu Công Nghiệp Loteco', 10.9440, 106.9060, 2.5,
    10.9451, 106.9044, FALSE, 2000.0, 320.0, 1, 'AVAILABLE', 4.88
),
-- Trụ sở HUB-SHTP-Q9 (TP. Thủ Đức)
(
    '66666666-6666-4666-8666-666666660201', 'SHP-Q9-201', 'HUB-SHTP-Q9',
    'Trương Hoàng Phúc', '0919 304 512', 'EV_VAN_ESD_1500KG', '51D-819.20',
    'Phân khu Bán dẫn & Điện tử Lõi SHTP (Đường D1 - D2)', 10.8588, 106.7885, 2.0,
    10.8579, 106.7878, TRUE, 1500.0, 150.0, 1, 'AVAILABLE', 4.98
),
(
    '66666666-6666-4666-8666-666666660202', 'SHP-Q9-202', 'HUB-SHTP-Q9',
    'Lâm Tấn Phát', '0977 821 440', 'EV_TRUCK_LIGHT_2000KG', '51D-902.11',
    'Phân khu R&D Nam SHTP & Cụm Kho ngoại quan Phú Hữu', 10.8465, 106.7810, 2.5,
    10.8472, 106.7821, FALSE, 2000.0, 280.0, 1, 'AVAILABLE', 4.92
),
(
    '66666666-6666-4666-8666-666666660203', 'SHP-Q9-203', 'HUB-SHTP-Q9',
    'Phan Thanh Tùng', '0904 115 678', 'EV_VAN_COLD_1500KG', '51D-774.66',
    'Phân khu Đông SHTP & Khu Công Nghệ Long Thạnh Mỹ', 10.8530, 106.7985, 2.3,
    10.8525, 106.7972, TRUE, 1500.0, 90.0, 0, 'AVAILABLE', 4.94
),
-- Trụ sở HUB-VSIP1-BD (Bình Dương)
(
    '66666666-6666-4666-8666-666666660301', 'SHP-BD-301', 'HUB-VSIP1-BD',
    'Nguyễn Thành Đạt', '0938 920 115', 'EV_TRUCK_LIGHT_2000KG', '61C-612.09',
    'Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1', 10.9315, 106.7165, 2.2,
    10.9308, 106.7158, FALSE, 2000.0, 480.0, 1, 'AVAILABLE', 4.95
),
(
    '66666666-6666-4666-8666-666666660302', 'SHP-BD-302', 'HUB-VSIP1-BD',
    'Bùi Tuấn Kiệt', '0963 440 289', 'EV_VAN_COLD_1500KG', '61C-705.41',
    'Tuyến Nam VSIP 1 - Cụm Kho Lạnh & Siêu thị Bình Hòa', 10.9210, 106.7080, 2.4,
    10.9218, 106.7091, TRUE, 1500.0, 390.0, 1, 'AVAILABLE', 4.93
),
(
    '66666666-6666-4666-8666-666666660303', 'SHP-BD-303', 'HUB-VSIP1-BD',
    'Đỗ Hoàng Duy', '0915 608 332', 'EV_TRUCK_LIGHT_2000KG', '61C-819.77',
    'Tuyến Bắc VSIP 1 - Cụm Logistics An Phú & Việt Hương', 10.9370, 106.7230, 2.5,
    10.9362, 106.7219, FALSE, 2000.0, 480.0, 1, 'AVAILABLE', 4.89
),
-- Trụ sở HUB-NT2-DN (Nhơn Trạch)
(
    '66666666-6666-4666-8666-666666660401', 'SHP-DN-401', 'HUB-NT2-DN',
    'Lý Minh Quân', '0909 514 820', 'EV_VAN_COLD_1500KG', '60C-881.20',
    'Phân khu Lạnh Trung tâm KCN Nhơn Trạch 2 (Đường 25B)', 10.7395, 106.8825, 2.5,
    10.7388, 106.8819, TRUE, 1500.0, 0.0, 0, 'AVAILABLE', 4.97
),
(
    '66666666-6666-4666-8666-666666660402', 'SHP-DN-402', 'HUB-NT2-DN',
    'Châu Gia Bảo', '0984 239 711', 'EV_VAN_COLD_1500KG', '60C-912.64',
    'Phân khu Nam Nhơn Trạch 2 & Cụm Chế biến Thực phẩm', 10.7290, 106.8730, 2.5,
    10.7301, 106.8742, TRUE, 1500.0, 0.0, 0, 'AVAILABLE', 4.94
),
(
    '66666666-6666-4666-8666-666666660403', 'SHP-DN-403', 'HUB-NT2-DN',
    'Mai Xuân Trường', '0937 190 543', 'EV_TRUCK_LIGHT_2000KG', '60C-740.18',
    'Phân khu Đông Nhơn Trạch & Tuyến Cảng Phước An', 10.7420, 106.8910, 2.8,
    10.7412, 106.8901, FALSE, 2000.0, 0.0, 0, 'AVAILABLE', 4.90
)
ON CONFLICT (shipper_code) DO NOTHING;

-- 7. Seed Danh mục Hàng hóa (Cargo Manifest Items) bên trong từng Container
INSERT INTO container_cargo_manifest_item (
    id, item_code, container_code, shipment_code, hub_code,
    cargo_name, cargo_category, consignee_name, consignee_phone,
    delivery_address, delivery_zone_name, delivery_lat, delivery_lng,
    weight_kg, parcel_count, required_temp_c, requires_cold_chain, sla_window,
    dispatch_status, assigned_shipper_code, assigned_shipper_name,
    proximity_distance_km, match_score, dispatch_reason
) VALUES
-- Container 1: TCKU-781920-4 -> HUB-AMATA-BH (Đang tới trụ sở, chờ gửi dữ liệu & tự động phân bổ theo vị trí Shipper)
(
    '77777777-7777-4777-8777-777777770101', 'WB-AMATA-8192-01', 'TCKU-781920-4', 'SHP-2026-8192', 'HUB-AMATA-BH',
    'Lô Tôm Sú Đông Lạnh IQF Minh Phú (32 Thùng Bảo Ôn)', 'COLD_FROZEN',
    'Nhà máy Chế biến Thủy sản CP Bắc Amata', '0251 3891 204',
    'Lô 12 Đường số 3, Khu Bắc KCN Amata, P. Long Bình, Biên Hòa',
    'Phân khu Bắc KCN Amata & Kho Lạnh Long Bình', 10.9532, 106.8978,
    420.0, 32, -18.0, TRUE, 'Trước 14:30 hôm nay',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),
(
    '77777777-7777-4777-8777-777777770102', 'WB-AMATA-8192-02', 'TCKU-781920-4', 'SHP-2026-8192', 'HUB-AMATA-BH',
    'Phi lê Cá Hồi Tươi Chilled & Hải sản Cao cấp (24 Kiện)', 'COLD_CHILLED',
    'Trung tâm Phân phối Lotte Mart Nam Amata - Tam Hiệp', '0251 3892 550',
    'Khu Thương mại Nam Amata, P. Tam Hiệp, TP. Biên Hòa',
    'Phân khu Nam Amata & Cụm Thương Mại Tam Hiệp', 10.9372, 106.8832,
    340.0, 24, -12.0, TRUE, 'Trước 15:00 hôm nay',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),
(
    '77777777-7777-4777-8777-777777770103', 'WB-AMATA-8192-03', 'TCKU-781920-4', 'SHP-2026-8192', 'HUB-AMATA-BH',
    'Bao bì Thực phẩm Khô & Thùng Carton Cách Nhiệt (18 Pallet)', 'FMCG_DRY',
    'Kho Đóng gói Xuất khẩu Nestlé Đông Amata (Loteco)', '0251 3895 771',
    'Đường số 9, Phân khu Đông Amata - Loteco, TP. Biên Hòa',
    'Phân khu Đông Amata & Khu Công Nghiệp Loteco', 10.9452, 106.9072,
    360.0, 18, 22.0, FALSE, 'Trước 16:00 hôm nay',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),

-- Container 2: MSKU-492018-7 -> HUB-SHTP-Q9 (Đang tới trụ sở SHTP Quận 9)
(
    '77777777-7777-4777-8777-777777770201', 'WB-SHTP-4920-01', 'MSKU-492018-7', 'SHP-2026-4920', 'HUB-SHTP-Q9',
    'Khay Wafer Bán dẫn & Cảm biến Quang học (15 Kiện Chống Tĩnh Điện)', 'HIGH_VALUE_TECH',
    'Nhà máy Intel Products Vietnam - Phân khu Lõi D1', '028 3736 2200',
    'Lô I-2 Đường D1, Khu Công Nghệ Cao Quận 9, TP. Thủ Đức',
    'Phân khu Bán dẫn & Điện tử Lõi SHTP (Đường D1 - D2)', 10.8595, 106.7892,
    290.0, 15, 20.0, TRUE, 'Ưu tiên SLA 60 phút',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),
(
    '77777777-7777-4777-8777-777777770202', 'WB-SHTP-4920-02', 'MSKU-492018-7', 'SHP-2026-4920', 'HUB-SHTP-Q9',
    'Linh kiện Bo mạch Điện tử & Vỏ Thiết bị Tự động hóa (22 Thùng)', 'FMCG_DRY',
    'Trung tâm R&D Nidec Nam SHTP', '028 3736 0911',
    'Lô E-4 Đường D9, Phân khu Nam SHTP, TP. Thủ Đức',
    'Phân khu R&D Nam SHTP & Cụm Kho ngoại quan Phú Hữu', 10.8458, 106.7802,
    330.0, 22, 24.0, FALSE, 'Trước 15:30 hôm nay',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),
(
    '77777777-7777-4777-8777-777777770203', 'WB-SHTP-4920-03', 'MSKU-492018-7', 'SHP-2026-4920', 'HUB-SHTP-Q9',
    'Hóa chất Bán dẫn Tinh khiết Bảo quản Lạnh (12 Bình Chuyên Dụng)', 'COLD_CHILLED',
    'Nhà máy Samsung HCMC CE Complex (Đông SHTP)', '028 3736 8888',
    'Lô I-11 Đường D15, Phân khu Đông SHTP, P. Long Thạnh Mỹ',
    'Phân khu Đông SHTP & Khu Công Nghệ Long Thạnh Mỹ', 10.8538, 106.7995,
    240.0, 12, 8.0, TRUE, 'Trước 14:45 hôm nay',
    'IN_CONTAINER', NULL, NULL, NULL, NULL, NULL
),

-- Container 3: CMAU-821903-2 -> HUB-VSIP1-BD (Đã gửi dữ liệu sang Trụ sở VSIP 1 & Đã phân công Shipper theo vị trí)
(
    '77777777-7777-4777-8777-777777770301', 'WB-VSIP-8219-01', 'CMAU-821903-2', 'SHP-2026-8219', 'HUB-VSIP1-BD',
    'Lô Hàng Tiêu Dùng Nhanh P&G (40 Thùng Master Carton)', 'FMCG_DRY',
    'Kho Phân Phối Trung Tâm P&G Đông Dương - Đại lộ Tự Do', '0274 3743 880',
    'Số 14 Đại lộ Tự Do, KCN VSIP 1, TP. Thuận An, Bình Dương',
    'Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1', 10.9324, 106.7174,
    480.0, 40, 25.0, FALSE, 'Đang giao trong ca chiều',
    'ASSIGNED_TO_SHIPPER', 'SHP-BD-301', 'Nguyễn Thành Đạt',
    0.14, 98.2, 'Gần vị trí phân công nhất (0.14 km) • Thuộc Tuyến Đại lộ Tự Do - Trung tâm KCN VSIP 1'
),
(
    '77777777-7777-4777-8777-777777770302', 'WB-VSIP-8219-02', 'CMAU-821903-2', 'SHP-2026-8219', 'HUB-VSIP1-BD',
    'Sữa Tươi & Chế phẩm Dinh dưỡng Bảo Ôn (28 Khay Lạnh)', 'COLD_CHILLED',
    'Siêu thị AEON Canary & Cụm Kho Lạnh Bình Hòa', '0274 3763 655',
    'Đại lộ Bình Dương, Khu Nam VSIP 1, P. Bình Hòa, Thuận An',
    'Tuyến Nam VSIP 1 - Cụm Kho Lạnh & Siêu thị Bình Hòa', 10.9201, 106.7072,
    390.0, 28, 4.0, TRUE, 'Ưu tiên chuỗi lạnh 4°C',
    'OUT_FOR_DELIVERY', 'SHP-BD-302', 'Bùi Tuấn Kiệt',
    0.13, 98.5, 'Gần vị trí phân công nhất (0.13 km) • Đạt chuẩn Xe Van Lạnh bảo ôn • Tuyến Nam VSIP 1'
),
(
    '77777777-7777-4777-8777-777777770303', 'WB-VSIP-8219-03', 'CMAU-821903-2', 'SHP-2026-8219', 'HUB-VSIP1-BD',
    'Nguyên liệu Đóng gói & Nhựa Kỹ thuật (30 Kiện)', 'FMCG_DRY',
    'Nhà máy Bao bì Tân Tiến Bắc VSIP 1 - An Phú', '0274 3711 402',
    'Đường số 6, Khu Bắc VSIP 1 - Giáp An Phú, Thuận An',
    'Tuyến Bắc VSIP 1 - Cụm Logistics An Phú & Việt Hương', 10.9378, 106.7239,
    480.0, 30, 25.0, FALSE, 'Trước 16:30 hôm nay',
    'ASSIGNED_TO_SHIPPER', 'SHP-BD-303', 'Đỗ Hoàng Duy',
    0.13, 98.3, 'Gần vị trí phân công nhất (0.13 km) • Thuộc Tuyến Bắc VSIP 1 - An Phú'
),

-- Container 4: CCLU-619284-5 -> HUB-NT2-DN (Đã hoàn tất giao tận nơi qua các Shipper của Trụ sở Nhơn Trạch 2)
(
    '77777777-7777-4777-8777-777777770401', 'WB-NT2-6192-01', 'CCLU-619284-5', 'SHP-2026-6192', 'HUB-NT2-DN',
    'Hải sản Xuất khẩu Đông Lạnh Sâu (-18°C • 26 Thùng)', 'COLD_FROZEN',
    'Kho Lạnh Thực phẩm Quốc tế Trung tâm Nhơn Trạch 2', '0251 3569 112',
    'Lô B2 Đường 25B, KCN Nhơn Trạch 2, H. Nhơn Trạch',
    'Phân khu Lạnh Trung tâm KCN Nhơn Trạch 2 (Đường 25B)', 10.7402, 106.8831,
    350.0, 26, -18.0, TRUE, 'Đã hoàn tất đúng SLA',
    'DELIVERED_POD', 'SHP-DN-401', 'Lý Minh Quân',
    0.10, 99.0, 'Gần vị trí phân công nhất (0.10 km) • Đã ký nhận POD tại Kho Lạnh Đường 25B'
),
(
    '77777777-7777-4777-8777-777777770402', 'WB-NT2-6192-02', 'CCLU-619284-5', 'SHP-2026-6192', 'HUB-NT2-DN',
    'Nguyên liệu Chế biến Thực phẩm Lạnh (20 Thùng)', 'COLD_CHILLED',
    'Nhà máy Thực phẩm Ajinomoto Nam Nhơn Trạch 2', '0251 3569 408',
    'Đường số 7, Phân khu Nam KCN Nhơn Trạch 2, Đồng Nai',
    'Phân khu Nam Nhơn Trạch 2 & Cụm Chế biến Thực phẩm', 10.7284, 106.8722,
    290.0, 20, -10.0, TRUE, 'Đã hoàn tất đúng SLA',
    'DELIVERED_POD', 'SHP-DN-402', 'Châu Gia Bảo',
    0.11, 98.8, 'Gần vị trí phân công nhất (0.11 km) • Đã ký nhận POD tại Khu Nam Nhơn Trạch 2'
),
(
    '77777777-7777-4777-8777-777777770403', 'WB-NT2-6192-03', 'CCLU-619284-5', 'SHP-2026-6192', 'HUB-NT2-DN',
    'Vật tư Đóng gói & Pallet Nhựa Xuất khẩu (15 Kiện)', 'FMCG_DRY',
    'Trung tâm Logistics Đông Nhơn Trạch - Phước An', '0251 3569 890',
    'Đường Tôn Đức Thắng nối dài, Đông Nhơn Trạch, Đồng Nai',
    'Phân khu Đông Nhơn Trạch & Tuyến Cảng Phước An', 10.7428, 106.8918,
    300.0, 15, 24.0, FALSE, 'Đã hoàn tất đúng SLA',
    'DELIVERED_POD', 'SHP-DN-403', 'Mai Xuân Trường',
    0.12, 98.6, 'Gần vị trí phân công nhất (0.12 km) • Đã ký nhận POD tại Khu Đông Nhơn Trạch'
)
ON CONFLICT (item_code) DO NOTHING;

