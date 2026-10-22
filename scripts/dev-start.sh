#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

mkdir -p logs .pids

echo "==> Ensuring Docker Compose services are running..."
docker compose up -d

# Source environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PG_PORT=${POSTGRES_PORT:-5432}

echo "==> Starting Spring Boot Backend (Profile: ${SPRING_PROFILES_ACTIVE:-local})..."
if [ -f .pids/backend.pid ] && kill -0 $(cat .pids/backend.pid) 2>/dev/null; then
  echo "Backend is already running (PID: $(cat .pids/backend.pid))"
else
  if [ -f backend/target/ccadro-backend-0.1.0-SNAPSHOT.jar ]; then
    nohup java -jar backend/target/ccadro-backend-0.1.0-SNAPSHOT.jar \
      --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-local} \
      --POSTGRES_PORT=$PG_PORT > logs/backend.log 2>&1 &
    echo $! > .pids/backend.pid
  else
    (cd backend && nohup mvn spring-boot:run \
      -Dspring-boot.run.profiles=${SPRING_PROFILES_ACTIVE:-local} \
      -DPOSTGRES_PORT=$PG_PORT > ../logs/backend.log 2>&1 & echo $! > ../.pids/backend.pid)
  fi
  echo "Backend process launched (PID: $(cat .pids/backend.pid), logs at logs/backend.log)"
fi

echo "==> Starting React / Vite Frontend..."
if [ -f "$PROJECT_ROOT/.pids/frontend.pid" ] && kill -0 $(cat "$PROJECT_ROOT/.pids/frontend.pid") 2>/dev/null; then
  echo "Frontend is already running (PID: $(cat "$PROJECT_ROOT/.pids/frontend.pid"))"
else
  (cd "$PROJECT_ROOT/frontend" && nohup npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 & echo $! > "$PROJECT_ROOT/.pids/frontend.pid")
  echo "Frontend process launched (PID: $(cat "$PROJECT_ROOT/.pids/frontend.pid"), logs at logs/frontend.log)"
fi

echo "==> Waiting for Backend Actuator health endpoint..."
for i in {1..30}; do
  if curl -s http://localhost:8080/actuator/health | grep '"status":"UP"' >/dev/null 2>&1; then
    echo "✓ Backend is UP and Healthy!"
    break
  fi
  sleep 2
done

echo ""
echo "=========================================================="
echo "  🚀 CCADRO Green Logistics Tracker is LIVE!"
echo "=========================================================="
echo "  • Frontend Web Console:  http://localhost:5173"
echo "  • Backend REST API:      http://localhost:8080"
echo "  • Swagger / OpenAPI UI:  http://localhost:8080/swagger-ui.html"
echo "  • Actuator Health:       http://localhost:8080/actuator/health"
echo "  • System Capabilities:   http://localhost:8080/api/v1/health"
echo "=========================================================="
