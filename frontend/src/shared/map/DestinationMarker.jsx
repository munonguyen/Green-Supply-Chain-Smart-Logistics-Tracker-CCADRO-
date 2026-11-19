import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function DestinationMarker({
  map,
  position,
  title,
  label,
  showGeofence = false,
  geofenceRadiusMeters = 250,
  arrived = false
}) {
  const displayTitle = title || label || 'KCN VSIP 1, Bình Dương';
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (layerRef.current) layerRef.current.remove();

    const accent = arrived ? '#10b981' : '#0ea5e9';
    const borderBg = arrived ? '#064e3b' : '#0c4a6e';
    const icon = L.divIcon({
      className: 'destination-marker-icon',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: ${borderBg}; color: #ffffff; border: 1.5px solid ${accent}; border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.45);">
            ${arrived ? '✓ ĐÃ TỚI ĐÍCH' : 'ĐIỂM ĐẾN'}: ${displayTitle}
          </div>
          <div style="background: ${accent}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 12px ${accent};">
            <div style="width: 8px; height: 8px; background: white; border-radius: 2px;"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const layers = [];
    if (showGeofence && geofenceRadiusMeters > 0) {
      const circle = L.circle(position, {
        radius: geofenceRadiusMeters,
        color: accent,
        weight: 2,
        fillColor: accent,
        fillOpacity: arrived ? 0.22 : 0.1,
        dashArray: arrived ? null : '6, 6'
      });
      layers.push(circle);
    }

    const marker = L.marker(position, { icon });
    marker.bindPopup(
      `<b>Điểm giao hàng:</b> ${displayTitle}<br/><small>Vùng Geofence xác nhận tới đích: ${geofenceRadiusMeters}m (${
        arrived ? 'ĐÃ TỚI ĐÍCH' : 'CHƯA TỚI'
      })</small>`
    );
    layers.push(marker);

    const group = L.layerGroup(layers).addTo(map);
    layerRef.current = group;

    return () => group.remove();
  }, [map, position, displayTitle, showGeofence, geofenceRadiusMeters, arrived]);

  return null;
}
