#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

mkdir -p logs .pids

# A new OS session keeps services alive when a terminal/tool session exits.
start_detached() {
  local name="$1"
  local workdir="$2"
  shift 2
  python3 - "$PROJECT_ROOT" "$name" "$workdir" "$@" <<'PY'
from pathlib import Path
import subprocess
import sys

root, name, workdir = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
with (root / 'logs' / (name + '.log')).open('wb') as output:
    process = subprocess.Popen(sys.argv[4:], cwd=workdir, stdin=subprocess.DEVNULL,
                               stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
(root / '.pids' / (name + '.pid')).write_text(str(process.pid) + '\n')
PY
}

# Source environment
if [ ! -f .env ]; then
  echo ".env is missing; run scripts/setup.sh first." >&2
  exit 1
fi

if ! grep -q '^JWT_SIGNER_KEY=.' .env; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl is required to generate JWT_SIGNER_KEY." >&2
    exit 1
  fi
  printf '\n# Local development signing key; do not commit or reuse in production.\nJWT_SIGNER_KEY=%s\n' "$(openssl rand -hex 64)" >> .env
  chmod 600 .env
  echo "Generated a local JWT signing key in .env."
fi

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

source scripts/chat-env.sh
export SERVER_ADDRESS=${SERVER_ADDRESS:-127.0.0.1}
export EUREKA_CLIENT_ENABLED=${EUREKA_CLIENT_ENABLED:-true}
export EUREKA_SERVER_URL=${EUREKA_SERVER_URL:-http://127.0.0.1:${EUREKA_PORT:-8761}/eureka/}
# Bound local JVM/thread and connection usage when the complete stack shares one machine.
read -r -a JAVA_OPTIONS <<< "${CCADRO_JAVA_OPTS:--Xms64m -Xmx256m -XX:+UseSerialGC -XX:ActiveProcessorCount=2}"
export SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=${SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE:-4}
export SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=${SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE:-1}
export LOGGING_LEVEL_ORG_SPRINGFRAMEWORK=${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK:-INFO}

# Start the standalone registry before clients; skip it only for an explicit external registry.
if [ "${EUREKA_START_LOCAL:-true}" = true ]; then
  EUREKA_JAR="backend/eureka-server/target/eureka-server-0.1.0-SNAPSHOT.jar"
  if ! lsof -tiTCP:${EUREKA_PORT:-8761} -sTCP:LISTEN >/dev/null 2>&1; then
    if [ ! -f "$EUREKA_JAR" ]; then
      mvn -f backend/eureka-server/pom.xml package -DskipTests -q
    fi
    start_detached eureka-server "$PROJECT_ROOT" java "${JAVA_OPTIONS[@]}" -jar "$EUREKA_JAR"
  fi
  EUREKA_READY=false
  for i in {1..30}; do
    if curl -fsS "http://127.0.0.1:${EUREKA_PORT:-8761}/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
      EUREKA_READY=true
      break
    fi
    sleep 2
  done
  if [ "$EUREKA_READY" != true ]; then
    echo "Eureka unavailable; inspect logs/eureka-server.log" >&2
    exit 1
  fi
fi

echo "==> Ensuring Docker Compose services are running..."
docker compose up -d

echo "==> Waiting for MongoDB Chat storage..."
CHAT_MONGO_READY=false
for i in {1..30}; do
  if docker exec ccadro-mongodb mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then
    CHAT_MONGO_READY=true
    break
  fi
  sleep 2
done
if [ "$CHAT_MONGO_READY" != true ]; then
  echo "MongoDB unavailable; inspect docker compose logs mongodb" >&2
  exit 1
fi

PG_PORT=${POSTGRES_PORT:-5433}
export DB_HOST=${POSTGRES_HOST:-localhost}
export DB_PORT=${PG_PORT}
export DB_NAME=${POSTGRES_DB:-ccadro}
export DB_USER=${POSTGRES_USER:-ccadro}
export DB_PASSWORD=${POSTGRES_PASSWORD:-ccadro_dev_secret}

echo "==> Starting CCADRO Microservices..."

SERVICES=(
  "identity-service:8080"
  "asset-service:8081"
  "shipment-service:8082"
  "routing-service:8083"
  "tracking-service:8084"
  "carbon-service:8085"
  "incident-service:8086"
  "notification-service:8087"
  "payment-service:8088"
  "hub-shipper-service:8089"
  "chat-service:${CHAT_PORT:-8090}"
  "api-gateway:8888"
)

for item in "${SERVICES[@]}"; do
  SVC="${item%%:*}"
  PORT="${item##*:}"
  JAR="backend/$SVC/target/$SVC-0.1.0-SNAPSHOT.jar"
  PID_FILE=".pids/$SVC.pid"

  if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
    echo "  • $SVC already running (PID: $(cat $PID_FILE), Port: $PORT)"
  elif lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  • $SVC already listening on port $PORT"
  else
    if [ ! -f "$JAR" ]; then
      echo "  • Building $SVC jar..."
      mvn -f backend/$SVC/pom.xml package -DskipTests -q
    fi
    echo "  • Launching $SVC on port $PORT..."
    start_detached "$SVC" "$PROJECT_ROOT" java "${JAVA_OPTIONS[@]}" -jar "$JAR"
  fi

  SERVICE_READY=false
  for i in {1..90}; do
    if [ "$SVC" = api-gateway ]; then
      if curl --max-time 2 -fsS http://127.0.0.1:8888/api/v1/careers/openings 2>/dev/null | grep -q '"code":1000'; then
        SERVICE_READY=true
        break
      fi
    elif curl --max-time 2 -fsS "http://127.0.0.1:$PORT/actuator/health" 2>/dev/null | grep -q '"status":"UP"'; then
      SERVICE_READY=true
      break
    fi
    if [ -f "$PID_FILE" ] && ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      break
    fi
    sleep 2
  done
  if [ "$SERVICE_READY" != true ]; then
    echo "$SVC readiness failed; inspect logs/$SVC.log" >&2
    exit 1
  fi
  echo "  ✓ $SVC ready"
done

echo "==> Starting React / Vite Frontend..."
if [ -f "$PROJECT_ROOT/.pids/frontend.pid" ] && kill -0 $(cat "$PROJECT_ROOT/.pids/frontend.pid") 2>/dev/null; then
  echo "Frontend is already running (PID: $(cat "$PROJECT_ROOT/.pids/frontend.pid"))"
elif lsof -tiTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Frontend is already listening on port 5173"
else
  start_detached frontend "$PROJECT_ROOT/frontend" npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}"
  echo "Frontend process launched (PID: $(cat "$PROJECT_ROOT/.pids/frontend.pid"), logs at logs/frontend.log)"
fi

echo "==> Waiting for API Gateway and Identity Service..."
GATEWAY_READY=false
for i in {1..90}; do
  # /api/v1/health requires authentication; technical endpoints are hidden at the gateway.
  if curl --max-time 2 -fsS http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"' \
      && curl --max-time 2 -fsS http://127.0.0.1:8888/api/v1/careers/openings 2>/dev/null | grep -q '"code":1000'; then
    GATEWAY_READY=true
    echo "✓ API Gateway routes to a healthy Identity Service."
    break
  fi
  sleep 2
done
if [ "$GATEWAY_READY" != true ]; then
  echo "Gateway/Identity readiness failed; inspect their logs." >&2
  exit 1
fi

echo ""
echo "=========================================================="
echo "  🚀 CCADRO Green Logistics Tracker is LIVE!"
echo "=========================================================="
echo "  • Frontend Web Console:  http://localhost:5173"
echo "  • API Gateway (Unified): http://localhost:8888"
echo "  • Eureka Infrastructure: http://localhost:${EUREKA_PORT:-8761}"
echo "  • Swagger / OpenAPI:     hidden on gateway; see docs/ACCESS_BOUNDARY_SECURITY.md"
echo "  • System Capabilities:   http://localhost:8888/api/v1/health (Bearer token required)"
echo "  • Identity Service:      http://localhost:8080"
echo "  • Asset Service:         http://localhost:8081"
echo "  • Shipment Service:      http://localhost:8082"
echo "  • Routing Service:       http://localhost:8083"
echo "  • Tracking Service:      http://localhost:8084"
echo "  • Carbon Service:        http://localhost:8085"
echo "  • Incident Service:      http://localhost:8086"
echo "  • Notification Service:  http://localhost:8087"
echo "  • Payment Service:       http://localhost:8088"
echo "  • Hub Shipper Service:   http://localhost:8089"
echo "  • MongoDB Chat Service:  ${CHAT_SERVICE_URL}"
echo "=========================================================="
