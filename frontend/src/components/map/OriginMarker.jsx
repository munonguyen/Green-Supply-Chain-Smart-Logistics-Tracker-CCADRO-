import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function OriginMarker({ map, position, title = 'Origin Departure' }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      className: 'origin-marker-icon',
      html: `
        <div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 0 10px #10b981;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker(position, { icon }).addTo(map);
    marker.bindPopup(`<b>Origin:</b> ${title}`);
    markerRef.current = marker;

    return () => marker.remove();
  }, [map, position, title]);

  return null;
}
