.PHONY: help setup start stop test reset-db seed smoke simulate-normal simulate-deviation simulate-traffic clean

SHELL := /bin/bash

# Default goal
.DEFAULT_GOAL := help

help:
	@echo "=========================================================="
	@echo "  CCADRO - Smart Green Logistics Tracker Build Commands   "
	@echo "=========================================================="
	@echo "  make setup         - Full automated bootstrap (Docker, DB, npm)"
	@echo "  make start         - Start backend, frontend, and containers"
	@echo "  make stop          - Stop all local dev servers and services"
	@echo "  make test          - Run backend & frontend test suites"
	@echo "  make seed          - Seed baseline demo data into PostgreSQL"
	@echo "  make reset-db      - Wipe schema and re-run Flyway migrations"
	@echo "  make smoke         - Execute end-to-end smoke test suite"
	@echo "  make simulate-normal    - Run GPS simulator in normal mode"
	@echo "  make simulate-deviation - Run GPS simulator with 300m deviation"
	@echo "  make simulate-traffic   - Run GPS simulator with congestion incident"
	@echo "=========================================================="

setup:
	@./scripts/setup.sh

start:
	@./scripts/dev-start.sh

stop:
	@./scripts/dev-stop.sh

test:
	@echo "==> Running Backend Tests..."
	@if [ -f .env ]; then set -a; source .env; set +a; fi; \
	(cd backend && mvn test -DPOSTGRES_PORT=$${POSTGRES_PORT:-5432})
	@echo "==> Running Frontend Tests..."
	@(cd frontend && npm test)

seed:
	@./scripts/seed-data.sh

reset-db:
	@./scripts/reset-db.sh

smoke:
	@./scripts/smoke-test.sh

simulate-normal:
	@./scripts/simulate-trip.sh normal

simulate-deviation:
	@./scripts/simulate-trip.sh deviation

simulate-traffic:
	@./scripts/simulate-trip.sh traffic

clean:
	@rm -rf backend/target frontend/dist logs/*.log .pids
	@echo "✓ Cleaned build artifacts and runtime logs."
