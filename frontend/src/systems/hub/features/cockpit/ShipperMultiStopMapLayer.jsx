import { useEffect, useRef } from 'react';
import L from 'leaflet';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );

const STOP_STATUS_STYLE = {
  DELIVERED_POD: {
    bg: '#059669',
    border: '#34d399',
    badgeBg: '#064e3b',
    shortText: 'Đã POD'
  },
  OUT_FOR_DELIVERY: {
    bg: '#0284c7',
    border: '#38bdf8',
    badgeBg: '#0c4a6e',
    shortText: 'Đang giao'
  },
  ASSIGNED_TO_SHIPPER: {
    bg: '#d97706',
    border: '#fbbf24',
    badgeBg: '#78350f',
    shortText: 'Chờ lấy Hub'
  },
  NDR_RESCHEDULED: {
    bg: '#ea580c',
    border: '#fb923c',
    badgeBg: '#7c2d12',
    shortText: 'Giữ On-Hold'
  },
  RETURN_PENDING: {
    bg: '#dc2626',
    border: '#f87171',
    badgeBg: '#7f1d1d',
    shortText: 'Chờ hoàn Hub'
  },
  RETURNED_TO_HUB: {
    bg: '#475569',
    border: '#94a3b8',
    badgeBg: '#1e293b',
    shortText: 'Đã trả kho'
  }
};

/**
 * Renders Hub station + Geofence, numbered multi-stop delivery pins,
 * OSRM street road polyline, active navigation leg, and live Shipper vehicle on Leaflet MapView.
 */
export default function ShipperMultiStopMapLayer({
  map,
  hubPosition,
  hubName = 'Trụ sở Giao nhận',
  hubRadiusMeters = 1800,
  shipperPosition = null,
  shipperLabel = 'Shipper',
  shipperPlate = '',
  stops = [],
  focusedItemCode = '',
  roadRoutePoints = [],
  activeLegPoints = [],
  onSelectStop
}) {
  const layerGroupRef = useRef(null);
  const fittedSigRef = useRef('');
  const onSelectRef = useRef(onSelectStop);
  onSelectRef.current = onSelectStop;

  useEffect(() => {
    if (!map) return undefined;

    if (layerGroupRef.current) {
      layerGroupRef.current.remove();
    }

    const layers = [];
    const boundsPoints = [];

    // 1. Hub Coverage Geofence + Hub Station Marker
    if (Array.isArray(hubPosition) && Number.isFinite(hubPosition[0]) && Number.isFinite(hubPosition[1])) {
      boundsPoints.push(hubPosition);

      const hubCircle = L.circle(hubPosition, {
        radius: hubRadiusMeters,
        color: '#10b981',
        weight: 1.6,
        dashArray: '6, 6',
        fillColor: '#10b981',
        fillOpacity: 0.05
      });
      layers.push(hubCircle);

      const hubIcon = L.divIcon({
        className: 'spx-leaflet-hub-marker',
        html: `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#064e3b;color:#ffffff;border:1.5px solid #34d399;border-radius:7px;padding:2px 8px;font-size:10px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
              TRỤ SỞ HUB • ${escapeHtml(hubName)}
            </div>
            <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);border:2.5px solid #ffffff;color:#ffffff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.45);">
              HUB
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      const hubMarker = L.marker(hubPosition, { icon: hubIcon, zIndexOffset: 300 });
      hubMarker.bindPopup(
        `<b>Trụ sở xuất phát:</b> ${escapeHtml(hubName)}<br/><small>Điểm nhận bàn giao kiện hàng chặng cuối</small>`
      );
      layers.push(hubMarker);
    }

    // 2. Full Multi-Stop Road Route Polyline (OSRM street geometry or fallback)
    if (Array.isArray(roadRoutePoints) && roadRoutePoints.length >= 2) {
      const routeHalo = L.polyline(roadRoutePoints, {
        color: '#0f172a',
        weight: 8,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round'
      });
      const routeLine = L.polyline(roadRoutePoints, {
        color: '#64748b',
        weight: 4.5,
        opacity: 0.78,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round'
      });
      layers.push(routeHalo, routeLine);
    }

    // 3. Active Navigation Leg Highlight (Shipper Live GPS -> Current Next Stop)
    if (Array.isArray(activeLegPoints) && activeLegPoints.length >= 2) {
      const legOuter = L.polyline(activeLegPoints, {
        color: '#0ea5e9',
        weight: 11,
        opacity: 0.24,
        lineCap: 'round',
        lineJoin: 'round'
      });
      const legMain = L.polyline(activeLegPoints, {
        color: '#0284c7',
        weight: 5.5,
        opacity: 0.96,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layers.push(legOuter, legMain);
    }

    // 4. Numbered Stop Pins (#1, #2, #3...)
    stops.forEach(({ item, index, position, legDistanceKm }) => {
      if (!Array.isArray(position) || !Number.isFinite(position[0]) || !Number.isFinite(position[1])) {
        return;
      }
      boundsPoints.push(position);

      const isFocused = item.itemCode === focusedItemCode;
      const meta = STOP_STATUS_STYLE[item.dispatchStatus] || STOP_STATUS_STYLE.ASSIGNED_TO_SHIPPER;
      const pinText =
        item.dispatchStatus === 'DELIVERED_POD' || item.dispatchStatus === 'RETURNED_TO_HUB'
          ? '✓'
          : item.dispatchStatus === 'RETURN_PENDING'
            ? '↩'
            : item.dispatchStatus === 'NDR_RESCHEDULED'
              ? '!'
              : String(index);

      if (isFocused) {
        const stopGeofence = L.circle(position, {
          radius: 120,
          color: meta.bg,
          weight: 2,
          fillColor: meta.bg,
          fillOpacity: 0.14
        });
        layers.push(stopGeofence);
      }

      const stopIcon = L.divIcon({
        className: 'spx-leaflet-stop-marker',
        html: `
          <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;bottom:39px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${meta.badgeBg};color:#ffffff;border:1.5px solid ${meta.border};border-radius:7px;padding:2px 7px;font-size:10px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
              #${index} ${escapeHtml(item.itemCode.split('-').slice(-1)[0])} • ${meta.shortText}
            </div>
            ${
              isFocused
                ? `<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${meta.bg}33;border:2px solid ${meta.border};animation:radar-ping 1.8s infinite;"></div>`
                : ''
            }
            <div style="width:${isFocused ? 32 : 28}px;height:${isFocused ? 32 : 28}px;border-radius:50%;background:${meta.bg};border:2.5px solid #ffffff;color:#ffffff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(0,0,0,0.48);position:relative;z-index:2;">
              ${pinText}
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const marker = L.marker(position, {
        icon: stopIcon,
        zIndexOffset: isFocused ? 900 : 500 + index
      });
      marker.on('click', () => {
        onSelectRef.current?.(item.itemCode);
      });
      marker.bindPopup(
        `<b>Chặng #${index} — ${escapeHtml(item.itemCode)}</b><br/>` +
          `${escapeHtml(item.consigneeName)}<br/>` +
          `<small>${escapeHtml(item.deliveryAddress)}</small><br/>` +
          `<small><b>Cự ly chặng:</b> ${legDistanceKm} km • <b>Trạng thái:</b> ${meta.shortText}</small>`
      );
      layers.push(marker);
    });

    // 5. Live Shipper Vehicle Marker (offset slightly if parked directly on a stop pin so labels never collide)
    if (
      Array.isArray(shipperPosition) &&
      Number.isFinite(shipperPosition[0]) &&
      Number.isFinite(shipperPosition[1])
    ) {
      const collidesWithStop = stops.some(
        (s) =>
          Array.isArray(s.position) &&
          Math.abs(s.position[0] - shipperPosition[0]) < 0.00035 &&
          Math.abs(s.position[1] - shipperPosition[1]) < 0.00035
      );
      const displayVehiclePos = collidesWithStop
        ? [shipperPosition[0] - 0.00028, shipperPosition[1] + 0.00032]
        : shipperPosition;
      boundsPoints.push(displayVehiclePos);

      const vehicleIcon = L.divIcon({
        className: 'spx-leaflet-shipper-vehicle',
        html: `
          <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(15,23,42,0.94);color:#ffffff;border:1.5px solid #38bdf8;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              🚚 ${escapeHtml(shipperPlate || shipperLabel)} (GPS Trực tiếp)
            </div>
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0284c7,#10b981);border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,0.55);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
      const vMarker = L.marker(displayVehiclePos, { icon: vehicleIcon, zIndexOffset: 1100 });
      vMarker.bindPopup(
        `<b>Phương tiện Shipper:</b> ${escapeHtml(shipperLabel)} (${escapeHtml(shipperPlate)})<br/>` +
          `<small>GPS thực tế: ${shipperPosition[0].toFixed(5)}, ${shipperPosition[1].toFixed(5)}</small>`
      );
      layers.push(vMarker);
    }

    const group = L.layerGroup(layers).addTo(map);
    layerGroupRef.current = group;

    const sig = boundsPoints.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');
    if (boundsPoints.length >= 2 && fittedSigRef.current !== sig) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        paddingTopLeft: [46, 102],
        paddingBottomRight: [46, 56],
        maxZoom: 15
      });
      fittedSigRef.current = sig;
    }

    return () => {
      group.remove();
    };
  }, [
    map,
    hubPosition,
    hubName,
    hubRadiusMeters,
    shipperPosition,
    shipperLabel,
    shipperPlate,
    stops,
    focusedItemCode,
    roadRoutePoints,
    activeLegPoints
  ]);

  return null;
}

