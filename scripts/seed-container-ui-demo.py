#!/usr/bin/env python3
"""Opt-in, additive fixtures for the LOCAL container UI. Never runs at service startup.

Preview: python3 scripts/seed-container-ui-demo.py
Apply:   python3 scripts/seed-container-ui-demo.py --apply
Uses only the local ccadro-postgres Docker container / ccadro database. Existing
records are never overwritten. All people, plates, identifiers and PODs below
are synthetic; these are UI scenarios, not operational evidence.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
import subprocess
from uuid import UUID, uuid5

NAMESPACE = UUID('8e1fc035-3bf7-4849-b516-8f8388e53275')
NOW = datetime.now(timezone.utc)


def identifier(kind, code):
    return str(uuid5(NAMESPACE, kind + ':' + str(code)))


def container_code(serial):
    # Synthetic owner prefix; ISO-style check digit, not a registered BIC owner.
    values, number = {}, 10
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        if number % 11 == 0:
            number += 1
        values[letter], number = number, number + 1
    base = 'DEMU' + str(serial).zfill(6)
    total = sum((int(char) if char.isdigit() else values[char]) * 2 ** index
                for index, char in enumerate(base))
    return base + str((total % 11) % 10)


def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (float, int)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def insert(table, values):
    # Table/column names are fixed fixture definitions, never user input.
    return ('INSERT INTO ' + table + ' (' + ','.join(values) + ') VALUES ('
            + ','.join(literal(value) for value in values.values())
            + ') ON CONFLICT DO NOTHING;')


def fixtures():
    statements = []
    summaries = []
    statuses = ['AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'MAINTENANCE']
    for index, status in enumerate(statuses, 1):
        code = container_code(index)
        cold = status == 'IN_TRANSIT'
        assigned = status in {'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'}
        company = ('90000000-0000-0000-0000-000000000003', 'SAMSUNG_VN',
                   'Công ty TNHH Samsung Electronics Việt Nam') if index == 2 else (
                       '90000000-0000-0000-0000-000000000002', 'VINAMILK',
                       'CTCP Sữa Việt Nam (Vinamilk Logistics)')
        hub = 'HUB-SHTP-Q9' if index == 2 else 'HUB-VSIP1-BD'
        destination_lat, destination_lng = (10.845, 106.797) if index == 2 else (10.931215, 106.697426)
        destination = 'Trụ sở SHTP · Quận 9' if index == 2 else 'Trung tâm phân phối VSIP 1 · Thuận An'
        vehicle_id, driver_id = identifier('vehicle', index), identifier('driver', index)
        shipment_id = identifier('shipment', index)
        plate = '99C-900.0' + str(index)
        driver_name = 'Tài xế mô phỏng ' + str(index)
        phone = '000000000' + str(index)
        shipment_code = 'DEMO-SH-' + str(index).zfill(3)
        if assigned or status == 'MAINTENANCE':
            vehicle_status = {'ASSIGNED': 'ASSIGNED', 'IN_TRANSIT': 'IN_TRANSIT',
                              'DELIVERED': 'AVAILABLE', 'MAINTENANCE': 'MAINTENANCE'}[status]
            statements.append(insert('vehicle', dict(id=vehicle_id, vehicle_code='DEMO-VEH-' + str(index),
                plate_number=plate, fuel_type='DIESEL', euro_standard='EURO_5',
                max_payload_tons=28, empty_weight_tons=8, status=vehicle_status)))
        if assigned:
            statements.append(insert('driver', dict(id=driver_id, driver_code='DEMO-DRV-' + str(index),
                full_name=driver_name, phone=phone, license_number='DEMO-FC-' + str(index),
                license_class='FC', status='ON_TRIP' if cold else 'AVAILABLE',
                assigned_vehicle_plate=plate, pre_trip_passed=status != 'ASSIGNED',
                pre_trip_time='Mô phỏng cho UI' if status != 'ASSIGNED' else None)))
        container = dict(id=identifier('container', code), container_code=code,
            container_type='REEFER_40FT' if cold else 'DRY_40FT', iso_type='45R1' if cold else '45G1',
            owner_name='CCADRO DEMO · Thiết bị mô phỏng',
            responsible_company_id=company[0], responsible_company_code=company[1], responsible_company_name=company[2],
            tare_weight_tons=4.2 if cold else 3.8, max_payload_tons=26, cubic_capacity_m3=67.7,
            is_reefer=cold, status=status, e_seal_number='DEMO-SEAL-' + str(index) if assigned else None,
            e_seal_status='UNLOCKED' if status == 'DELIVERED' else 'LOCKED_SECURE' if assigned else None,
            e_seal_integrity_pct=100 if assigned else None, telematics_model='DEMO GPS / IoT Simulator',
            supply_air_temp_c=3.8 if cold else None, return_air_temp_c=4.2 if cold else None,
            humidity_pct=82 if cold else None, shock_g=0.12, solar_power_watts=18, battery_pct=94,
            last_latitude=10.91 if cold else destination_lat if status == 'DELIVERED' else 10.762622,
            last_longitude=106.72 if cold else destination_lng if status == 'DELIVERED' else 106.795677,
            last_location_name='ĐT 743 · Bình Dương (mô phỏng)' if cold else destination + ' (mô phỏng)' if status == 'DELIVERED' else 'Bãi kiểm tra CCADRO (mô phỏng)',
            progress_pct=62 if cold else 100 if status == 'DELIVERED' else 0,
            speed_kmh=42 if cold else 0, eta_minutes=35 if cold else None,
            assigned_shipment_id=shipment_id if assigned else None,
            assigned_shipment_code=shipment_code if assigned else None,
            assigned_vehicle_id=vehicle_id if assigned else None, vehicle_license_plate=plate if assigned else None,
            vehicle_type_label='Đầu kéo lạnh 40 feet' if cold else 'Đầu kéo 40 feet' if assigned else None,
            assigned_driver_id=driver_id if assigned else None, driver_name=driver_name if assigned else None,
            driver_phone=phone if assigned else None, driver_license='DEMO-FC-' + str(index) if assigned else None,
            driver_safety_score=4.8 if assigned else None, origin_name='Kho mô phỏng · Cát Lái' if assigned else None,
            destination_name=destination if assigned else None,
            completed_at=(NOW - timedelta(hours=2)).isoformat() if status == 'DELIVERED' else None,
            epod_recipient='Người nhận mô phỏng VSIP 1' if status == 'DELIVERED' else None,
            epod_signature='DEMO-SIGNATURE-NOT-REAL-EVIDENCE' if status == 'DELIVERED' else None,
            epod_notes='Dữ liệu mẫu để kiểm tra giao diện, không phải chứng từ thật.' if status == 'DELIVERED' else None)
        statements.append(insert('container', container))
        item_count = 3 if cold else 2 if assigned else 0
        if assigned:
            statements.append("INSERT INTO shipment (id,shipment_code,customer_id,origin_name,origin_geom,destination_name,destination_geom,cargo_weight_tons,cargo_volume_m3,status,assigned_vehicle_id,assigned_driver_id,container_id,container_type_required,required_delivery_time) VALUES ("
                + ','.join([literal(shipment_id), literal(shipment_code), literal(company[1]), literal(container['origin_name']),
                    'ST_SetSRID(ST_MakePoint(106.795677,10.762622),4326)', literal(destination),
                    'ST_SetSRID(ST_MakePoint(' + str(destination_lng) + ',' + str(destination_lat) + '),4326)', literal(item_count * 1.2), '12',
                    literal({'ASSIGNED': 'PLANNED', 'IN_TRANSIT': 'IN_TRANSIT', 'DELIVERED': 'COMPLETED'}[status]),
                    literal(vehicle_id), literal(driver_id), literal(container['id']), literal(container['container_type']),
                    literal((NOW + timedelta(hours=4)).isoformat())]) + ') ON CONFLICT DO NOTHING;')
            statements.append(insert('trip', dict(id=identifier('trip', index), trip_code='DEMO-TRIP-' + str(index),
                shipment_id=shipment_id, vehicle_id=vehicle_id, driver_id=driver_id,
                status={'ASSIGNED': 'SCHEDULED', 'IN_TRANSIT': 'EN_ROUTE', 'DELIVERED': 'COMPLETED'}[status],
                start_time=(NOW - timedelta(hours=3)).isoformat() if status != 'ASSIGNED' else None,
                end_time=container['completed_at'], arrived_at=container['completed_at'],
                arrival_status='DELIVERED' if status == 'DELIVERED' else 'IN_TRANSIT' if cold else 'AT_ORIGIN')))
            if status != 'ASSIGNED':
                statements.append(insert('pre_trip_inspection', dict(id=identifier('inspection', index),
                    vehicle_id=vehicle_id, driver_id=driver_id, shipment_id=shipment_id,
                    status='PASSED', checklist_json=json.dumps({'demo': True, 'brakes': True, 'lights': True, 'tires': True}),
                    remarks='MÔ PHỎNG UI, không có giá trị kiểm định thực tế.')))
        for item_index in range(1, item_count + 1):
            item_code = 'DEMO-SKU-' + str(index) + str(item_index).zfill(2)
            cargo = ['Sữa tươi thanh trùng 1L', 'Sữa chua ăn 100g', 'Sữa tươi ít đường 180ml'][item_index - 1] if cold else ['Linh kiện điện tử đóng thùng', 'Phụ kiện đóng gói'][item_index - 1] if index == 2 else ['Sữa tiệt trùng 180ml', 'Sữa bột đóng hộp'][item_index - 1]
            statements.append(insert('container_cargo_manifest_item', dict(id=identifier('item', item_code),
                item_code=item_code, container_code=code, shipment_code=shipment_code, hub_code=hub,
                cargo_name=cargo, cargo_category='Thực phẩm lạnh' if cold else 'Điện tử' if index == 2 else 'Thực phẩm khô',
                consignee_name='Bộ phận nhận hàng mô phỏng', consignee_phone='0000000000',
                delivery_address='Địa chỉ mô phỏng · ' + destination, delivery_zone_name=destination,
                delivery_lat=destination_lat, delivery_lng=destination_lng, weight_kg=1200, parcel_count=100,
                required_temp_c=4 if cold else None, requires_cold_chain=cold,
                sla_window='08:00–17:00 (dữ liệu mẫu)', dispatch_status='DELIVERED_POD' if status == 'DELIVERED' else 'IN_CONTAINER',
                delivered_at=container['completed_at'], recipient_pod_name=container['epod_recipient'])))
        summaries.append((code, status, item_count))
    return statements, summaries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Insert fixtures into the LOCAL Docker database')
    args = parser.parse_args()
    statements, summaries = fixtures()
    for code, status, item_count in summaries:
        print(code, status, str(item_count) + ' mặt hàng')
    if not args.apply:
        print('Preview only. Use --apply to insert local UI fixtures.')
        return
    precondition = """DO $$ BEGIN
      IF (SELECT count(*) FROM companies WHERE company_code IN ('VINAMILK','SAMSUNG_VN') AND NOT is_deleted) <> 2
         OR (SELECT count(*) FROM local_distribution_hub WHERE hub_code IN ('HUB-SHTP-Q9','HUB-VSIP1-BD')) <> 2
      THEN RAISE EXCEPTION 'Baseline demo companies/hubs are missing; no fixtures inserted.'; END IF;
    END $$;"""
    sql = '\n'.join(['BEGIN;', "SELECT pg_advisory_xact_lock(hashtext('ccadro-container-ui-demo'));", precondition, *statements, 'COMMIT;'])
    subprocess.run(['docker', 'exec', '-i', 'ccadro-postgres', 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
                    '-U', 'ccadro', '-d', 'ccadro'], input=sql, text=True, check=True, stdout=subprocess.DEVNULL)
    print('Applied local fixtures (existing rows preserved).')


if __name__ == '__main__':
    main()
