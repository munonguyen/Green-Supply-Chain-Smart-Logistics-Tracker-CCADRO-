const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8888';

function getStoredToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('ccadro_token');
    }
  } catch (_) {
    // ignore storage errors
  }
  return null;
}

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = getStoredToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
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
  // Identity & RBAC (Port 8080 via Gateway :8888)
  login: (username, password) =>
    fetchJson('/api/v1/auth/token', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  introspect: (token) =>
    fetchJson('/api/v1/auth/introspect', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
  logout: (token) =>
    fetchJson('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
  getUsers: () => fetchJson('/api/v1/users'),
  createUser: (data) =>
    fetchJson('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getRoles: () => fetchJson('/api/v1/roles'),
  getPermissions: () => fetchJson('/api/v1/permissions'),

  // Health
  getHealth: () => fetchJson('/api/v1/health'),
  getSystemHealth: () => fetchJson('/api/v1/health'),
  getActuatorHealth: () => fetchJson('/actuator/health'),

  // Assets, Drivers, Containers & Pre-Trip Safety (Port 8081)
  getVehicles: () => fetchJson('/api/v1/assets/vehicles'),
  getDrivers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.licenseClass) query.append('licenseClass', params.licenseClass);
    const queryString = query.toString();
    return fetchJson(`/api/v1/assets/drivers${queryString ? `?${queryString}` : ''}`);
  },
  getDriverById: (id) => fetchJson(`/api/v1/assets/drivers/${id}`),
  createDriver: (data) =>
    fetchJson('/api/v1/assets/drivers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateDriverProfile: (id, data) =>
    fetchJson(`/api/v1/assets/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateDriverStatus: (id, status) =>
    fetchJson(`/api/v1/assets/drivers/${id}/status?status=${status}`, {
      method: 'PUT'
    }),
  getDriverReviews: (id) => fetchJson(`/api/v1/assets/drivers/${id}/reviews`),
  submitDriverReview: (id, data) =>
    fetchJson(`/api/v1/assets/drivers/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getDriverDispatchMessages: (id) => fetchJson(`/api/v1/assets/drivers/${id}/messages`),
  sendDriverDispatchMessage: (id, data) =>
    fetchJson(`/api/v1/assets/drivers/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  markDriverMessagesAsRead: (id, viewerRole = 'CUSTOMER') =>
    fetchJson(`/api/v1/assets/drivers/${id}/messages/read?viewerRole=${encodeURIComponent(viewerRole)}`, {
      method: 'PUT'
    }),
  getShipperHandovers: () => fetchJson('/api/v1/assets/shipper-handovers'),
  updateShipperHandoverStatus: (containerCode, data) =>
    fetchJson(`/api/v1/assets/shipper-handovers/${containerCode}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  syncShipperWebhook: (containerCode) =>
    fetchJson(`/api/v1/assets/shipper-handovers/${containerCode}/sync-webhook`, {
      method: 'POST'
    }),
  getContainers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.driverId) query.append('driverId', params.driverId);
    const queryString = query.toString();
    return fetchJson(`/api/v1/assets/containers${queryString ? `?${queryString}` : ''}`);
  },
  getContainerByCode: (containerCode) => fetchJson(`/api/v1/assets/containers/${containerCode}`),
  createContainer: (data) =>
    fetchJson('/api/v1/assets/containers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateContainerTelemetry: (containerCode, telemetryData) =>
    fetchJson(`/api/v1/assets/containers/${containerCode}/telemetry`, {
      method: 'PUT',
      body: JSON.stringify(telemetryData)
    }),
  assignContainerTrip: (containerCode, tripData) =>
    fetchJson(`/api/v1/assets/containers/${containerCode}/assign-trip`, {
      method: 'PUT',
      body: JSON.stringify(tripData)
    }),
  submitContainerEpod: (containerCode, epodData) =>
    fetchJson(`/api/v1/assets/containers/${containerCode}/epod`, {
      method: 'POST',
      body: JSON.stringify(epodData)
    }),
  updateContainerStatus: (containerCode, status) =>
    fetchJson(`/api/v1/assets/containers/${containerCode}/status?status=${status}`, {
      method: 'PUT'
    }),
  submitPreTripInspection: (data) =>
    fetchJson('/api/v1/assets/inspections/pre-trip', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Shipments & Dispatch (Port 8082)
  getShipments: () => fetchJson('/api/v1/shipments'),
  getShipmentsByCustomer: (customerId) => fetchJson(`/api/v1/shipments/customer/${customerId}`),
  getShipmentById: (id) => fetchJson(`/api/v1/shipments/${id}`),
  createShipment: (data) =>
    fetchJson('/api/v1/shipments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  createDispatchOrder: (data) =>
    fetchJson('/api/v1/shipments/dispatch', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Routing (Port 8083)
  calculateRoutes: (shipmentId) =>
    fetchJson(`/api/v1/routing/calculate/${shipmentId}`, {
      method: 'POST'
    }),
  planRoutes: (data) =>
    fetchJson('/api/v1/routing/plan', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getRouteCandidates: (shipmentId) => fetchJson(`/api/v1/routing/candidates/${shipmentId}`),
  selectRoute: (data) =>
    fetchJson('/api/v1/routing/select', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Tracking (Port 8084)
  getTrip: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}`),
  getTripTelemetry: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/telemetry`),
  getTripAlerts: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/alerts`),
  ingestTelemetry: (telemetryData) =>
    fetchJson('/api/v1/tracking/telemetry', {
      method: 'POST',
      body: JSON.stringify(telemetryData)
    }),

  // Carbon (Port 8085)
  getEmissionFactors: () => fetchJson('/api/v1/carbon/factors'),
  getCarbonBenchmarks: () => fetchJson('/api/v1/carbon/benchmarks'),

  // Field Incidents & Demerit Governance (Port 8086)
  getIncidents: () => fetchJson('/api/v1/incidents'),
  createIncident: (data) =>
    fetchJson('/api/v1/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  resolveException: (incidentId, data) =>
    fetchJson(`/api/v1/incidents/${incidentId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getDriverDemeritSummary: (driverId) =>
    fetchJson(`/api/v1/incidents/drivers/${driverId}/demerits`),

  // Emergency Notifications (Port 8087 via Gateway :8888)
  getNotifications: () => fetchJson('/api/v1/notifications'),
  dispatchEmergencyNotification: (payload) =>
    fetchJson('/api/v1/notifications/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  broadcastEmergencyNotification: (payload) =>
    fetchJson('/api/v1/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  acknowledgeNotification: (
    id,
    acknowledgedBy = 'DISPATCHER_ADMIN',
    actionNotes = 'Đã tiếp nhận và điều phối phương án xử lý'
  ) =>
    fetchJson(`/api/v1/notifications/${id}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify({ acknowledgedBy, actionNotes })
    }),

  // Payment & Green Billing Service (Port 8088 via Gateway :8888)
  getPayments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.status) query.append('status', params.status);
    if (params.shipmentCode) query.append('shipmentCode', params.shipmentCode);
    const qs = query.toString();
    return fetchJson(`/api/v1/payments${qs ? `?${qs}` : ''}`);
  },
  getPaymentSummary: (customerId) =>
    fetchJson(`/api/v1/payments/summary${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ''}`),
  getPaymentByCode: (transactionCode) => fetchJson(`/api/v1/payments/${transactionCode}`),
  getPaymentLogs: (transactionCode) => fetchJson(`/api/v1/payments/${transactionCode}/logs`),
  createPayment: (payload) =>
    fetchJson('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  confirmPayment: (transactionCode, payload = {}) =>
    fetchJson(`/api/v1/payments/${transactionCode}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  refundPayment: (transactionCode, payload = {}) =>
    fetchJson(`/api/v1/payments/${transactionCode}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  simulatePaymentWebhook: (provider, payload) =>
    fetchJson(`/api/v1/payments/webhook/${encodeURIComponent(provider)}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // B2B Contracts & SLA Settlement (Port 8088 via Gateway :8888)
  getContracts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.contractType) query.append('contractType', params.contractType);
    if (params.status) query.append('status', params.status);
    if (params.shipmentCode) query.append('shipmentCode', params.shipmentCode);
    const qs = query.toString();
    return fetchJson(`/api/v1/contracts${qs ? `?${qs}` : ''}`);
  },
  getContractDetail: (contractNumber) => fetchJson(`/api/v1/contracts/${contractNumber}`),
  getContractEvents: (contractNumber) => fetchJson(`/api/v1/contracts/${contractNumber}/events`),
  createContract: (payload) =>
    fetchJson('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  signContract: (contractNumber, payload = {}) =>
    fetchJson(`/api/v1/contracts/${contractNumber}/sign`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  recordContractSlaEvent: (contractNumber, payload) =>
    fetchJson(`/api/v1/contracts/${contractNumber}/sla-events`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  settleContractWithEpod: (contractNumber, payload = {}) =>
    fetchJson(`/api/v1/contracts/${contractNumber}/settle-epod`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
