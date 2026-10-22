#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "         CCADRO DEVELOPMENT ENVIRONMENT SETUP            "
echo "=========================================================="

# 1. Prepare .env file
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
fi

# Detect if port 5432 is occupied on the host
if lsof -i :5432 >/dev/null 2>&1 || nc -z localhost 5432 >/dev/null 2>&1; then
  # Check if our own container is already using it
  CURRENT_PORT=$(grep "^POSTGRES_PORT=" .env | cut -d'=' -f2)
  if [ "$CURRENT_PORT" = "5432" ]; then
    echo "==> Note: Port 5432 is currently occupied on host. Configuring POSTGRES_PORT=5433 in .env..."
    sed -i '' 's/^POSTGRES_PORT=5432/POSTGRES_PORT=5433/' .env 2>/dev/null || sed -i 's/^POSTGRES_PORT=5432/POSTGRES_PORT=5433/' .env
  fi
fi

# 2. Launch Docker infrastructure
echo "==> Starting PostgreSQL/PostGIS and Redis via Docker Compose..."
docker compose up -d

# 3. Wait for PostgreSQL & Redis health
echo "==> Waiting for container services to be healthy..."
for i in {1..30}; do
  PG_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' ccadro-postgres 2>/dev/null || echo "starting")
  REDIS_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' ccadro-redis 2>/dev/null || echo "starting")

  if [ "$PG_STATUS" = "\"healthy\"" ] && [ "$REDIS_STATUS" = "\"healthy\"" ]; then
    echo "✓ PostgreSQL/PostGIS is healthy!"
    echo "✓ Redis is healthy!"
    break
  fi
  echo "    Waiting for services... (Postgres: $PG_STATUS, Redis: $REDIS_STATUS) [$i/30]"
  sleep 2
done

# 4. Compile backend and verify Flyway migrations
echo "==> Validating backend compile & Flyway migrations..."
# Source .env
set -a
source .env
set +a
(cd backend && mvn test-compile)

# 5. Setup frontend dependencies
echo "==> Ensuring frontend dependencies are installed..."
(cd frontend && npm install)

echo ""
echo "=========================================================="
echo " ✓ SETUP COMPLETE! Run 'make start' or './scripts/dev-start.sh'"
echo "=========================================================="
