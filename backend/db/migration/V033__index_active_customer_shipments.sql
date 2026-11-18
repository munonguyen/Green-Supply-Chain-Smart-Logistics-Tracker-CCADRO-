-- Keep the common active-shipment and customer shipment lists bounded by indexed access.
CREATE OR REPLACE FUNCTION public.unaccent_immutable(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent', value) $$;

CREATE INDEX IF NOT EXISTS idx_shipment_active_created_at
    ON public.shipment (created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_shipment_customer_active_created_at
    ON public.shipment (customer_id, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_shipment_search_trgm_v2
    ON public.shipment USING GIN (
        (public.unaccent_immutable(lower(
            COALESCE(shipment_code, '') || ' ' || COALESCE(customer_id, '') || ' ' ||
            COALESCE(origin_name, '') || ' ' || COALESCE(origin_address, '') || ' ' ||
            COALESCE(destination_name, '') || ' ' || COALESCE(destination_address, '') || ' ' || COALESCE(status, '')
        ))) gin_trgm_ops
    );
