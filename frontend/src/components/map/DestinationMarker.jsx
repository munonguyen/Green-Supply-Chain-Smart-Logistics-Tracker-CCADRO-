import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function DestinationMarker({ map, position, title = 'Destination Arrival' }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      className: 'dest-marker-icon',
      html: `
        <div style="background: #f59e0b; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px #f59e0b;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker(position, { icon }).addTo(map);
    marker.bindPopup(`<b>Destination:</b> ${title}`);
    markerRef.current = marker;

    return () => marker.remove();
  }, [map, position, title]);

  return null;
}
