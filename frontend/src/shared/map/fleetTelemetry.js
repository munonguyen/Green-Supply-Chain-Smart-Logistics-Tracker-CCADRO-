import { extractGeoJsonLineStringPoints } from '../../services/roadRoutingService';

const numeric = (value) => value !== null && value !== undefined && typeof value !== 'boolean'
  && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export function gpsPosition(latitude, longitude) {
  const lat = numeric(latitude), lon = numeric(longitude);
  return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
}
export const telemetryKey = (item) => item.containerId ? `container:${item.containerId}`
  : item.containerCode ? `container:${item.containerCode}` : item.tripId ? `trip:${item.tripId}`
    : item.vehicleId ? `vehicle:${item.vehicleId}` : item.vehicleCode ? `vehicle:${item.vehicleCode}` : null;
export const telemetryTime = (value) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
export const isGpsStale = (item, now) => telemetryTime(item.lastTelemetryAt) === null
  || now - telemetryTime(item.lastTelemetryAt) > 120_000;

export function mapFleetTelemetry(item) {
  const key = telemetryKey(item);
  if (!key) return null;
  const nonnegative = (value) => { const n = numeric(value); return n !== null && n >= 0 ? n : null; };
  return {
    ...item, key,
    vehicleCode: item.vehicleCode || item.containerCode || item.tripCode || 'Chưa có mã xe',
    plate: item.licensePlate || 'Chưa có biển số',
    originName: item.originName || 'Chưa có điểm đi', destinationName: item.destinationName || 'Chưa có điểm đến',
    currentPos: gpsPosition(item.latitude, item.longitude),
    liveSpeed: nonnegative(item.speedKmh), heading: numeric(item.headingDegrees) ?? 0,
    remainingKm: nonnegative(item.remainingDistanceKm), etaMins: nonnegative(item.etaMinutes),
    progressPercent: numeric(item.progressPercent) === null ? null : Math.min(100, Math.max(0, Number(item.progressPercent))),
    tempC: numeric(item.temperatureC),
    waypoints: extractGeoJsonLineStringPoints(item.routeWaypoints),
    color: '#10b981'
  };
}

// Full snapshots are authoritative (including []); individual SSE messages may be partial.
export function reconcileFleet(previous, incoming, { partial = false, customerId = null } = {}) {
  const byKey = new Map(previous.map((item) => [item.key, item]));
  const next = partial ? new Map(byKey) : new Map();
  for (const raw of incoming) {
    if (!raw || typeof raw !== 'object' || !telemetryKey(raw)) continue;
    if (customerId && String(raw.customerId || '').toLowerCase() !== String(customerId).toLowerCase()) continue;
    const key = telemetryKey(raw), old = byKey.get(key);
    const oldTime = telemetryTime(old?.lastTelemetryAt), newTime = telemetryTime(raw.lastTelemetryAt);
    if (oldTime !== null && newTime !== null && newTime < oldTime) { next.set(key, old); continue; }
    const mapped = mapFleetTelemetry(partial && old ? { ...old, ...raw } : raw);
    if (old && JSON.stringify(old.waypoints) === JSON.stringify(mapped.waypoints)) mapped.waypoints = old.waypoints;
    next.set(key, mapped);
  }
  // Preserve list order while telemetry changes so selection and scroll position stay stable.
  return [...previous.filter((item) => next.has(item.key)).map((item) => {
    const updated = next.get(item.key); next.delete(item.key); return updated;
  }), ...next.values()];
}
