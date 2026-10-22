# CCADRO - Smart Green Supply Chain Logistics Tracker

CCADRO is an academic MVP implementing an end-to-end **Modular Monolith** for green logistics optimization, multi-criteria route planning, real-time GPS deviation alerting, dynamic incident rerouting, and authoritative GLEC v3 carbon accounting.

---

## ⚡ 5-Minute Quick Start

No local PostgreSQL or Redis installation is required. Everything runs seamlessly in Docker.

### 1. Clone & Bootstrap

```bash
git clone https://github.com/munonguyen/Green-Supply-Chain-Smart-Logistics-Tracker-CCADRO-.git
cd Green-Supply-Chain-Smart-Logistics-Tracker-CCADRO-

# Copy environment template
cp .env.example .env

# Run one-command automated setup
make setup
```

### 2. Start Application Services

```bash
make start
```

### 3. Verify System Capabilities

```bash
make smoke
```

---

## 🌐 Local Endpoints

| Component | URL | Description |
|---|---|---|
| **Frontend Web Console** | [http://localhost:5173](http://localhost:5173) | Interactive Leaflet tracking & dispatch console |
| **Backend REST API** | [http://localhost:8080](http://localhost:8080) | Spring Boot 3 modular monolith root |
| **Swagger / OpenAPI** | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) | Interactive API documentation |
| **Spring Actuator** | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | System health & liveness status |
| **CCADRO Diagnostics** | [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health) | PostGIS version & active modules health |

---

## 🏗️ Repository Architecture

```text
CCADRO/
│
├── backend/                  # Java 17 + Spring Boot 3.3.4 (Modular Monolith)
│   ├── src/main/java/com/ccadro/
│   │   ├── shared/           # Cross-cutting: security, config, CORS, OpenAPI, errors
│   │   ├── asset/            # Fleet management: Vehicle (V001), Driver (D001)
│   │   ├── shipment/         # Consignments & spatial coordinates (SH001)
│   │   ├── routing/          # UC05 Green Multi-Criteria Routing & Adapters
│   │   ├── tracking/         # UC09/UC10 Real-time GPS stream, buffer deviations
│   │   ├── carbon/           # UC12/UC13 GLEC v3 carbon accounting & benchmarks
│   │   └── exception/        # Domain business rule exceptions
│   ├── src/main/resources/db/migration/  # Flyway SQL migrations (V001..V008)
│   └── pom.xml
│
├── frontend/                 # React 18 + Vite + Leaflet Maps
│   ├── src/
│   │   ├── components/map/   # MapView, RoutePolyline, VehicleMarker, DeviationMarker
│   │   ├── pages/            # Dashboard, Shipments, Planning, Tracking, Carbon
│   │   └── services/api.js   # REST API client
│   └── package.json
│
├── infrastructure/
│   ├── docker/               # docker-compose.yml (PostgreSQL/PostGIS + Redis)
│   └── postgres/init/        # 01-init-postgis.sh
│
├── tools/
│   └── gps-simulator/        # simulate.py (normal, deviation, traffic)
│
├── scripts/
│   ├── setup.sh              # One-command bootstrap
│   ├── dev-start.sh          # Background service runner with health wait
│   ├── dev-stop.sh           # Clean shutdown script
│   ├── reset-db.sh           # Clean schema reset & Flyway re-migration
│   ├── seed-data.sh          # Baseline demo entity seeder
│   ├── smoke-test.sh         # End-to-end verification suite
│   └── simulate-trip.sh      # GPS simulator runner
│
├── docs/
│   └── requirements/core/    # Core specifications (UC05, UC09, UC10, UC12, UC13)
│
├── Makefile                  # Standardized team build commands
├── AGENTS.md                 # Rules & architectural boundaries for AI agents
├── .env.example              # Development environment defaults
└── README.md
```

---

## 🛠️ Developer Command Reference

| Command | Action |
|---|---|
| `make setup` | Starts Docker containers, runs DB migrations, installs npm packages |
| `make start` | Starts backend and frontend in background and monitors health |
| `make stop` | Shuts down backend and frontend dev processes |
| `make test` | Runs backend unit/integration tests and frontend vitest suite |
| `make seed` | Populates demo entities (`V001`, `D001`, `SH001`, `EF001`) |
| `make reset-db` | Drops schema and reapplies all Flyway migrations |
| `make smoke` | Runs comprehensive 8-step smoke test |
| `make simulate-normal` | Simulates on-route GPS telemetry (A -> B -> C -> D) |
| `make simulate-deviation` | Simulates 300m off-route GPS deviation triggering UC09 RED alert |
| `make simulate-traffic` | Simulates traffic congestion / road closure triggering UC10 |

---

## 🛰️ GPS Simulator Usage

You can feed real-time GPS telemetry into CCADRO to trigger monitoring events:

```bash
# Normal trip along Cat Lai Port -> VSIP 1 corridor
./scripts/simulate-trip.sh normal

# 300m off-path deviation (triggers UC09 RED alert)
./scripts/simulate-trip.sh deviation

# Traffic gridlock / road closure (triggers UC10 reroute proposal)
./scripts/simulate-trip.sh traffic
```

---

## 🛡️ AI Agent Guidelines

See [AGENTS.md](AGENTS.md) for architectural invariants, package visibility boundaries, and business rules enforced by Spring Modulith and ArchUnit.
