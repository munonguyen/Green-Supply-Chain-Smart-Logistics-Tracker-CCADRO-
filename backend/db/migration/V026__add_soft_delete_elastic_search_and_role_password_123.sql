-- =============================================================================
-- Flyway V026: Soft Delete (Xoa mem) & Search Support
-- Demo password resets have moved to db/demo/reset_demo_passwords.sql (manual opt-in only).
-- 2. Bo sung cot Xoa mem (is_deleted, deleted_at, deleted_by) cho toan bo danh sach
-- 3. Kich hoat pg_trgm + unaccent + GIN index cho Elastic-style Search
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Bo sung cot Xoa mem (Soft Delete) tren toan bo bang danh sach nghiep vu
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE hub_iam.hub_accounts
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.vehicle
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.driver
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.container
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.container_cargo_manifest_item
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.shipment
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.field_incident
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.b2b_contracts
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

ALTER TABLE public.trip
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(60);

-- 3. Partial Index loc nhanh du lieu active (chua xoa mem)
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_hub_accounts_active ON hub_iam.hub_accounts (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vehicle_active ON public.vehicle (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_driver_active ON public.driver (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_container_active ON public.container (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_manifest_active ON public.container_cargo_manifest_item (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_shipment_active ON public.shipment (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_incident_active ON public.field_incident (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_contract_active ON public.b2b_contracts (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_active ON public.payment_transactions (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_trip_active ON public.trip (is_deleted) WHERE is_deleted = FALSE;

-- 4. GIN Trigram Indexes cho Elastic-style multi-field fuzzy search
CREATE INDEX IF NOT EXISTS idx_users_elastic_trgm
    ON public.users USING GIN ((COALESCE(username, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shipment_elastic_trgm
    ON public.shipment USING GIN ((COALESCE(shipment_code, '') || ' ' || COALESCE(customer_id, '') || ' ' || COALESCE(origin_name, '') || ' ' || COALESCE(destination_name, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_manifest_elastic_trgm
    ON public.container_cargo_manifest_item USING GIN ((COALESCE(item_code, '') || ' ' || COALESCE(cargo_name, '') || ' ' || COALESCE(consignee_name, '') || ' ' || COALESCE(delivery_zone_name, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contract_elastic_trgm
    ON public.b2b_contracts USING GIN ((COALESCE(contract_number, '') || ' ' || COALESCE(customer_name, '') || ' ' || COALESCE(shipment_code, '')) gin_trgm_ops);

