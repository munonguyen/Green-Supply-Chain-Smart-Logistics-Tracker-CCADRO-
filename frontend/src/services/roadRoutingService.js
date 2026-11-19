import realRoadData from './realRoadData.json';

/**
 * Standard GPS coordinate anchors for Southern Vietnam Logistics Hubs.
 */
export const HUB_NODES = {
  vsip: {
    id: 'vsip',
    label: 'KCN VSIP 1',
    area: 'Thuận An, Bình Dương',
    address: 'Số 8 Đại lộ Hữu Nghị, KCN VSIP 1, Thuận An, Bình Dương',
    coords: [10.9242, 106.7145]
  },
  songthan: {
    id: 'songthan',
    label: 'ICD Sóng Thần',
    area: 'Dĩ An, Bình Dương',
    address: 'Khu phố Bình Đường 3, Phường An Bình, Dĩ An, Bình Dương',
    coords: [10.8925, 106.7428]
  },
  tanbinh: {
    id: 'tanbinh',
    label: 'KCN Tân Bình',
    area: 'Tân Phú, TP. HCM',
    address: 'Đường Tây Thạnh, KCN Tân Bình, Quận Tân Phú, TP. HCM',
    coords: [10.8184, 106.6286]
  },
  catlai: {
    id: 'catlai',
    label: 'Cảng Cát Lái',
    area: 'TP. Thủ Đức, TP. HCM',
    address: '1295B Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức, TP. HCM',
    coords: [10.7623, 106.7824]
  },
  nhontrach: {
    id: 'nhontrach',
    label: 'KCN Nhơn Trạch',
    area: 'Nhơn Trạch, Đồng Nai',
    address: 'Đường Tôn Đức Thắng (25B), KCN Nhơn Trạch, Đồng Nai',
    coords: [10.7352, 106.8954]
  },
  hiepphuoc: {
    id: 'hiepphuoc',
    label: 'Cảng Hiệp Phước',
    area: 'Nhà Bè, TP. HCM',
    address: 'Khu B, Đường số 1, KCN Hiệp Phước, Nhà Bè, TP. HCM',
    coords: [10.6354, 106.7522]
  },
  caimep: {
    id: 'caimep',
    label: 'Cảng Cái Mép',
    area: 'Phú Mỹ, Bà Rịa – Vũng Tàu',
    address: 'Khu phố Tân Lộc, Phường Phước Hòa, Thị xã Phú Mỹ, Bà Rịa – Vũng Tàu',
    coords: [10.5256, 107.0225]
  },
  vsip2: {
    id: 'vsip2',
    label: 'KCN VSIP 2',
    area: 'TP. Mới, Bình Dương',
    address: 'Đường Dân Chủ, KCN VSIP 2, TP. Thủ Dầu Một, Bình Dương',
    coords: [11.0542, 106.6987]
  },
  amata: {
    id: 'amata',
    label: 'KCN Amata Biên Hòa',
    area: 'Biên Hòa, Đồng Nai',
    address: 'Quốc lộ 1A, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    coords: [10.9412, 106.8821]
  },
  longhau: {
    id: 'longhau',
    label: 'KCN Long Hậu',
    area: 'Cần Giuộc, Long An',
    address: 'Ấp 3, Xã Long Hậu, Huyện Cần Giuộc, Long An',
    coords: [10.6285, 106.7124]
  },
  phuoclong: {
    id: 'phuoclong',
    label: 'Cảng ICD Phước Long',
    area: 'TP. Thủ Đức, TP. HCM',
    address: 'Km 9 Xa lộ Hà Nội, Phường Phước Long A, TP. Thủ Đức, TP. HCM',
    coords: [10.8245, 106.7689]
  },
  tantao: {
    id: 'tantao',
    label: 'KCN Tân Tạo',
    area: 'Bình Tân, TP. HCM',
    address: 'Quốc lộ 1A, Phường Tân Tạo A, Quận Bình Tân, TP. HCM',
    coords: [10.7512, 106.5824]
  }
};

/**
 * Calculates geodesic distance between two [lat, lon] points in meters using Haversine.
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find the nearest hub key given a [lat, lon] coordinate.
 */
export function findNearestHubId(lat, lon) {
  let nearest = 'catlai';
  let minDist = Infinity;
  Object.entries(HUB_NODES).forEach(([id, hub]) => {
    const d = haversineDistanceMeters(lat, lon, hub.coords[0], hub.coords[1]);
    if (d < minDist) {
      minDist = d;
      nearest = id;
    }
  });
  return nearest;
}

/**
 * Normalize any input (id string, Vietnamese name, or [lat, lon]) to standard hub ID.
 * Robust against any NFD/NFC unicode diacritics or uppercase formatting.
 */
export function normalizeHubKey(input, fallback = 'catlai') {
  if (!input) return fallback;
  if (Array.isArray(input) && input.length >= 2) {
    return findNearestHubId(input[0], input[1]);
  }
  const raw = String(input).toLowerCase().trim();
  if (HUB_NODES[raw]) return raw;

  const stripped = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();

  if (HUB_NODES[stripped]) return stripped;
  if (stripped.includes('vsip 2') || stripped.includes('vsip2')) return 'vsip2';
  if (stripped.includes('amata')) return 'amata';
  if (stripped.includes('long hau') || stripped.includes('longhau')) return 'longhau';
  if (stripped.includes('phuoc long') || stripped.includes('phuoclong')) return 'phuoclong';
  if (stripped.includes('tan tao') || stripped.includes('tantao')) return 'tantao';
  if (stripped.includes('cat lai') || stripped.includes('catlai')) return 'catlai';
  if (stripped.includes('vsip')) return 'vsip';
  if (stripped.includes('song than') || stripped.includes('songthan')) return 'songthan';
  if (stripped.includes('tan binh') || stripped.includes('tanbinh')) return 'tanbinh';
  if (stripped.includes('nhon trach') || stripped.includes('nhontrach')) return 'nhontrach';
  if (stripped.includes('hiep phuoc') || stripped.includes('hiepphuoc')) return 'hiepphuoc';
  if (stripped.includes('cai mep') || stripped.includes('caimep')) return 'caimep';
  return fallback;
}

/**
 * Retrieve authentic road geometry turn-by-turn points between any two hubs.
 * Returns { points: [[lat, lng], ...], distanceKm: number, durationMinutes: number }
 */
export function getRealRoadRoute(originId, destId) {
  const oKey = normalizeHubKey(originId, 'catlai');
  const dKey = normalizeHubKey(destId, 'vsip');

  // Handle same origin and destination (depot local turnaround)
  if (oKey === dKey) {
    const pt = HUB_NODES[oKey]?.coords || [10.7623, 106.7824];
    return {
      distanceKm: 2.8,
      durationMinutes: 7,
      points: [
        pt,
        [pt[0] + 0.0025, pt[1] + 0.002],
        [pt[0] + 0.004, pt[1] + 0.0005],
        [pt[0] + 0.002, pt[1] - 0.002],
        pt
      ]
    };
  }

  const pairKey = `${oKey}_${dKey}`;

  if (realRoadData[pairKey] && realRoadData[pairKey].points?.length > 0) {
    return realRoadData[pairKey];
  }

  // Check reverse route if direct not found
  const revKey = `${dKey}_${oKey}`;
  if (realRoadData[revKey] && realRoadData[revKey].points?.length > 0) {
    const rev = realRoadData[revKey];
    return {
      distanceKm: rev.distanceKm,
      durationMinutes: rev.durationMinutes,
      points: [...rev.points].reverse()
    };
  }

  // Primary hub fallback for satellite zones
  const primaryFallback = {
    vsip2: 'vsip',
    amata: 'songthan',
    longhau: 'hiepphuoc',
    phuoclong: 'catlai',
    tantao: 'tanbinh'
  };

  const baseO = primaryFallback[oKey] || oKey;
  const baseD = primaryFallback[dKey] || dKey;
  const basePair = `${baseO}_${baseD}`;
  const baseRev = `${baseD}_${baseO}`;

  if (realRoadData[basePair] && realRoadData[basePair].points?.length > 0) {
    const base = realRoadData[basePair];
    const startPt = HUB_NODES[oKey]?.coords || base.points[0];
    const endPt = HUB_NODES[dKey]?.coords || base.points[base.points.length - 1];
    return {
      distanceKm:
        Math.round(
          (base.distanceKm + (oKey !== baseO ? 8.2 : 0) + (dKey !== baseD ? 8.2 : 0)) * 10
        ) / 10,
      durationMinutes: Math.round(
        base.durationMinutes + (oKey !== baseO ? 12 : 0) + (dKey !== baseD ? 12 : 0)
      ),
      points: [startPt, ...base.points, endPt]
    };
  }

  if (realRoadData[baseRev] && realRoadData[baseRev].points?.length > 0) {
    const base = realRoadData[baseRev];
    const startPt = HUB_NODES[oKey]?.coords || base.points[base.points.length - 1];
    const endPt = HUB_NODES[dKey]?.coords || base.points[0];
    return {
      distanceKm:
        Math.round(
          (base.distanceKm + (oKey !== baseO ? 8.2 : 0) + (dKey !== baseD ? 8.2 : 0)) * 10
        ) / 10,
      durationMinutes: Math.round(
        base.durationMinutes + (oKey !== baseO ? 12 : 0) + (dKey !== baseD ? 12 : 0)
      ),
      points: [startPt, ...[...base.points].reverse(), endPt]
    };
  }

  // Fallback to catlai_vsip as safe default
  if (realRoadData['catlai_vsip']) {
    return realRoadData['catlai_vsip'];
  }

  // Ultimate fallback
  const start = HUB_NODES[oKey]?.coords || [10.7623, 106.7824];
  const end = HUB_NODES[dKey]?.coords || [10.9242, 106.7145];
  return {
    distanceKm: 28.9,
    durationMinutes: 32,
    points: [start, end]
  };
}

/**
 * Interpolate an exact [lat, lon] coordinate along a real road polyline based on progress percentage (0 - 100).
 * Uses cumulative road distance so vehicle speed is uniform and stays 100% on the highway surface.
 */
export function interpolateRoadPosition(points, progressPct) {
  if (!points || points.length === 0) return [10.7623, 106.7824];
  if (points.length === 1) return points[0];

  const clamped = Math.max(0, Math.min(100, Number(progressPct) || 0)) / 100;
  if (clamped <= 0) return points[0];
  if (clamped >= 1) return points[points.length - 1];

  // Calculate cumulative distances
  const distances = [0];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversineDistanceMeters(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
    totalLength += d;
    distances.push(totalLength);
  }

  if (totalLength <= 0) return points[0];

  const targetDist = clamped * totalLength;

  // Find bounding segment
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDist >= distances[i] && targetDist <= distances[i + 1]) {
      const segLen = distances[i + 1] - distances[i];
      const ratio = segLen > 0 ? (targetDist - distances[i]) / segLen : 0;
      const lat = points[i][0] + (points[i + 1][0] - points[i][0]) * ratio;
      const lon = points[i][1] + (points[i + 1][1] - points[i][1]) * ratio;
      return [Number(lat.toFixed(5)), Number(lon.toFixed(5))];
    }
  }

  return points[points.length - 1];
}

/**
 * Calculate realistic telemetry metrics.
 */
export function calculateTelemetry(totalDistanceKm, progressPct, speedKmh) {
  const clampedProgress = Math.max(0, Math.min(100, Number(progressPct) || 0));
  const traveledKm = Number(((clampedProgress / 100) * totalDistanceKm).toFixed(1));
  const remainingKm = Number(Math.max(0, totalDistanceKm - traveledKm).toFixed(1));
  const currentSpeed = Math.max(20, Math.min(80, speedKmh || 54));
  const remainingMinutes =
    remainingKm <= 0 ? 0 : Math.max(1, Math.round((remainingKm / currentSpeed) * 60));

  return {
    progress: clampedProgress,
    traveledKm,
    remainingKm,
    speedKmh: currentSpeed,
    remainingMinutes
  };
}

/**
 * Compute geodesic forward bearing in degrees [0, 360).
 */
export function computeBearingDegrees(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    (Number(lat1) === Number(lat2) && Number(lon1) === Number(lon2))
  ) {
    return 0;
  }
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

/**
 * Evaluate whether the vehicle has arrived inside the destination geofence.
 */
export function evaluateDestinationArrival(currentCoords, destCoords, options = {}) {
  const arrivalRadiusMeters = Number(options.arrivalRadiusMeters ?? 250);
  const approachingRadiusMeters = Number(options.approachingRadiusMeters ?? 2000);
  const isDelivered = Boolean(options.isDelivered);
  const progressPct = options.progressPct != null ? Number(options.progressPct) : null;

  if (isDelivered) {
    const dist =
      Array.isArray(currentCoords) && Array.isArray(destCoords)
        ? Math.round(
            haversineDistanceMeters(currentCoords[0], currentCoords[1], destCoords[0], destCoords[1])
          )
        : 0;
    return {
      distanceMeters: dist,
      distanceKm: Number((dist / 1000).toFixed(2)),
      arrivalRadiusMeters,
      arrived: true,
      status: 'DELIVERED',
      label: 'Đã bàn giao ePOD tại điểm đích'
    };
  }

  if (
    Array.isArray(currentCoords) &&
    currentCoords.length >= 2 &&
    Array.isArray(destCoords) &&
    destCoords.length >= 2 &&
    Number.isFinite(Number(currentCoords[0])) &&
    Number.isFinite(Number(currentCoords[1])) &&
    Number.isFinite(Number(destCoords[0])) &&
    Number.isFinite(Number(destCoords[1]))
  ) {
    const dist = Math.round(
      haversineDistanceMeters(
        Number(currentCoords[0]),
        Number(currentCoords[1]),
        Number(destCoords[0]),
        Number(destCoords[1])
      )
    );
    const distanceKm = Number((dist / 1000).toFixed(2));
    if (dist <= arrivalRadiusMeters || (progressPct != null && progressPct >= 100)) {
      return {
        distanceMeters: dist,
        distanceKm,
        arrivalRadiusMeters,
        arrived: true,
        status: 'ARRIVED_AT_DESTINATION',
        label: 'Đã tới địa điểm giao hàng (trong vùng Geofence)'
      };
    }
    if (dist <= approachingRadiusMeters) {
      return {
        distanceMeters: dist,
        distanceKm,
        arrivalRadiusMeters,
        arrived: false,
        status: 'APPROACHING_DESTINATION',
        label: 'Sắp tới địa điểm giao hàng (< 2 km)'
      };
    }
    if (progressPct != null && progressPct <= 0) {
      return {
        distanceMeters: dist,
        distanceKm,
        arrivalRadiusMeters,
        arrived: false,
        status: 'AT_ORIGIN',
        label: 'Đang tại điểm xuất phát'
      };
    }
    return {
      distanceMeters: dist,
      distanceKm,
      arrivalRadiusMeters,
      arrived: false,
      status: 'IN_TRANSIT',
      label: 'Đang trên đường giao hàng'
    };
  }

  if (progressPct != null && progressPct >= 100) {
    return {
      distanceMeters: 0,
      distanceKm: 0,
      arrivalRadiusMeters,
      arrived: true,
      status: 'ARRIVED_AT_DESTINATION',
      label: 'Đã tới địa điểm giao hàng (trong vùng Geofence)'
    };
  }
  return {
    distanceMeters: null,
    distanceKm: null,
    arrivalRadiusMeters,
    arrived: false,
    status: progressPct != null && progressPct <= 0 ? 'AT_ORIGIN' : 'IN_TRANSIT',
    label: 'Đang trên đường giao hàng'
  };
}

/**
 * Convert GeoJSON LineString or [[lon,lat]] / [[lat,lon]] payload into Leaflet [[lat, lon], ...] points.
 */
export function extractGeoJsonLineStringPoints(routeGeometry) {
  if (!routeGeometry) return [];
  if (Array.isArray(routeGeometry)) {
    return routeGeometry
      .filter((pt) => Array.isArray(pt) && pt.length >= 2 && Number.isFinite(Number(pt[0])) && Number.isFinite(Number(pt[1])))
      .map((pt) => [Number(pt[0]), Number(pt[1])]);
  }
  let parsed = routeGeometry;
  if (typeof routeGeometry === 'string') {
    try {
      parsed = JSON.parse(routeGeometry);
    } catch {
      return [];
    }
  }
  const coords = parsed?.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords
    .filter((pt) => Array.isArray(pt) && pt.length >= 2 && Number.isFinite(Number(pt[0])) && Number.isFinite(Number(pt[1])))
    .map((pt) => [Number(pt[1]), Number(pt[0])]);
}

export function measurePolylineDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let meters = 0;
  for (let i = 0; i < points.length - 1; i++) {
    meters += haversineDistanceMeters(
      Number(points[i][0]),
      Number(points[i][1]),
      Number(points[i + 1][0]),
      Number(points[i + 1][1])
    );
  }
  return Number((meters / 1000).toFixed(2));
}

const LIVE_OSRM_ROUTE_CACHE = new Map();

/**
 * Fetch authentic live driving polyline from OSRM between arbitrary [lat, lon] coordinates.
 */
export async function fetchLiveOsrmRoute(originCoords, destCoords) {
  if (
    !Array.isArray(originCoords) ||
    !Array.isArray(destCoords) ||
    originCoords.length < 2 ||
    destCoords.length < 2
  ) {
    return null;
  }
  const oLat = Number(originCoords[0]);
  const oLon = Number(originCoords[1]);
  const dLat = Number(destCoords[0]);
  const dLon = Number(destCoords[1]);
  if (![oLat, oLon, dLat, dLon].every(Number.isFinite)) {
    return null;
  }
  const cacheKey = `${oLat.toFixed(4)},${oLon.toFixed(4)}->${dLat.toFixed(4)},${dLon.toFixed(4)}`;
  if (LIVE_OSRM_ROUTE_CACHE.has(cacheKey)) {
    return LIVE_OSRM_ROUTE_CACHE.get(cacheKey);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${oLon.toFixed(6)},${oLat.toFixed(6)};${dLon.toFixed(6)},${dLat.toFixed(6)}?overview=full&geometries=geojson`;
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) return null;
    const json = await res.json();
    const route = json?.routes?.[0];
    const points = extractGeoJsonLineStringPoints(route?.geometry);
    if (points.length < 2) return null;
    const result = {
      points,
      distanceKm: Number(((route.distance || 0) / 1000).toFixed(2)),
      durationMinutes: Math.max(1, Math.round((route.duration || 0) / 60)),
      source: 'OSRM_LIVE'
    };
    LIVE_OSRM_ROUTE_CACHE.set(cacheKey, result);
    return result;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
