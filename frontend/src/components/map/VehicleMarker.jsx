import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function VehicleMarker({ map, position, title = 'Fleet Vehicle', heading = 0 }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    const customIcon = L.divIcon({
      className: 'vehicle-map-icon',
      html: `
        <div style="background: #3b82f6; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px #3b82f6; border: 2px solid white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker(position, { icon: customIcon }).addTo(map);
    marker.bindPopup(`<b>${title}</b><br/>Heading: ${heading}°`);

    markerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [map, position, title, heading]);

  return null;
}
