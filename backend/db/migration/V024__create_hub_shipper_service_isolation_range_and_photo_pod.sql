-- ==============================================================================
-- Migration: V024__create_hub_shipper_service_isolation_range_and_photo_pod.sql
-- Description: Tạo schema chuyên biệt cho microservice mới hub-shipper-service (:8089):
--              1. Cô lập dữ liệu theo Trụ sở (Hub-bound Account Isolation) - bao gồm
--                 Trụ sở Đình Bảng, Từ Sơn, Bắc Ninh (HUB-DINHBANG-BN) & các trụ sở khu vực.
--              2. Chính sách vận hành & bảo mật dữ liệu riêng cho Shipper (hub_shipper_policy).
--              3. Giao nhiệm vụ theo dải mã số hàng hóa (hub_task_range_assignment: từ mã -> tới mã).
--              4. Chi tiết hàng hóa đầy đủ: Người gửi (Sender) + Người nhận (Receiver) +
--                 Địa điểm (Location) + Trạng thái (Status) + Tracking + Hình ảnh xác thực (Photo POD).
-- ==============================================================================

-- 1. Bổ sung Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh vào local_distribution_hub
INSERT INTO local_distribution_hub (
    id, hub_code, hub_name, company_name, external_system_name,
    webhook_endpoint, address, district_zone, center_lat, center_lng, coverage_radius_km
) VALUES (
    '55555555-5555-4555-8555-555555550000', 'HUB-DINHBANG-BN',
    'Trụ sở Giao nhận Đình Bảng • Từ Sơn, Bắc Ninh', 'ViettelPost & Kinh Bắc 3PL Hub',
    'VTP SmartHub DMS Bắc Ninh v4', 'https://dms-bacninh.viettelpost.example.vn/webhooks/ccadro/handover',
    'Đường Trần Phú, P. Đình Bảng, TP. Từ Sơn, Tỉnh Bắc Ninh',
    'P. Đình Bảng - KCN Tiên Sơn - KCN VSIP Bắc Ninh - Phố Mới',
    21.1145, 105.9585, 5.5
)
ON CONFLICT (hub_code) DO NOTHING;

-- 2. Bổ sung cột liên kết tài khoản đăng nhập (account_username) và phạm vi giao hàng hôm nay vào hub_local_shipper
ALTER TABLE hub_local_shipper
    ADD COLUMN IF NOT EXISTS account_username VARCHAR(80),
    ADD COLUMN IF NOT EXISTS today_delivery_scope VARCHAR(255),
    ADD COLUMN IF NOT EXISTS assigned_code_range_from VARCHAR(50),
    ADD COLUMN IF NOT EXISTS assigned_code_range_to VARCHAR(50);

-- Seed đội ngũ Shipper thuộc Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh (HUB-DINHBANG-BN)
INSERT INTO hub_local_shipper (
    id, shipper_code, hub_code, account_username, full_name, phone,
    vehicle_type, vehicle_plate, assigned_zone_name,
    assigned_lat, assigned_lng, coverage_radius_km,
    current_lat, current_lng, cold_chain_capable, max_capacity_kg, current_load_kg,
    active_item_count, shift_status, rating,
    today_delivery_scope, assigned_code_range_from, assigned_code_range_to
) VALUES
(
    '66666666-6666-4666-8666-666666660001', 'SHP-BN-001', 'HUB-DINHBANG-BN', 'shipper',
    'Nguyễn Văn Bắc', '0978 312 689', 'Xe Van Lạnh EV 1.5T', '99C-182.68',
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn',
    21.1168, 105.9612, 2.2,
    21.1160, 105.9604, TRUE, 1500.0, 480.0,
    3, 'AVAILABLE', 4.98,
    'Phường Đình Bảng (Khu phố Thượng, Khu phố Hạ, Đường Trần Phú) & Cụm KCN Tiên Sơn Cổng Bắc',
    'PKG-DB-0001', 'PKG-DB-0003'
),
(
    '66666666-6666-4666-8666-666666660002', 'SHP-BN-002', 'HUB-DINHBANG-BN', 'shipper_bn2',
    'Trần Đình Sơn', '0982 604 115', 'Xe Tải Nhẹ EV 2.0T', '99C-245.19',
    'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng',
    21.0985, 105.9710, 2.5,
    21.0992, 105.9701, FALSE, 2000.0, 520.0,
    2, 'AVAILABLE', 4.94,
    'Khu Công Nghiệp VSIP Bắc Ninh (Đường số 1 - số 6), Xã Phù Chẩn, TP. Từ Sơn',
    'PKG-DB-0004', 'PKG-DB-0005'
),
(
    '66666666-6666-4666-8666-666666660003', 'SHP-BN-003', 'HUB-DINHBANG-BN', 'shipper_bn3',
    'Lê Hoàng Kinh Bắc', '0916 882 309', 'Xe Van Lạnh EV 1.5T', '99C-309.77',
    'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn',
    21.1240, 105.9510, 2.3,
    21.1232, 105.9520, TRUE, 1500.0, 210.0,
    1, 'AVAILABLE', 4.95,
    'Phường Đồng Nguyên, Chợ Giầu, Khu đô thị Đền Đô, TP. Từ Sơn',
    'PKG-DB-0006', 'PKG-DB-0006'
)
ON CONFLICT (shipper_code) DO UPDATE SET
    account_username = EXCLUDED.account_username,
    today_delivery_scope = EXCLUDED.today_delivery_scope,
    assigned_code_range_from = EXCLUDED.assigned_code_range_from,
    assigned_code_range_to = EXCLUDED.assigned_code_range_to;

-- Cập nhật phạm vi giao hàng hôm nay và dải mã số cho các Shipper ở các Trụ sở khác
UPDATE hub_local_shipper
SET account_username = 'shipper_amata',
    today_delivery_scope = 'Phân khu Bắc KCN Amata (Đường số 1 - số 5) & Kho Lạnh Long Bình, TP. Biên Hòa',
    assigned_code_range_from = 'WB-AMATA-8192-01',
    assigned_code_range_to = 'WB-AMATA-8192-01'
WHERE shipper_code = 'SHP-BH-101';

UPDATE hub_local_shipper
SET today_delivery_scope = 'Phân khu Nam Amata & Cụm Thương mại Siêu thị Tam Hiệp, TP. Biên Hòa',
    assigned_code_range_from = 'WB-AMATA-8192-02',
    assigned_code_range_to = 'WB-AMATA-8192-02'
WHERE shipper_code = 'SHP-BH-102';

UPDATE hub_local_shipper
SET today_delivery_scope = 'Phân khu Đông Amata & Khu Công Nghiệp Loteco, TP. Biên Hòa',
    assigned_code_range_from = 'WB-AMATA-8192-03',
    assigned_code_range_to = 'WB-AMATA-8192-03'
WHERE shipper_code = 'SHP-BH-103';

-- 3. Bảng Chính sách Dữ liệu & Quy định Vận hành theo Trụ sở dành cho Shipper (hub_shipper_policy)
CREATE TABLE IF NOT EXISTS hub_shipper_policy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_code VARCHAR(40) NOT NULL UNIQUE,
    policy_code VARCHAR(60) NOT NULL UNIQUE,
    policy_title VARCHAR(200) NOT NULL,
    data_isolation_rule VARCHAR(300) NOT NULL,
    photo_pod_rule VARCHAR(300) NOT NULL,
    temperature_sla_rule VARCHAR(300) NOT NULL,
    cod_and_pricing_rule VARCHAR(300) NOT NULL,
    max_daily_radius_km DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    sla_delivery_minutes INT NOT NULL DEFAULT 120,
    require_photo_pod BOOLEAN NOT NULL DEFAULT TRUE,
    require_recipient_signature BOOLEAN NOT NULL DEFAULT TRUE,
    hide_b2b_contract_value BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hub_shipper_policy (
    hub_code, policy_code, policy_title,
    data_isolation_rule, photo_pod_rule, temperature_sla_rule, cod_and_pricing_rule,
    max_daily_radius_km, sla_delivery_minutes, require_photo_pod, require_recipient_signature, hide_b2b_contract_value
) VALUES
(
    'HUB-DINHBANG-BN', 'POL-HUB-DINHBANG-2026',
    'Chính sách Bảo mật & Giao nhận Nội khu — Trụ sở Đình Bảng, Từ Sơn, Bắc Ninh',
    'Tài khoản Shipper thuộc Trụ sở Đình Bảng (HUB-DINHBANG-BN) chỉ được truy cập danh sách hàng hóa, phạm vi giao hàng và dải mã kiện hàng thuộc Trụ sở Đình Bảng. Nghiêm cấm truy xuất dữ liệu của trụ sở khác.',
    'Bắt buộc chụp tối thiểu 01 ảnh thực tế kiện hàng tại điểm giao (rõ tem mã vạch PKG-DB-* và biển hiệu/kho người nhận) trước khi bấm Hoàn tất POD.',
    'Hàng linh kiện điện tử & thực phẩm lạnh phải duy trì thùng bảo ôn kín, giao trong vòng 90 phút kể từ lúc xuất kho Trụ sở Đình Bảng.',
    'Shipper chỉ nhìn thấy thông tin Người gửi, Người nhận, Địa điểm, Khối lượng và Trạng thái giao nhận; hệ thống tự động ẩn toàn bộ giá trị Hợp đồng B2B của Chủ hàng (Customer).',
    2.5, 90, TRUE, TRUE, TRUE
),
(
    'HUB-AMATA-BH', 'POL-HUB-AMATA-2026',
    'Chính sách Vận hành Chuỗi Lạnh & Phân Tuyến — Trụ sở KCN Amata Biên Hòa',
    'Cô lập dữ liệu 100% trong phạm vi Trụ sở Amata Biên Hòa (HUB-AMATA-BH). Shipper chỉ nhận và xử lý các kiện hàng trong dải mã được giao.',
    'Bắt buộc đính kèm hình ảnh kiện hàng tại Dock nhận và chữ ký xác nhận của thủ kho nhà máy.',
    'Duy trì nhiệt độ thùng xe Van lạnh từ -18°C đến -12°C đối với hàng thủy sản đông lạnh.',
    'Ẩn chi phí cước B2B và hạn mức tín dụng Net-30 của Chủ hàng.',
    2.5, 120, TRUE, TRUE, TRUE
),
(
    'HUB-SHTP-Q9', 'POL-HUB-SHTP-2026',
    'Chính sách Giao nhận Công nghệ Cao ESD — Trụ sở Khu Công Nghệ Cao Quận 9',
    'Tài khoản Shipper chỉ được phép xem dữ liệu hàng hóa thuộc Trụ sở SHTP Quận 9 (HUB-SHTP-Q9).',
    'Bắt buộc chụp ảnh niêm phong ESD và biên bản bàn giao tại cổng Cleanroom.',
    'Đảm bảo độ ẩm < 45% và nhiệt độ 20°C ± 2°C cho khay Wafer bán dẫn.',
    'Bảo mật tuyệt đối giá trị lô hàng công nghệ cao và hợp đồng vận chuyển.',
    2.2, 60, TRUE, TRUE, TRUE
),
(
    'HUB-VSIP1-BD', 'POL-HUB-VSIP1-2026',
    'Chính sách Phân phối FMCG & Siêu thị — Trụ sở VSIP 1 Thuận An, Bình Dương',
    'Cô lập dữ liệu nội bộ Trụ sở VSIP 1 (HUB-VSIP1-BD) theo tài khoản Shipper.',
    'Bắt buộc chụp ảnh kiện hàng nguyên đai nguyên kiện tại quầy tiếp nhận.',
    'Tuân thủ chuẩn bảo quản mát 4°C cho nhóm hàng sữa và thực phẩm.',
    'Chỉ hiển thị dữ liệu vận hành giao nhận, ẩn dữ liệu tài chính B2B.',
    2.5, 120, TRUE, TRUE, TRUE
),
(
    'HUB-NT2-DN', 'POL-HUB-NT2-2026',
    'Chính sách Kho Lạnh Xuất Khẩu — Trụ sở KCN Nhơn Trạch 2, Đồng Nai',
    'Cô lập dữ liệu nội bộ Trụ sở Nhơn Trạch 2 (HUB-NT2-DN) theo khu vực phân công.',
    'Bắt buộc lưu trữ ảnh chụp POD kèm tọa độ GPS và thời gian thực.',
    'Kiểm soát nhiệt độ âm sâu -18°C xuyên suốt chặng cuối.',
    'Chỉ hiển thị thông tin vận đơn giao nhận chặng cuối.',
    2.8, 120, TRUE, TRUE, TRUE
)
ON CONFLICT (hub_code) DO NOTHING;

-- 4. Bổ sung thông tin Người gửi (Sender), Số thứ tự mã kiện (sequence_no),
--    Tracking lịch sử và Hình ảnh bằng chứng giao hàng (proof_image_url) vào container_cargo_manifest_item
ALTER TABLE container_cargo_manifest_item
    ADD COLUMN IF NOT EXISTS sequence_no INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(180),
    ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS sender_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
    ADD COLUMN IF NOT EXISTS proof_image_caption VARCHAR(255),
    ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tracking_history_json TEXT;

-- 5. Bảng Phiếu Giao Nhiệm Vụ Theo Dải Mã Số Kiện Hàng (hub_task_range_assignment)
CREATE TABLE IF NOT EXISTS hub_task_range_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code VARCHAR(60) NOT NULL UNIQUE,
    hub_code VARCHAR(40) NOT NULL,
    shipper_code VARCHAR(40) NOT NULL,
    shipper_name VARCHAR(150) NOT NULL,
    from_item_code VARCHAR(50) NOT NULL,
    to_item_code VARCHAR(50) NOT NULL,
    total_items INT NOT NULL DEFAULT 1,
    total_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    assigned_zone_scope VARCHAR(255) NOT NULL,
    batch_status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE_IN_SHIFT',
    assigned_by VARCHAR(100) NOT NULL DEFAULT 'HUB_AUTO_DISPATCHER',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_range_hub ON hub_task_range_assignment(hub_code);
CREATE INDEX IF NOT EXISTS idx_task_range_shipper ON hub_task_range_assignment(shipper_code);

-- 6. Thêm Container cập Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh
INSERT INTO third_party_shipper_handover (
    id, container_code, shipment_code, hub_code, destination_hub, shipper_company,
    external_system_name, external_tracking_ref, webhook_endpoint,
    dock_gate, handover_status, manifest_parcel_count, manifest_total_weight_kg,
    manifest_ingested, manifest_ingested_at, last_sync_status, last_synced_at
) VALUES (
    '44444444-4444-4444-8444-444444440000', 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Trụ sở Đình Bảng • TP. Từ Sơn, Bắc Ninh', 'ViettelPost & Kinh Bắc 3PL Hub',
    'VTP SmartHub DMS Bắc Ninh v4', 'BN-DINHBANG-9901',
    'https://dms-bacninh.viettelpost.example.vn/webhooks/ccadro/handover',
    'Cổng A1 • Băng chuyền Phân tuyến Từ Sơn', 'AT_GATE_DOCKED', 6, 1210.0,
    TRUE, NOW() - INTERVAL '25 minutes', 'MANIFEST_INGESTED', NOW() - INTERVAL '20 minutes'
)
ON CONFLICT (container_code) DO NOTHING;

-- 7. Seed 6 kiện hàng (PKG-DB-0001 -> PKG-DB-0006) thuộc Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh
INSERT INTO container_cargo_manifest_item (
    id, item_code, sequence_no, container_code, shipment_code, hub_code,
    cargo_name, cargo_category,
    sender_name, sender_phone, sender_address,
    consignee_name, consignee_phone, delivery_address, delivery_zone_name,
    delivery_lat, delivery_lng, weight_kg, parcel_count, required_temp_c, requires_cold_chain, sla_window,
    dispatch_status, assigned_shipper_code, assigned_shipper_name,
    proximity_distance_km, match_score, dispatch_reason,
    proof_image_url, proof_image_caption, proof_uploaded_at, delivered_at, recipient_pod_name, tracking_history_json
) VALUES
(
    '77777777-7777-4777-8777-777777770001', 'PKG-DB-0001', 1, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Lô Thực phẩm Lạnh Cao Cấp CP Foods (18 Thùng Bảo Ôn)', 'COLD_FROZEN',
    'Nhà máy Chế biến Thực phẩm CP Hải Dương', '0220 3852 119', 'KCN Tân Trường, Cẩm Giàng, Hải Dương',
    'Siêu thị Dabaco Từ Sơn - Chi nhánh Đình Bảng', '0222 3741 882',
    'Số 45 Đường Trần Phú, P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn', 21.1172, 105.9618,
    180.0, 18, -15.0, TRUE, 'Giao trước 11:30 hôm nay',
    'DELIVERED_POD', 'SHP-BN-001', 'Nguyễn Văn Bắc',
    0.08, 99.4, 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Cách vị trí phân công 0.08 km tại P. Đình Bảng',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
    'Ảnh chụp thực tế 18 thùng bảo ôn CP Foods bàn giao tại Kho nhận Siêu thị Dabaco Đình Bảng (Đã kiểm đủ niêm phong)',
    NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '35 minutes', 'Lê Thị Mai (Quản lý Kho Dabaco Đình Bảng)',
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0001 -> PKG-DB-0003 cho Shipper Nguyễn Văn Bắc","time":"08:30"},{"step":"OUT_FOR_DELIVERY","title":"Shipper xuất phát giao tuyến P. Đình Bảng","time":"09:05"},{"step":"DELIVERED_POD","title":"Đã giao thành công & Tải lên ảnh xác thực POD","time":"09:45"}]'
),
(
    '77777777-7777-4777-8777-777777770002', 'PKG-DB-0002', 2, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Thiết bị Điện tử & Cảm biến Tự động hóa Omron (12 Kiện)', 'HIGH_VALUE_TECH',
    'Trung tâm Phân phối Kỹ thuật Bắc Hà Nội', '024 3768 9001', 'KCN Bắc Thăng Long, Đông Anh, Hà Nội',
    'Nhà máy Cơ khí Chính xác Tiên Sơn - Cổng Bắc Đình Bảng', '0222 3839 405',
    'Lô B4 Đường TS5, Cụm Bắc KCN Tiên Sơn (Giáp P. Đình Bảng), Từ Sơn, Bắc Ninh',
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn', 21.1159, 105.9601,
    160.0, 12, 22.0, FALSE, 'Giao trước 14:00 hôm nay',
    'OUT_FOR_DELIVERY', 'SHP-BN-001', 'Nguyễn Văn Bắc',
    0.15, 98.8, 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Cách vị trí phân công 0.15 km tại Đình Bảng',
    NULL, NULL, NULL, NULL, NULL,
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0001 -> PKG-DB-0003 cho Shipper Nguyễn Văn Bắc","time":"08:30"},{"step":"OUT_FOR_DELIVERY","title":"Shipper đang trên đường giao tới Cổng Bắc KCN Tiên Sơn - Đình Bảng","time":"10:10"}]'
),
(
    '77777777-7777-4777-8777-777777770003', 'PKG-DB-0003', 3, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Dược phẩm & Vật tư Y tế Bảo Ôn Mát 4°C (10 Thùng)', 'COLD_CHILLED',
    'Tổng Kho Dược Phẩm Trung Ương 1 Hà Nội', '024 3825 4567', 'Đường Giải Phóng, Q. Hoàng Mai, Hà Nội',
    'Trung tâm Y tế & Hệ thống Nhà thuốc Phố Mới Từ Sơn', '0222 3745 112',
    'Số 128 Khu phố Thượng, P. Đình Bảng, TP. Từ Sơn, Bắc Ninh',
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn', 21.1178, 105.9625,
    140.0, 10, 4.0, TRUE, 'Giao trước 15:00 hôm nay',
    'ASSIGNED_TO_SHIPPER', 'SHP-BN-001', 'Nguyễn Văn Bắc',
    0.18, 98.5, 'Giao theo dải mã PKG-DB-0001 -> PKG-DB-0003 • Cách vị trí phân công 0.18 km • Đạt chuẩn bảo ôn 4°C',
    NULL, NULL, NULL, NULL, NULL,
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0001 -> PKG-DB-0003 cho Shipper Nguyễn Văn Bắc","time":"08:30"}]'
),
(
    '77777777-7777-4777-8777-777777770004', 'PKG-DB-0004', 4, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Bao bì Carton & Nhựa Công nghiệp Samsung Vendor (25 Kiện)', 'FMCG_DRY',
    'Công ty Bao bì Quốc tế Hải Phòng', '0225 3842 990', 'KCN Đình Vũ, Q. Hải An, Hải Phòng',
    'Nhà máy Điện tử DreamTech KCN VSIP Bắc Ninh', '0222 3765 200',
    'Số 9 Đại lộ Hữu Nghị, KCN VSIP Bắc Ninh, X. Phù Chẩn, TP. Từ Sơn',
    'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng', 21.0991, 105.9718,
    280.0, 25, 25.0, FALSE, 'Giao trước 15:30 hôm nay',
    'DELIVERED_POD', 'SHP-BN-002', 'Trần Đình Sơn',
    0.11, 99.1, 'Giao theo dải mã PKG-DB-0004 -> PKG-DB-0005 • Cách vị trí phân công 0.11 km tại VSIP Bắc Ninh',
    'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',
    'Ảnh chụp 25 kiện bao bì bàn giao tại Cổng Inbound B2 Nhà máy DreamTech VSIP Bắc Ninh',
    NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes', 'Phạm Tuấn Anh (Thủ kho DreamTech VSIP)',
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0004 -> PKG-DB-0005 cho Shipper Trần Đình Sơn","time":"08:35"},{"step":"OUT_FOR_DELIVERY","title":"Shipper xuất phát đi tuyến KCN VSIP Bắc Ninh","time":"09:15"},{"step":"DELIVERED_POD","title":"Đã giao hoàn tất & Kèm ảnh xác thực tại kho nhận","time":"10:05"}]'
),
(
    '77777777-7777-4777-8777-777777770005', 'PKG-DB-0005', 5, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Linh kiện Cơ khí Chính xác & Khuôn đúc (16 Thùng Gỗ)', 'FMCG_DRY',
    'Nhà máy Cơ khí Đông Anh Hà Nội', '024 3883 2210', 'QL3, H. Đông Anh, Hà Nội',
    'Công ty TNHH Công nghiệp Foster Bắc Ninh', '0222 3765 889',
    'Đường số 3, KCN VSIP Bắc Ninh, TP. Từ Sơn, Bắc Ninh',
    'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng', 21.0978, 105.9702,
    240.0, 16, 25.0, FALSE, 'Giao trước 16:00 hôm nay',
    'ASSIGNED_TO_SHIPPER', 'SHP-BN-002', 'Trần Đình Sơn',
    0.11, 99.0, 'Giao theo dải mã PKG-DB-0004 -> PKG-DB-0005 • Cách vị trí phân công 0.11 km tại VSIP Bắc Ninh',
    NULL, NULL, NULL, NULL, NULL,
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0004 -> PKG-DB-0005 cho Shipper Trần Đình Sơn","time":"08:35"}]'
),
(
    '77777777-7777-4777-8777-777777770006', 'PKG-DB-0006', 6, 'VNBN-202688-1', 'SHP-2026-9901', 'HUB-DINHBANG-BN',
    'Sữa Tươi & Sản phẩm Dinh dưỡng Bảo Ôn Mát (20 Khay)', 'COLD_CHILLED',
    'Nhà máy Sữa Tiên Sơn Vinamilk Bắc Ninh', '0222 3839 111', 'KCN Tiên Sơn, Tiên Du, Bắc Ninh',
    'Siêu thị Từ Sơn Mart - Khu đô thị Đồng Nguyên', '0222 3748 668',
    'Đường Nguyễn Văn Cừ, P. Đồng Nguyên, TP. Từ Sơn, Bắc Ninh',
    'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn', 21.1246, 105.9518,
    210.0, 20, 4.0, TRUE, 'Giao trước 16:30 hôm nay',
    'ASSIGNED_TO_SHIPPER', 'SHP-BN-003', 'Lê Hoàng Kinh Bắc',
    0.11, 99.1, 'Giao theo dải mã PKG-DB-0006 -> PKG-DB-0006 • Cách vị trí phân công 0.11 km tại P. Đồng Nguyên',
    NULL, NULL, NULL, NULL, NULL,
    '[{"step":"CONTAINER_ARRIVED_HUB","title":"Container VNBN-202688-1 cập Trụ sở Đình Bảng","time":"08:15"},{"step":"RANGE_ASSIGNED","title":"Giao nhiệm vụ dải mã PKG-DB-0006 -> PKG-DB-0006 cho Shipper Lê Hoàng Kinh Bắc","time":"08:40"}]'
)
ON CONFLICT (item_code) DO NOTHING;

-- Cập nhật thông tin Người gửi (Sender) và ảnh POD cho các kiện hàng ở các Trụ sở phía Nam
UPDATE container_cargo_manifest_item
SET sequence_no = 1,
    sender_name = 'Tập đoàn Thủy sản Minh Phú Cà Mau',
    sender_phone = '0290 3839 391',
    sender_address = 'KCN Phường 8, TP. Cà Mau (Qua Cảng Cát Lái)'
WHERE item_code LIKE 'WB-AMATA-%';

UPDATE container_cargo_manifest_item
SET sequence_no = 1,
    sender_name = 'Kho Ngoại Quan Sân Bay Quốc Tế Tân Sơn Nhất (SCSC)',
    sender_phone = '028 3997 6888',
    sender_address = '30 Phan Thúc Duyện, Q. Tân Bình, TP.HCM'
WHERE item_code LIKE 'WB-SHTP-%';

UPDATE container_cargo_manifest_item
SET sequence_no = 1,
    sender_name = 'Cảng Quốc tế Cát Lái (Tân Cảng Sài Gòn)',
    sender_phone = '028 3742 2234',
    sender_address = 'Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức'
WHERE item_code LIKE 'WB-VSIP-%';

UPDATE container_cargo_manifest_item
SET sequence_no = 1,
    sender_name = 'Cảng Quốc tế Cái Mép - Thị Vải (CMIT)',
    sender_phone = '0254 3938 222',
    sender_address = 'KCN Cái Mép, TX. Phú Mỹ, Bà Rịa - Vũng Tàu',
    proof_image_url = 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=900&q=80',
    proof_image_caption = 'Ảnh chụp xác thực bàn giao kiện hàng lạnh tại Dock C-01 KCN Nhơn Trạch 2',
    proof_uploaded_at = NOW() - INTERVAL '40 minutes'
WHERE item_code LIKE 'WB-NT2-%';

-- Seed các Phiếu Giao Nhiệm Vụ Theo Dải Mã Số tại Trụ sở Đình Bảng - Từ Sơn - Bắc Ninh
INSERT INTO hub_task_range_assignment (
    batch_code, hub_code, shipper_code, shipper_name,
    from_item_code, to_item_code, total_items, total_weight_kg,
    assigned_zone_scope, batch_status, assigned_by
) VALUES
(
    'BATCH-DB-2026-01', 'HUB-DINHBANG-BN', 'SHP-BN-001', 'Nguyễn Văn Bắc',
    'PKG-DB-0001', 'PKG-DB-0003', 3, 480.0,
    'Tuyến 01: P. Đình Bảng - Đền Đô - Phố Mới Từ Sơn', 'ACTIVE_IN_SHIFT', 'TRƯỞNG BƯU CỤC ĐÌNH BẢNG'
),
(
    'BATCH-DB-2026-02', 'HUB-DINHBANG-BN', 'SHP-BN-002', 'Trần Đình Sơn',
    'PKG-DB-0004', 'PKG-DB-0005', 2, 520.0,
    'Tuyến 02: KCN VSIP Bắc Ninh - Phù Chẩn - Đại Đồng', 'ACTIVE_IN_SHIFT', 'TRƯỞNG BƯU CỤC ĐÌNH BẢNG'
),
(
    'BATCH-DB-2026-03', 'HUB-DINHBANG-BN', 'SHP-BN-003', 'Lê Hoàng Kinh Bắc',
    'PKG-DB-0006', 'PKG-DB-0006', 1, 210.0,
    'Tuyến 03: P. Đồng Nguyên - Trang Hạ - Chợ Giầu Từ Sơn', 'ACTIVE_IN_SHIFT', 'TRƯỞNG BƯU CỤC ĐÌNH BẢNG'
)
ON CONFLICT (batch_code) DO NOTHING;

