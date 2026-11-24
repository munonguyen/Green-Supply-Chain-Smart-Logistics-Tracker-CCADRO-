-- Persist the dates needed to verify the current CE rule and legacy FC transition.
ALTER TABLE driver
    ADD COLUMN IF NOT EXISTS license_issue_date VARCHAR(20);

ALTER TABLE staff_profiles
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS license_issue_date DATE;

ALTER TABLE job_applications
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS license_issue_date DATE;

-- Shared PostgreSQL deployment. Identity owns the dossier, Asset owns availability.
CREATE VIEW driver_dispatch_qualification AS
SELECT d.id AS driver_id, d.driver_code, d.full_name, d.status AS driver_status,
       d.hos_continuous_min, d.hos_daily_min,
       s.employee_code, s.verification_status, s.license_class, s.license_issue_date,
       s.license_expiry_date, s.health_check_passed, s.safety_training_certified,
       CASE WHEN length(btrim(s.license_number)) >= 4 THEN '•••• ' || right(btrim(s.license_number), 4) END AS masked_license,
       CASE
           WHEN u.id IS NULL THEN 'Chưa liên kết tài khoản DRIVER đang hoạt động'
           WHEN s.id IS NULL THEN 'Thiếu hoặc trùng hồ sơ nhân sự DRIVER đang hoạt động'
           WHEN s.verification_status IS DISTINCT FROM 'APPROVED' OR s.verified_at IS NULL THEN 'Hồ sơ chưa được duyệt'
           WHEN s.background_check_passed IS NOT TRUE OR s.health_check_passed IS NOT TRUE
                OR s.safety_training_certified IS NOT TRUE THEN 'Thiếu xác nhận danh tính, sức khỏe hoặc tập huấn'
           WHEN nullif(btrim(s.license_number), '') IS NULL THEN 'Thiếu số GPLX'
           WHEN s.license_issue_date IS NULL OR s.license_issue_date > vietnam.today
                OR s.license_expiry_date IS NULL OR s.license_expiry_date < vietnam.today
                OR s.license_issue_date >= s.license_expiry_date THEN 'Ngày cấp hoặc hạn GPLX thiếu, sai hoặc đã hết hạn'
           WHEN s.date_of_birth IS NULL OR s.date_of_birth >= s.license_issue_date THEN 'Ngày sinh thiếu hoặc không hợp lệ'
           WHEN NOT (coalesce(s.license_class, '') = 'CE' AND s.date_of_birth + interval '24 years' <= s.license_issue_date
                OR coalesce(s.license_class, '') = 'FC' AND s.license_issue_date < DATE '2025-01-01') THEN 'GPLX chưa đạt điều kiện hạng CE hoặc FC chuyển tiếp'
           WHEN d.hos_continuous_min >= 240 THEN 'Đã ghi nhận 4 giờ lái liên tục'
       END AS qualification_issue
FROM driver d
CROSS JOIN (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today) vietnam
LEFT JOIN users u ON lower(u.username) = lower(d.account_username)
    AND u.status = 'ACTIVE' AND NOT u.is_deleted
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_name = 'DRIVER')
LEFT JOIN staff_profiles s ON lower(s.username) = lower(u.username) AND s.role_code = 'DRIVER'
    AND NOT s.is_deleted AND s.status = 'ACTIVE'
    AND 1 = (SELECT count(*) FROM staff_profiles other
             WHERE lower(other.username) = lower(u.username) AND other.role_code = 'DRIVER'
               AND NOT other.is_deleted AND other.status = 'ACTIVE')
WHERE NOT d.is_deleted;

CREATE INDEX IF NOT EXISTS idx_staff_dispatch_username
    ON staff_profiles (lower(username)) WHERE NOT is_deleted AND role_code = 'DRIVER' AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_pre_trip_dispatch
    ON pre_trip_inspection (shipment_id, vehicle_id, driver_id, inspection_time DESC);
