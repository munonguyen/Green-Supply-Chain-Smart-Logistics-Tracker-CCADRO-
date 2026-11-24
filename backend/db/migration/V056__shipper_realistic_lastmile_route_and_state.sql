-- ==============================================================================
-- Migration: V056__shipper_realistic_lastmile_route_and_state.sql
-- Description: Chuẩn hóa tọa độ đường phố thực tế tại Đình Bảng / Từ Sơn / KCN Tiên Sơn
--              tránh chồng lấp điểm dừng trên bản đồ số, đồng bộ trạng thái ca trực ON_DELIVERY.
-- ==============================================================================

UPDATE hub_local_shipper
SET
    shift_status = 'ON_DELIVERY',
    current_lat = 21.1156,
    current_lng = 105.9642,
    kyc_status = 'VERIFIED'
WHERE shipper_code = 'SHP-BN-001';

UPDATE container_cargo_manifest_item
SET
    delivery_lat = 21.1186,
    delivery_lng = 105.9576,
    proximity_distance_km = 0.42
WHERE item_code = 'PKG-DB-0001';

UPDATE container_cargo_manifest_item
SET
    delivery_lat = 21.1128,
    delivery_lng = 105.9688,
    proximity_distance_km = 0.91
WHERE item_code = 'PKG-DB-0002';

UPDATE container_cargo_manifest_item
SET
    delivery_lat = 21.1218,
    delivery_lng = 105.9654,
    proximity_distance_km = 0.71
WHERE item_code = 'PKG-DB-0003';

