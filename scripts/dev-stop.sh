#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> Stopping CCADRO development servers..."

if [ -f .pids/backend.pid ]; then
  PID=$(cat .pids/backend.pid)
  echo "Stopping backend (PID: $PID)..."
  kill $PID 2>/dev/null || true
  rm -f .pids/backend.pid
fi

if [ -f .pids/frontend.pid ]; then
  PID=$(cat .pids/frontend.pid)
  echo "Stopping frontend (PID: $PID)..."
  kill $PID 2>/dev/null || true
  rm -f .pids/frontend.pid
fi

# Clean up any orphan processes on ports 8080 or 5173
lsof -ti :8080 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

if [ "$1" = "--all" ]; then
  echo "==> Stopping Docker Compose services..."
  docker compose down
fi

echo "✓ All CCADRO development services stopped."
