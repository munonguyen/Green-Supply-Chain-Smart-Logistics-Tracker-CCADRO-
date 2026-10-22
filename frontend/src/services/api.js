const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `API request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health
  getSystemHealth: () => fetchJson('/api/v1/health'),
  getActuatorHealth: () => fetchJson('/actuator/health'),

  // Shipments
  getShipments: () => fetchJson('/api/v1/shipments'),
  getShipmentById: (id) => fetchJson(`/api/v1/shipments/${id}`),
  createShipment: (data) => fetchJson('/api/v1/shipments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Routing
  calculateRoutes: (shipmentId) => fetchJson(`/api/v1/routing/calculate/${shipmentId}`, {
    method: 'POST'
  }),
  getRouteCandidates: (shipmentId) => fetchJson(`/api/v1/routing/candidates/${shipmentId}`),

  // Tracking
  getTrip: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}`),
  getTripTelemetry: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/telemetry`),
  getTripAlerts: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/alerts`),
  ingestTelemetry: (telemetryData) => fetchJson('/api/v1/tracking/telemetry', {
    method: 'POST',
    body: JSON.stringify(telemetryData)
  }),

  // Carbon
  getEmissionFactors: () => fetchJson('/api/v1/carbon/factors'),
  getCarbonBenchmarks: () => fetchJson('/api/v1/carbon/benchmarks')
};
