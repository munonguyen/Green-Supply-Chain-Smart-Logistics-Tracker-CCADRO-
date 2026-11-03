#!/usr/bin/env python3
"""
CCADRO GPS Telemetry Simulator
Supports three test scenarios:
  1. normal: Simulates on-route telemetry along corridor A -> B -> C -> D
  2. deviation: Generates 300m off-route GPS telemetry triggering UC09 RED alert
  3. traffic: Simulates heavy congestion / ROAD_CLOSED incident triggering UC10
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8888/api/v1/tracking/telemetry")
TRIP_ID = "f0000000-0000-0000-0000-000000000001"
VEHICLE_ID = "a0000000-0000-0000-0000-000000000001"

WAYPOINTS = {
    "A": (10.762622, 106.795677, "Cat Lai Port Departure"),
    "B": (10.820000, 106.760000, "Vo Chi Cong Corridor"),
    "C": (10.880000, 106.720000, "Tan Van Junction"),
    "D": (10.931215, 106.697426, "VSIP 1 Industrial Park")
}

def post_telemetry(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        BACKEND_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            body = resp.read().decode('utf-8')
            return True, body
    except urllib.error.URLError as e:
        return False, str(e)

def run_simulation(mode="normal"):
    print(f"\n==================================================")
    print(f"  CCADRO GPS SIMULATOR - Mode: [{mode.upper()}]")
    print(f"==================================================")
    print(f"Target Trip: {TRIP_ID}")
    print(f"Backend Endpoint: {BACKEND_URL}\n")

    steps = []
    if mode == "normal":
        print("Scenario: Regular Transit along Planned Route Corridor (A -> B -> C -> D)")
        steps = [
            (WAYPOINTS["A"][0], WAYPOINTS["A"][1], 35.0, 330, "Passing Point A: Departure"),
            (WAYPOINTS["B"][0], WAYPOINTS["B"][1], 55.0, 335, "Passing Point B: On Corridor"),
            (WAYPOINTS["C"][0], WAYPOINTS["C"][1], 50.0, 320, "Passing Point C: Approaching Destination"),
            (WAYPOINTS["D"][0], WAYPOINTS["D"][1], 20.0, 340, "Passing Point D: Arrived VSIP 1")
        ]
    elif mode == "deviation":
        print("Scenario: Unexpected Route Deviation (UC09) - 300m off planned path")
        # Offset lat/lng to simulate ~300m off-route
        steps = [
            (WAYPOINTS["A"][0], WAYPOINTS["A"][1], 40.0, 330, "Point A: Normal start"),
            (WAYPOINTS["B"][0] + 0.0027, WAYPOINTS["B"][1] + 0.0027, 45.0, 90, "Point B: Off-Route 300m (TRIGGER RED ALERT)"),
            (WAYPOINTS["B"][0] + 0.0030, WAYPOINTS["B"][1] + 0.0030, 42.0, 95, "Point B': Continuing Deviation 330m")
        ]
    elif mode == "traffic":
        print("Scenario: Sudden Traffic Congestion / Road Incident (UC10)")
        steps = [
            (WAYPOINTS["A"][0], WAYPOINTS["A"][1], 40.0, 330, "Point A: Departing"),
            (WAYPOINTS["B"][0], WAYPOINTS["B"][1], 5.0, 335, "Point B: Severe Traffic Jam (5 km/h) - ROAD_CLOSED"),
            (WAYPOINTS["B"][0] + 0.0001, WAYPOINTS["B"][1], 0.0, 335, "Point B: Gridlock Stop - Reroute Evaluation Needed")
        ]
    else:
        print(f"Unknown mode: {mode}. Use normal, deviation, or traffic.")
        sys.exit(1)

    for i, (lat, lng, speed, heading, desc) in enumerate(steps, 1):
        timestamp = datetime.now(timezone.utc).isoformat()
        raw_dict = {
            "step": i,
            "desc": desc,
            "mode": mode,
            "deviation_simulated": (mode == "deviation")
        }
        payload = {
            "tripId": TRIP_ID,
            "vehicleId": VEHICLE_ID,
            "timestamp": timestamp,
            "latitude": lat,
            "longitude": lng,
            "speedKmh": speed,
            "headingDegrees": heading,
            "rawPayload": json.dumps(raw_dict)
        }

        print(f"Step {i}/{len(steps)}: {desc}")
        print(f"  Coords: ({lat:.6f}, {lng:.6f}) | Speed: {speed} km/h | Heading: {heading}°")

        success, response = post_telemetry(payload)
        if success:
            print(f"  [OK] Telemetry ingested successfully by CCADRO backend.")
        else:
            print(f"  [SIMULATED] Telemetry generated locally (Backend offline: {response}).")

        time.sleep(0.5)

    print(f"\n[DONE] Simulation scenario '{mode}' completed successfully.\n")

if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "normal"
    run_simulation(mode_arg)
