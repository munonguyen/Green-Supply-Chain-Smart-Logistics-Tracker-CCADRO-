#!/bin/bash
set -e

# Perform all actions as $POSTGRES_USER in $POSTGRES_DB
echo "==> Ensuring PostGIS extension is loaded in database: $POSTGRES_DB"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    SELECT PostGIS_Version();
EOSQL
echo "==> PostGIS initialized successfully."
