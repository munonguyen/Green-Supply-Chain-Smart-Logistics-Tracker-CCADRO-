-- ==============================================================================
-- V011: Add Distance and Distance Unit to Shipment Table (BRULE-02 & GLEC v3 Support)
-- Enables storing estimated distance (km), distance unit, and formatted distance
-- ==============================================================================

ALTER TABLE shipment ADD COLUMN IF NOT EXISTS distance VARCHAR(50);
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10, 2);
ALTER TABLE shipment ADD COLUMN IF NOT EXISTS distance_unit VARCHAR(10) DEFAULT 'KM';

COMMENT ON COLUMN shipment.distance IS 'Formatted distance string with unit (e.g. 27.05 KM)';
COMMENT ON COLUMN shipment.distance_km IS 'Estimated or actual distance in kilometers used for GLEC v3 ton-km emission calculations';
COMMENT ON COLUMN shipment.distance_unit IS 'Unit of measurement for distance (standard: KM)';

