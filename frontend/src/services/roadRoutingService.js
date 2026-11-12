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
