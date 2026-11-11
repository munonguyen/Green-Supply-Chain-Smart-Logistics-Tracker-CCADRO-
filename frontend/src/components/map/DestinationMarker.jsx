import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function DestinationMarker({ map, position, title = 'KCN VSIP 1, Bình Dương' }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      className: 'destination-marker-icon',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: #0c4a6e; color: #ffffff; border: 1.5px solid #38bdf8; border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.45);">
            ĐIỂM ĐẾN: ${title}
          </div>
          <div style="background: #0ea5e9; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 12px #0ea5e9;">
            <div style="width: 8px; height: 8px; background: white; border-radius: 2px;"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(position, { icon }).addTo(map);
    marker.bindPopup(`<b>Điểm giao hàng:</b> ${title}`);
    markerRef.current = marker;

    return () => marker.remove();
  }, [map, position, title]);

  return null;
}
