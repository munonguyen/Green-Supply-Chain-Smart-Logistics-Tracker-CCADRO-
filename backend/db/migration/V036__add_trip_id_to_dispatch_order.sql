ALTER TABLE dispatch_order
    ADD COLUMN IF NOT EXISTS trip_id UUID;

CREATE INDEX IF NOT EXISTS idx_dispatch_order_trip_id
    ON dispatch_order (trip_id)
    WHERE trip_id IS NOT NULL;
