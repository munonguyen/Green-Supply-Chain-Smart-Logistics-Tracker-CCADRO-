#!/bin/bash
set -e

MODE=${1:-normal}
echo "==> Running CCADRO GPS Telemetry Simulator in [$MODE] mode..."

python3 "$(dirname "$0")/../tools/gps-simulator/simulate.py" "$MODE"
