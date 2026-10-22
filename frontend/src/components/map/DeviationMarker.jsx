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
        <div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 14px ${color}; animation: pulse 1.5s infinite;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker(position, { icon }).addTo(map);
    marker.bindPopup(`<b>${severity} Deviation Alert</b><br/>Off-route: <b>${distanceMeters}m</b>`);
    markerRef.current = marker;

    return () => marker.remove();
  }, [map, position, distanceMeters, severity]);

  return null;
}
