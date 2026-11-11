import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function DeviationMarker({ map, position, distanceMeters = 300, severity = 'RED' }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (markerRef.current) markerRef.current.remove();

    const color = severity === 'RED' ? '#ef4444' : '#f59e0b';

    const icon = L.divIcon({
      className: 'deviation-marker-icon',
      html: `
        <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: #7f1d1d; color: #ffffff; border: 1.5px solid ${color}; border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
            LỆCH TUYẾN ${distanceMeters}m
          </div>
          <div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 0 18px ${color};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker(position, { icon }).addTo(map);
    marker.bindPopup(
      `<b>Cảnh báo lệch hành lang (${severity})</b><br/>Khoảng cách lệch: <b>${distanceMeters}m</b>`
    );
    markerRef.current = marker;

    return () => marker.remove();
  }, [map, position, distanceMeters, severity]);

  return null;
}
