#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> Stopping CCADRO development servers..."

if [ -d .pids ]; then
  for pid_file in .pids/*.pid; do
    if [ -f "$pid_file" ]; then
      PID=$(cat "$pid_file")
      SVC=$(basename "$pid_file" .pid)
      echo "Stopping $SVC (PID: $PID)..."
      kill $PID 2>/dev/null || true
      rm -f "$pid_file"
    fi
  done
fi

# Clean up any orphan processes on microservice ports and frontend
PORTS=(5173 8888 8080 8081 8082 8083 8084 8085 8086 8087)
for port in "${PORTS[@]}"; do
  lsof -ti :$port | xargs kill -9 2>/dev/null || true
done

if [ "$1" = "--all" ]; then
  echo "==> Stopping Docker Compose services..."
  docker compose down
fi

echo "✓ All CCADRO development services stopped."
