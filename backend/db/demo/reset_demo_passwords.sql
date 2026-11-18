-- DEVELOPMENT ONLY: explicitly run against a disposable demo database. Never included in Flyway locations.
-- 1. Dong bo mat khau mac dinh '123' (BCrypt cost 10 verified by Spring BCryptPasswordEncoder)
--    Hash: $2a$10$ZNxwecF4zfhHOV.TgX.5g.19BGrEyCpc9P6Dt90BDtIKM8mvB.GtC
UPDATE public.users
SET
    password = '$2a$10$ZNxwecF4zfhHOV.TgX.5g.19BGrEyCpc9P6Dt90BDtIKM8mvB.GtC',
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE LOWER(username) IN (
    'admin',
    'dispatcher',
    'driver',
    'auditor',
    'safety',
    'shipper',
    'customer',
    'hub_mgr_dinhbang',
    'hub_mgr_amata',
    'shipper_bn2',
    'shipper_bn3',
    'shipper_amata',
    'hub_inspector_bn'
);

UPDATE hub_iam.hub_accounts
SET
    password_hash = '$2a$10$ZNxwecF4zfhHOV.TgX.5g.19BGrEyCpc9P6Dt90BDtIKM8mvB.GtC',
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE LOWER(username) IN (
    'admin',
    'hub_mgr_dinhbang',
    'hub_mgr_amata',
    'shipper',
    'shipper_bn2',
    'shipper_bn3',
    'shipper_amata',
    'hub_inspector_bn'
);

