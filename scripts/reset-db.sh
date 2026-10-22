#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "==> Resetting CCADRO PostgreSQL database..."
docker compose exec -T postgres psql -U ${POSTGRES_USER:-ccadro} -d ${POSTGRES_DB:-ccadro} <<-EOSQL
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "==> Running Flyway Migrations..."
(cd backend && mvn flyway:migrate -DPOSTGRES_PORT=${POSTGRES_PORT:-5432})

echo "✓ Database schema reset and migrations applied successfully."
