import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE TABLE driver (id uuid, driver_code text, full_name text, status text, account_username text, is_deleted boolean default false, hos_continuous_min int default 0, hos_daily_min int default 0);
CREATE TABLE users (id uuid, username text, status text, is_deleted boolean default false);
CREATE TABLE user_roles (user_id uuid, role_name text);
CREATE TABLE staff_profiles (id uuid, employee_code text, username text, role_code text, status text, is_deleted boolean default false, verification_status text, verified_at timestamptz, license_number text, license_class text, license_expiry_date date, background_check_passed boolean, health_check_passed boolean, safety_training_certified boolean);
CREATE TABLE job_applications(id uuid);
CREATE TABLE pre_trip_inspection(shipment_id uuid, vehicle_id uuid, driver_id uuid, inspection_time timestamptz);
`);
const sql=fs.readFileSync(process.argv[2],'utf8');
await db.exec(sql);
await db.exec(`
INSERT INTO driver (id,driver_code,full_name,status,account_username) VALUES ('00000000-0000-0000-0000-000000000001','DRV-001','Driver','AVAILABLE','driver');
INSERT INTO users(id,username,status) VALUES ('00000000-0000-0000-0000-000000000001','driver','ACTIVE');
INSERT INTO user_roles VALUES ('00000000-0000-0000-0000-000000000001','DRIVER');
INSERT INTO staff_profiles (id, employee_code,username,role_code,status,verification_status,verified_at,license_number,license_class,license_issue_date,license_expiry_date,date_of_birth,background_check_passed,health_check_passed,safety_training_certified)
VALUES ('00000000-0000-0000-0000-000000000001','NV001','driver','DRIVER','ACTIVE','APPROVED',now(),'123456789','CE','2025-01-01','2030-01-01','1980-01-01',true,true,true);
`);
const issue=async()=> (await db.query('SELECT qualification_issue FROM driver_dispatch_qualification')).rows[0].qualification_issue;
assert.equal(await issue(),null);
assert.equal((await db.query('SELECT masked_license FROM driver_dispatch_qualification')).rows[0].masked_license,'•••• 6789');
for(const [change,pattern] of [
 ["UPDATE staff_profiles SET license_class='C'",/GPLX/],
 ["UPDATE staff_profiles SET license_class='FC', license_issue_date='2025-01-01'",/GPLX/],
 ["UPDATE staff_profiles SET license_issue_date='2020-01-01'",null],
 ["UPDATE staff_profiles SET license_expiry_date='2020-01-02'",/hết hạn/],
 ["UPDATE staff_profiles SET license_expiry_date='2030-01-01', verification_status='REJECTED'",/duyệt/],
 ["UPDATE staff_profiles SET verification_status='APPROVED', health_check_passed=false",/sức khỏe/],
 ["UPDATE staff_profiles SET health_check_passed=true; UPDATE users SET status='SUSPENDED'",/tài khoản/],
 ["UPDATE users SET status='ACTIVE'; UPDATE driver SET hos_continuous_min=240",/4 giờ/],
 ["UPDATE driver SET hos_continuous_min=0; UPDATE staff_profiles SET license_class='CE',date_of_birth='2005-01-01'",/GPLX/]
]) {
 await db.exec(change);
 const result=await issue();
 pattern ? assert.match(result,pattern) : assert.equal(result,null);
}
console.log('10 driver qualification scenarios passed; masked license verified; migration applied to PostgreSQL WASM.');
await db.close();
