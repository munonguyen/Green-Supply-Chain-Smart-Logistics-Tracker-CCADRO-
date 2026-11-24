-- ==============================================================================
-- Migration: V055__shipper_avatar_url.sql
-- Description: Bổ sung cột ảnh đại diện (avatar_url) cho hồ sơ Shipper.
-- ==============================================================================

ALTER TABLE hub_local_shipper
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

