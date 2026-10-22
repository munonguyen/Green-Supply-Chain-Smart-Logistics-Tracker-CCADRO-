-- V001__enable_postgis.sql
-- Enable PostGIS and UUID extensions

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS installation
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Version: %', PostGIS_Version();
END $$;
