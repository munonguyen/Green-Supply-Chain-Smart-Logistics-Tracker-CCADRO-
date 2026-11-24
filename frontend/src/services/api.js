const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8888').replace(/\/+$/, '');

export const gatewayUrl = (path) => `${API_BASE}${path}`;
const identityTimeout = () => AbortSignal.timeout?.(12000);

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

function getStoredRefreshToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('ccadro_refresh_token');
    }
  } catch (_) {
    // ignore storage errors
  }
  return null;
}

function persistRefreshedTokens(result) {
  if (!result?.token || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem('ccadro_token', result.token);
    if (result.refreshToken) {
      window.localStorage.setItem('ccadro_refresh_token', result.refreshToken);
    }
    window.dispatchEvent(
      new CustomEvent('ccadro-token-refreshed', {
        detail: {
          token: result.token,
          refreshToken: result.refreshToken || null,
          result
        }
      })
    );
  } catch (_) {
    // ignore storage errors
  }
}

function isLocalSyntheticToken(tok) {
  if (!tok || typeof tok !== 'string') return false;
  return (
    tok.startsWith('iam-jwt-') ||
    tok.startsWith('customer-jwt-') ||
    tok.startsWith('test-token-')
  );
}

function notifyAuthSessionExpired(reason = 'TOKEN_EXPIRED_OR_BLACKLISTED') {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.removeItem('ccadro_token');
      window.localStorage.removeItem('ccadro_refresh_token');
      window.localStorage.removeItem('ccadro_user');
    }
    window.dispatchEvent(
      new CustomEvent('ccadro-auth-expired', {
        detail: { reason }
      })
    );
  } catch (_) {
    // ignore storage errors
  }
}

let inFlightRefreshPromise = null;

async function performTokenRefresh(refreshToken) {
  const currentToken = getStoredToken();
  const res = await fetch(gatewayUrl('/api/v1/auth/refresh'), {
    signal: identityTimeout(),
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(currentToken && !isLocalSyntheticToken(currentToken)
        ? { Authorization: `Bearer ${currentToken}` }
        : {})
    },
    body: JSON.stringify({ refreshToken })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(payload.message || `API request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const result = payload?.result || payload;
  if (!result?.token) {
    throw new Error('Máy chủ chưa cấp lại phiên đăng nhập.');
  }
  persistRefreshedTokens(result);
  return result;
}

async function refreshSessionSingleFlight(requestedRefreshToken) {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }
  const initialRefreshToken = getStoredRefreshToken() || requestedRefreshToken;
  if (!initialRefreshToken) {
    return null;
  }

  inFlightRefreshPromise = (async () => {
    try {
      const refresh = async () => {
        const latestRefreshToken = getStoredRefreshToken() || requestedRefreshToken || initialRefreshToken;
        if (!latestRefreshToken) return null;
        return performTokenRefresh(latestRefreshToken);
      };
      const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
      if (locks?.request) {
        return await locks.request('ccadro-auth-refresh', async () => {
          const latestRefreshToken = getStoredRefreshToken();
          // Another tab may have completed rotation while this tab waited for the lock.
          if (latestRefreshToken && latestRefreshToken !== initialRefreshToken) {
            const latestToken = getStoredToken();
            if (latestToken) {
              const result = { token: latestToken, refreshToken: latestRefreshToken };
              persistRefreshedTokens(result);
              return result;
            }
          }
          return refresh();
        });
      }
      return await refresh();
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

async function fetchJson(endpoint, options = {}) {
  const url = gatewayUrl(endpoint);
  const token = getStoredToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const { headers: customHeaders = {}, _retriedAfterRefresh = false, ...restOptions } = options;
  const isAuthSessionEndpoint =
    endpoint.includes('/api/v1/auth/token') ||
    endpoint.includes('/api/v1/auth/refresh') ||
    endpoint.includes('/api/v1/auth/logout') ||
    endpoint.includes('/api/v1/auth/register');

  const res = await fetch(url, {
    ...(isAuthSessionEndpoint ? { credentials: 'include' } : {}),
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...customHeaders
    }
  });

  if (
    res.status === 401 &&
    !endpoint.includes('/api/v1/auth/token') &&
    !endpoint.includes('/api/v1/auth/refresh') &&
    !endpoint.includes('/api/v1/auth/logout') &&
    !endpoint.includes('/api/v1/auth/register') &&
    !endpoint.includes('/api/v1/auth/introspect')
  ) {
    if (!_retriedAfterRefresh) {
      let refreshed = null;
      let shouldExpireSession = false;
      try {
        refreshed = await refreshSessionSingleFlight();
      } catch (refreshError) {
        shouldExpireSession = refreshError?.status === 401 || refreshError?.status === 403;
      }
      if (refreshed?.token) {
        return fetchJson(endpoint, {
          ...options,
          _retriedAfterRefresh: true,
          headers: {
            ...customHeaders,
            Authorization: `Bearer ${refreshed.token}`
          }
        });
      }
      if (!refreshed && !shouldExpireSession && !getStoredRefreshToken()) {
        shouldExpireSession = true;
      }
      if (shouldExpireSession && token && !isLocalSyntheticToken(token) && import.meta.env.VITE_DEMO_MODE !== 'true') {
        notifyAuthSessionExpired('SESSION_EXPIRED_OR_BLACKLISTED');
      }
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const error = new Error(errorBody.message || `API request failed with status ${res.status}`);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) {
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const chatSocketUrl = () => API_BASE;
export const chatSocketPath = () => new URL('/api/v1/chat/socket.io/', API_BASE).pathname;

export const chatApi = {
  socketTicket: () => fetchJson('/api/v1/chat/socket-ticket', { method: 'POST' }),
  contacts: () => fetchJson('/api/v1/chat/contacts'),
  conversations: () => fetchJson('/api/v1/chat/conversations'),
  create: (body) =>
    fetchJson('/api/v1/chat/conversations', { method: 'POST', body: JSON.stringify(body) }),
  messages: (id, cursor = '') =>
    fetchJson(
      `/api/v1/chat/conversations/${encodeURIComponent(id)}/messages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
  send: (id, body) =>
    fetchJson(`/api/v1/chat/conversations/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  read: (id, throughMessageId) =>
    fetchJson(`/api/v1/chat/conversations/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
      body: JSON.stringify({ throughMessageId })
    }),
  members: (id, members) =>
    fetchJson(`/api/v1/chat/conversations/${encodeURIComponent(id)}/members`, {
      method: 'POST',
      body: JSON.stringify({ members })
    }),
  reaction: (id, messageId, emoji, active) =>
    fetchJson(
      `/api/v1/chat/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/reaction`,
      { method: 'PUT', body: JSON.stringify({ emoji, active }) }
    ),
  preferences: () => fetchJson('/api/v1/chat/preferences'),
  preference: (id, body) =>
    fetchJson(`/api/v1/chat/conversations/${encodeURIComponent(id)}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
};

export const api = {
  createPaymentCheckoutSession: (code, provider) =>
    fetchJson(
      `/api/v1/payments/${encodeURIComponent(code)}/checkout-session?provider=${encodeURIComponent(provider)}`,
      { method: 'POST' }
    ),
  getPaymentEvidence: (code) => fetchJson(`/api/v1/payments/${encodeURIComponent(code)}/evidence`),
  // Identity & RBAC (Port 8080 via Gateway :8888)
  login: (username, password) =>
    fetchJson('/api/v1/auth/token', {
      method: 'POST',
      signal: identityTimeout(),
      body: JSON.stringify({ username, password })
    }),
  introspect: (token) =>
    fetchJson('/api/v1/auth/introspect', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
  refreshToken: (refreshToken) => refreshSessionSingleFlight(refreshToken),
  logout: (token, refreshToken) =>
    fetchJson('/api/v1/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(refreshToken ? { token, refreshToken } : { token })
    }),
  logoutAll: () =>
    fetchJson('/api/v1/auth/logout-all', {
      method: 'POST'
    }),
  getActiveSessions: () => fetchJson('/api/v1/auth/sessions'),
  revokeSession: (sessionId) =>
    fetchJson(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    }),
  registerCustomer: (data) =>
    fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  changePassword: (currentPassword, newPassword) =>
    fetchJson('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),
  getOwnProfile: (token) =>
    fetchJson('/api/v1/users/me', {
      signal: identityTimeout(),
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }),
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/users${qs ? `?${qs}` : ''}`);
  },
  softDeleteUser: (id) =>
    fetchJson(`/api/v1/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreUser: (id) =>
    fetchJson(`/api/v1/users/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  createUser: (data) =>
    fetchJson('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateUser: (id, data) =>
    fetchJson(`/api/v1/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  unlockUser: (id) =>
    fetchJson(`/api/v1/users/${encodeURIComponent(id)}/unlock`, { method: 'POST' }),
  resetUserPassword: (id, newPassword) =>
    fetchJson(`/api/v1/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    }),
  getCompanies: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/companies${qs ? `?${qs}` : ''}`);
  },
  createCompany: (data) =>
    fetchJson('/api/v1/companies', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCompany: (id, data) =>
    fetchJson(`/api/v1/companies/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  softDeleteCompany: (id) =>
    fetchJson(`/api/v1/companies/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreCompany: (id) =>
    fetchJson(`/api/v1/companies/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  getRoles: () => fetchJson('/api/v1/roles'),
  getPermissions: () => fetchJson('/api/v1/permissions'),

  // Branches Directory (Identity Service :8080 via Gateway :8888)
  getBranches: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.region) query.append('region', params.region);
    if (params.status) query.append('status', params.status);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/branches${qs ? `?${qs}` : ''}`);
  },
  getBranchById: (id) => fetchJson(`/api/v1/branches/${encodeURIComponent(id)}`),
  createBranch: (data) =>
    fetchJson('/api/v1/branches', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateBranch: (id, data) =>
    fetchJson(`/api/v1/branches/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  softDeleteBranch: (id) =>
    fetchJson(`/api/v1/branches/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreBranch: (id) =>
    fetchJson(`/api/v1/branches/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

  // Staff Directory by Role (Identity Service :8080 via Gateway :8888)
  getStaff: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.roleCode) query.append('roleCode', params.roleCode);
    if (params.staffCategory) query.append('staffCategory', params.staffCategory);
    if (params.verificationStatus) query.append('verificationStatus', params.verificationStatus);
    if (params.branchId) query.append('branchId', params.branchId);
    if (params.status) query.append('status', params.status);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/staff${qs ? `?${qs}` : ''}`);
  },
  getStaffRoleSummary: () => fetchJson('/api/v1/staff/summary-by-role'),
  getStaffById: (id) => fetchJson(`/api/v1/staff/${encodeURIComponent(id)}`),
  createStaff: (data) =>
    fetchJson('/api/v1/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateStaff: (id, data) =>
    fetchJson(`/api/v1/staff/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  verifyStaff: (id, data) =>
    fetchJson(`/api/v1/staff/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  softDeleteStaff: (id) =>
    fetchJson(`/api/v1/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreStaff: (id) =>
    fetchJson(`/api/v1/staff/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

  // Health
  getHealth: () => fetchJson('/api/v1/health'),
  getSystemHealth: () => fetchJson('/api/v1/health'),
  getDataInventory: () => fetchJson("/api/v1/admin/system/data"),
  getDiscoveredServiceHealth: () => fetchJson('/api/v1/admin/system/health'),
  getActuatorHealth: () => fetchJson('/actuator/health'),

  // Assets, Drivers, Containers & Pre-Trip Safety (Port 8081)
  getVehicles: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/assets/vehicles${qs ? `?${qs}` : ''}`);
  },
  getDrivers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.licenseClass) query.append('licenseClass', params.licenseClass);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const queryString = query.toString();
    return fetchJson(`/api/v1/assets/drivers${queryString ? `?${queryString}` : ''}`);
  },
  getDispatchDrivers: () => fetchJson("/api/v1/assets/drivers/dispatch-eligibility"),
  getMyDriverProfile: () => fetchJson('/api/v1/assets/drivers/me'),
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
    fetchJson(
      `/api/v1/assets/drivers/${id}/messages/read?viewerRole=${encodeURIComponent(viewerRole)}`,
      {
        method: 'PUT'
      }
    ),
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
  getDistributionHubs: () => fetchJson('/api/v1/assets/shipper-hubs'),
  getHubLocalShippers: (hubCode) =>
    fetchJson(
      `/api/v1/assets/shipper-hubs/shippers${hubCode ? `?hubCode=${encodeURIComponent(hubCode)}` : ''}`
    ),
  getContainerManifestItems: (params = {}, options) => {
    const query = new URLSearchParams();
    if (params.hubCode) query.append('hubCode', params.hubCode);
    if (params.containerCode) query.append('containerCode', params.containerCode);
    const qs = query.toString();
    return fetchJson(`/api/v1/assets/shipper-hubs/manifest-items${qs ? `?${qs}` : ''}`, options);
  },
  createContainerManifestItem: (containerCode, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/manifest-items`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  ingestContainerManifest: (containerCode) =>
    fetchJson(
      `/api/v1/assets/shipper-hubs/containers/${encodeURIComponent(containerCode)}/ingest-manifest`,
      {
        method: 'POST'
      }
    ),
  autoDispatchByProximity: (params = {}) => {
    const query = new URLSearchParams();
    if (params.hubCode) query.append('hubCode', params.hubCode);
    if (params.containerCode) query.append('containerCode', params.containerCode);
    const qs = query.toString();
    return fetchJson(`/api/v1/assets/shipper-hubs/auto-dispatch${qs ? `?${qs}` : ''}`, {
      method: 'POST'
    });
  },
  assignManifestItemToShipper: (itemCode, shipperCode) =>
    fetchJson(`/api/v1/assets/shipper-hubs/manifest-items/${encodeURIComponent(itemCode)}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ shipperCode })
    }),
  updateManifestItemStatus: (itemCode, dispatchStatus, recipientPodName) =>
    fetchJson(`/api/v1/assets/shipper-hubs/manifest-items/${encodeURIComponent(itemCode)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ dispatchStatus, recipientPodName })
    }),
  getContainers: (params = {}, options) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.driverId) query.append('driverId', params.driverId);
    const queryString = query.toString();
    return fetchJson(`/api/v1/assets/containers${queryString ? `?${queryString}` : ''}`, options);
  },
  getContainerByCode: (containerCode) => fetchJson(`/api/v1/assets/containers/${containerCode}`),
  getTransportHistory: (resource, id, { page = 0, query = '' } = {}) =>
    fetchJson(`/api/v1/assets/${resource}/${encodeURIComponent(id)}/transport-history?${new URLSearchParams({ page, q: query })}`),
  getContainerControl: (containerCode) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/control`),
  startContainerControlRound: (containerCode, expectedRoundNumber) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/control/rounds`, {
      method: 'POST',
      body: JSON.stringify({ expectedRoundNumber })
    }),
  confirmContainerControlStage: (containerCode, stage, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/control/stages/${stage}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getVehicleFuelCatalog: () => fetchJson('/api/v1/assets/vehicle-fuels'),
  saveVehicleFuelProfile: (id, body) => fetchJson(`/api/v1/assets/vehicles/${encodeURIComponent(id)}/fuel-profile`, { method: 'PUT', body: JSON.stringify(body) }),
  assessVehicleFuel: (id, body) => fetchJson(`/api/v1/assets/vehicles/${encodeURIComponent(id)}/fuel-assessment`, { method: 'POST', body: JSON.stringify(body) }),
  getFuelStations: () => fetchJson('/api/v1/assets/fuel-stations'),
  createFuelStation: (body) => fetchJson('/api/v1/assets/fuel-stations', { method: 'POST', body: JSON.stringify(body) }),
  authorizeFuelPump: (stationCode, body) => fetchJson(`/api/v1/assets/fuel-stations/${encodeURIComponent(stationCode)}/authorize`, { method: 'POST', body: JSON.stringify(body) }),
  ingestFuelTransactions: (stationCode, batch) => fetchJson(`/api/v1/assets/fuel-stations/${encodeURIComponent(stationCode)}/transactions`, { method: 'POST', body: JSON.stringify(batch) }),
  getFuelTransactions: () => fetchJson('/api/v1/assets/fuel-transactions'),
  getContainerFuelUnits: () => fetchJson('/api/v1/assets/container-fuel-units'),
  batchOptimizeVehicleFuels: (body) => fetchJson('/api/v1/assets/vehicle-fuels/batch-optimize', { method: 'POST', body: JSON.stringify(body) }),
  getContainerInspectionOverview: () => fetchJson('/api/v1/assets/container-inspections'),
  getContainerSafetyInspection: (containerCode) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/safety-inspections`),
  submitContainerSafetyInspection: (containerCode, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/safety-inspections`, {
      method: 'POST', body: JSON.stringify(data)
    }),
  createContainer: (data) =>
    fetchJson('/api/v1/assets/containers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  linkContainerDeviceTrip: (code, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(code)}/device-connection/link-trip`, {
      method: 'POST', body: JSON.stringify(data)
    }),
  getContainerDeviceConnection: (code) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(code)}/device-connection`),
  configureContainerDevice: (code, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(code)}/device-connection`, {
      method: 'PUT', body: JSON.stringify(data)
    }),
  disableContainerDevice: (code) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(code)}/device-connection`, { method: 'DELETE' }),
  getContainerDispatchNotes: (containerCode) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/dispatch-notes`),
  createContainerDispatchNote: (containerCode, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/dispatch-notes`, {
      method: 'POST', body: JSON.stringify(data)
    }),
  updateContainerProfile: (containerCode, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateContainerCscData: (containerCode, data) =>
    fetchJson(`/api/v1/assets/containers/${encodeURIComponent(containerCode)}/csc`, {
      method: 'PUT',
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
  getShipments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/shipments${qs ? `?${qs}` : ''}`);
  },
  getShipmentsByCustomer: (customerId, params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/shipments/customer/${customerId}${qs ? `?${qs}` : ''}`);
  },
  softDeleteShipment: (id) =>
    fetchJson(`/api/v1/shipments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  restoreShipment: (id) =>
    fetchJson(`/api/v1/shipments/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  getShipmentById: (id) => fetchJson(`/api/v1/shipments/${id}`),
  createShipment: (data) =>
    fetchJson('/api/v1/shipments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getShipmentDispatchOrder: (shipmentId) =>
    fetchJson(`/api/v1/shipments/${encodeURIComponent(shipmentId)}/dispatch`),
  createDispatchOrder: (data) =>
    fetchJson('/api/v1/shipments/dispatch', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Routing (Port 8083)
  calculateRoutes: (shipmentId, params = {}) => {
    const query = new URLSearchParams(params);
    const qs = query.toString();
    return fetchJson(`/api/v1/routing/calculate/${encodeURIComponent(shipmentId)}${qs ? `?${qs}` : ''}`, {
      method: 'POST'
    });
  },
  planRoutes: (data) =>
    fetchJson('/api/v1/routing/plan', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getRouteCandidates: (shipmentId) => fetchJson(`/api/v1/routing/candidates/${shipmentId}`),
  getActiveRouteVersion: (shipmentId) =>
    fetchJson(`/api/v1/routing/versions/${encodeURIComponent(shipmentId)}/active`),
  getRouteVersions: (shipmentId) =>
    fetchJson(`/api/v1/routing/versions/${encodeURIComponent(shipmentId)}`),
  selectRoute: (data) =>
    fetchJson('/api/v1/routing/select', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Tracking (Port 8084)
  getLiveFleetTelemetry: (params = {}, options = {}) => {
    const query = new URLSearchParams();
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.driverId) query.append('driverId', params.driverId);
    if (params.q) query.append('q', params.q);
    const qs = query.toString();
    return fetchJson(`/api/v1/tracking/fleet/live${qs ? `?${qs}` : ''}`, options);
  },
  getLiveTripTelemetry: (tripId) =>
    fetchJson(`/api/v1/tracking/trips/${encodeURIComponent(tripId)}/live`),
  getTrips: (params = {}) => {
    const query = new URLSearchParams();
    if (params.driverId) query.append('driverId', params.driverId);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/tracking/trips${qs ? `?${qs}` : ''}`);
  },
  createTrip: (data) =>
    fetchJson('/api/v1/tracking/trips', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  startTrip: (tripId) =>
    fetchJson(`/api/v1/tracking/trips/${encodeURIComponent(tripId)}/start`, { method: 'PUT' }),
  completeTrip: (tripId) =>
    fetchJson(`/api/v1/tracking/trips/${encodeURIComponent(tripId)}/complete`, { method: 'PUT' }),
  getTrip: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}`),
  getTripTelemetry: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/telemetry`),
  getTripAlerts: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/alerts`),
  getTripProposals: (tripId) => fetchJson(`/api/v1/tracking/trips/${tripId}/proposals`),
  calculateTripReroute: (tripId) => fetchJson(`/api/v1/tracking/trips/${encodeURIComponent(tripId)}/proposals/calculate`, { method: 'POST' }),
  decideRerouteProposal: (proposalId, decision) =>
    fetchJson(`/api/v1/tracking/reroute-proposals/${encodeURIComponent(proposalId)}/decision`, {
      method: 'PUT',
      body: JSON.stringify({ decision })
    }),
  ingestTelemetry: (telemetryData) =>
    fetchJson('/api/v1/tracking/telemetry', {
      method: 'POST',
      body: JSON.stringify(telemetryData)
    }),

  // Carbon (Port 8085)
  getEmissionFactors: () => fetchJson('/api/v1/carbon/factors'),
  submitCarbonPod: (payload) =>
    fetchJson('/api/v1/carbon/pod', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getCarbonBenchmarks: () => fetchJson('/api/v1/carbon/benchmarks'),
  getTripCarbon: (tripId) => fetchJson(`/api/v1/carbon/trips/${encodeURIComponent(tripId)}`),
  calculateTripCarbon: (payload) =>
    fetchJson('/api/v1/carbon/emissions/calculate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  evaluateTripBenchmark: (tripId) =>
    fetchJson(`/api/v1/carbon/trips/${encodeURIComponent(tripId)}/benchmark/evaluate`, {
      method: 'POST'
    }),

  // Field Incidents & Demerit Governance (Port 8086)
  getIncidents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/incidents${qs ? `?${qs}` : ''}`);
  },
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
    fetchJson(`/api/v1/incidents/drivers/${driverId}/demerit-summary`),

  // Emergency Notifications (Port 8087 via Gateway :8888)
  getNotifications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    const qs = query.toString();
    return fetchJson(`/api/v1/notifications${qs ? `?${qs}` : ''}`);
  },
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
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/payments${qs ? `?${qs}` : ''}`);
  },
  softDeletePayment: (transactionCode) =>
    fetchJson(`/api/v1/payments/${encodeURIComponent(transactionCode)}`, { method: 'DELETE' }),
  restorePayment: (transactionCode) =>
    fetchJson(`/api/v1/payments/${encodeURIComponent(transactionCode)}/restore`, {
      method: 'POST'
    }),
  getPaymentSummary: (customerId) =>
    fetchJson(
      `/api/v1/payments/summary${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ''}`
    ),
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
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/contracts${qs ? `?${qs}` : ''}`);
  },
  softDeleteContract: (contractNumber) =>
    fetchJson(`/api/v1/contracts/${encodeURIComponent(contractNumber)}`, { method: 'DELETE' }),
  restoreContract: (contractNumber) =>
    fetchJson(`/api/v1/contracts/${encodeURIComponent(contractNumber)}/restore`, {
      method: 'POST'
    }),
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
    }),

  // Hub & Last-Mile Shipper Service (port 8089 via API Gateway — Real-time PostgreSQL + SSE)
  getHubShipperStreamUrl: ({ hubCode, token } = {}) => {
    const params = new URLSearchParams();
    if (hubCode && hubCode !== 'ALL') params.set('hubCode', hubCode);
    if (token) params.set('token', token);
    const qs = params.toString();
    return gatewayUrl(`/api/v1/hub-shipper/stream${qs ? `?${qs}` : ''}`);
  },
  getHubShipperWorkspace: ({ username, hubCode, shipperCode, q, includeDeleted } = {}) => {
    const params = new URLSearchParams();
    if (username) params.set('username', username);
    if (hubCode) params.set('hubCode', hubCode);
    if (shipperCode) params.set('shipperCode', shipperCode);
    if (q) params.set('q', q);
    if (includeDeleted) params.set('includeDeleted', 'true');
    const qs = params.toString();
    return fetchJson(`/api/v1/hub-shipper/workspace${qs ? `?${qs}` : ''}`);
  },
  batchPickupHubItems: (itemCodes = [], packageCondition = 'INTACT') =>
    fetchJson('/api/v1/hub-shipper/batch-pickup', {
      method: 'POST',
      body: JSON.stringify({ itemCodes, packageCondition })
    }),
  checkInHubShipperShift: (shipperCode) =>
    fetchJson(`/api/v1/hub-shipper/shippers/${encodeURIComponent(shipperCode)}/check-in-shift`, {
      method: 'POST'
    }),
  endHubShipperShift: (shipperCode) =>
    fetchJson(`/api/v1/hub-shipper/shippers/${encodeURIComponent(shipperCode)}/end-shift`, {
      method: 'POST'
    }),
  remitHubShipperCod: (payload) =>
    fetchJson('/api/v1/hub-shipper/cod-remittances', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  executeHubItemFieldAction: (itemCode, payload) =>
    fetchJson(`/api/v1/hub-shipper/items/${encodeURIComponent(itemCode)}/field-action`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateHubShipperTelemetry: (shipperCode, payload) =>
    fetchJson(`/api/v1/hub-shipper/shippers/${encodeURIComponent(shipperCode)}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  settleHubShipperShift: (payload) =>
    fetchJson('/api/v1/hub-shipper/settlements', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  softDeleteHubManifestItem: (itemCode) =>
    fetchJson(`/api/v1/hub-shipper/items/${encodeURIComponent(itemCode)}`, { method: 'DELETE' }),
  restoreHubManifestItem: (itemCode) =>
    fetchJson(`/api/v1/hub-shipper/items/${encodeURIComponent(itemCode)}/restore`, {
      method: 'POST'
    }),
  assignHubTaskRange: (payload) =>
    fetchJson('/api/v1/hub-shipper/assign-range', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  submitItemPhotoPod: (itemCode, payload) =>
    fetchJson(`/api/v1/hub-shipper/items/${encodeURIComponent(itemCode)}/photo-pod`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateHubShipperProfile: (shipperCode, payload) =>
    fetchJson(`/api/v1/hub-shipper/shippers/${encodeURIComponent(shipperCode)}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  verifyHubShipperKyc: (shipperCode, payload) =>
    fetchJson(`/api/v1/hub-shipper/shippers/${encodeURIComponent(shipperCode)}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Hub IAM Dedicated Accounts & Security Audit (identity-service :8080 via Gateway :8888)
  getHubIamAccounts: (hubCode, params = {}) => {
    const query = new URLSearchParams();
    if (hubCode) query.append('hubCode', hubCode);
    if (params.q) query.append('q', params.q);
    if (params.includeDeleted) query.append('includeDeleted', 'true');
    const qs = query.toString();
    return fetchJson(`/api/v1/auth/hub-accounts${qs ? `?${qs}` : ''}`);
  },
  softDeleteHubIamAccount: (username) =>
    fetchJson(`/api/v1/auth/hub-accounts/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  restoreHubIamAccount: (username) =>
    fetchJson(`/api/v1/auth/hub-accounts/${encodeURIComponent(username)}/restore`, {
      method: 'POST'
    }),
  createHubIamAccount: (payload) =>
    fetchJson('/api/v1/auth/hub-accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateHubIamAccountStatus: (username, status) =>
    fetchJson(`/api/v1/auth/hub-accounts/${encodeURIComponent(username)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  getHubAuthAuditLogs: (hubCode) => {
    const qs = hubCode ? `?hubCode=${encodeURIComponent(hubCode)}` : '';
    return fetchJson(`/api/v1/auth/hub-audit-logs${qs}`);
  },

  // Public Career Application & Admin Onboarding (identity-service :8080 via Gateway :8888)
  getCareerOpenings: () => fetchJson('/api/v1/careers/openings', { skipAuthRefresh: true }),
  submitPublicApplication: (payload) =>
    fetchJson('/api/v1/careers/apply', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify(payload)
    }),
  lookupCareerStatus: (applicationCode, credential) => {
    const query = new URLSearchParams();
    if (applicationCode) query.append('applicationCode', applicationCode);
    if (credential) query.append('credential', credential);
    return fetchJson(`/api/v1/careers/status?${query.toString()}`, { skipAuthRefresh: true });
  },
  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.roleCode && params.roleCode !== 'ALL') query.append('roleCode', params.roleCode);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.branchId) query.append('branchId', params.branchId);
    const qs = query.toString();
    return fetchJson(`/api/v1/applications${qs ? `?${qs}` : ''}`);
  },
  advanceApplicationStage: (id, payload) =>
    fetchJson(`/api/v1/applications/${encodeURIComponent(id)}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  approveAndOnboardApplication: (id, payload) =>
    fetchJson(`/api/v1/applications/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  rejectApplication: (id, reason) => {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return fetchJson(`/api/v1/applications/${encodeURIComponent(id)}/reject${qs}`, {
      method: 'POST'
    });
  }
};
