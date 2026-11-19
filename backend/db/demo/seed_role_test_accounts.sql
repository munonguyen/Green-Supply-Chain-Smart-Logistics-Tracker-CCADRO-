-- Explicit local-test fixture only. Never add this directory to Flyway locations.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ccadro.demo_accounts = :'demo_accounts';
DO $$ BEGIN
  IF current_setting('ccadro.demo_accounts', true) IS DISTINCT FROM 'local-test-only' THEN
    RAISE EXCEPTION 'Demo account provisioning requires the local-test-only opt-in';
  END IF;
END $$;

-- Keep business bindings from existing fixtures; do not manufacture tenant or hub IDs.
CREATE TEMP TABLE role_test_accounts ON COMMIT DROP AS
SELECT r.name AS role_name, lower(r.name) AS username,
       u.assigned_hub_code, u.assigned_shipper_code, u.company_id, u.customer_id, u.company_name
FROM roles r
LEFT JOIN LATERAL (
  SELECT candidate.* FROM users candidate
  JOIN user_roles ur ON ur.user_id = candidate.id AND ur.role_name = r.name
  WHERE NOT candidate.is_deleted
  ORDER BY (candidate.username = lower(r.name)) DESC,
           (candidate.assigned_hub_code IS NOT NULL) DESC,
           (candidate.customer_id IS NOT NULL) DESC, candidate.username
  LIMIT 1
) u ON true
WHERE r.name IN ('ADMIN','DISPATCHER','DRIVER','SAFETY_MANAGER','ESG_AUDITOR',
                 'CUSTOMER','SHIPPER','HUB_MANAGER','HUB_SHIPPER','HUB_AUDITOR');

DO $$ BEGIN
  IF (SELECT count(*) FROM role_test_accounts) <> 10 THEN
    RAISE EXCEPTION 'Apply the role migrations first: expected all ten standard roles';
  END IF;
END $$;

INSERT INTO users (username, password, email, first_name, last_name, status,
                   assigned_hub_code, assigned_shipper_code, company_id, customer_id, company_name,
                   password_changed_at, must_change_password, failed_login_attempts, locked_until, is_deleted)
SELECT username, '$2a$10$ZNxwecF4zfhHOV.TgX.5g.19BGrEyCpc9P6Dt90BDtIKM8mvB.GtC',
       username || '@role-test.ccadro.invalid', role_name, 'Local test', 'ACTIVE',
       assigned_hub_code, assigned_shipper_code, company_id, customer_id, company_name,
       now(), false, 0, NULL, false FROM role_test_accounts
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password, status = 'ACTIVE', failed_login_attempts = 0, locked_until = NULL,
  is_deleted = false, deleted_at = NULL, deleted_by = NULL,
  must_change_password = false, password_changed_at = now(), updated_at = now(),
  assigned_hub_code = EXCLUDED.assigned_hub_code, assigned_shipper_code = EXCLUDED.assigned_shipper_code,
  company_id = EXCLUDED.company_id, customer_id = EXCLUDED.customer_id, company_name = EXCLUDED.company_name;

-- Exactly one role per role-test account. Leave all other named accounts unchanged.
DELETE FROM user_roles WHERE user_id IN
  (SELECT u.id FROM users u JOIN role_test_accounts t ON u.username = t.username);
INSERT INTO user_roles (user_id, role_name)
SELECT u.id, t.role_name FROM users u JOIN role_test_accounts t ON u.username = t.username;

-- Legacy SHIPPER is a real role distinct from HUB_SHIPPER; align the IAM mirror.
INSERT INTO hub_iam.hub_functional_roles (role_code, role_title, description)
VALUES ('SHIPPER', 'Shipper (legacy test role)', 'Local test fixture for the SHIPPER role')
ON CONFLICT (role_code) DO NOTHING;
UPDATE hub_iam.hub_accounts a SET password_hash = u.password, functional_role = t.role_name,
  status = 'ACTIVE', failed_login_attempts = 0, locked_until = NULL, updated_at = now()
FROM users u JOIN role_test_accounts t ON u.username = t.username
WHERE a.user_id = u.id;

-- Reset sessions only for accounts whose test credentials were explicitly reset.
UPDATE user_sessions s SET revoked = true, revoked_at = now(), revoke_reason = 'LOCAL_TEST_ACCOUNT_RESET'
WHERE username IN (SELECT username FROM role_test_accounts) AND NOT revoked;

SELECT t.username, t.role_name, u.customer_id, u.assigned_hub_code, u.assigned_shipper_code
FROM role_test_accounts t JOIN users u ON u.username = t.username ORDER BY t.role_name;
COMMIT;
