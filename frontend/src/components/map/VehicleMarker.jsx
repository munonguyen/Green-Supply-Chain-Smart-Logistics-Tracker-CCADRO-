import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function VehicleMarker({
  map,
  position,
  title = 'Xe vận tải V001',
  heading = 0,
  speedKmh = 54,
  status = 'ON_ROUTE',
  tempC = -18.2
}) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    const badgeColor =
      status === 'DEVIATION' ? '#ef4444' : status === 'WARNING' ? '#f59e0b' : '#10b981';

    const customIcon = L.divIcon({
      className: 'vehicle-map-icon-3d',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; top: -26px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(10, 16, 29, 0.92); color: #ffffff; border: 1.5px solid ${badgeColor}; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            ${title.split(' ')[0]} • ${speedKmh} km/h
          </div>
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: ${badgeColor}33; border: 1.5px solid ${badgeColor}; animation: radar-ping 1.8s infinite;"></div>
          <div style="background: linear-gradient(135deg, ${badgeColor}, #0284c7); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.6), 0 0 14px ${badgeColor}; border: 2.5px solid #ffffff; position: relative; z-index: 2;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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

    const popupHtml = `
      <div style="font-size: 12px; line-height: 1.5; min-width: 170px;">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${title}</div>
        <div><b>Tốc độ:</b> ${speedKmh} km/h • <b>Hướng:</b> ${heading}°</div>
        <div><b>Nhiệt độ thùng:</b> ${tempC}°C</div>
        <div><b>Tọa độ:</b> ${position[0].toFixed(4)}, ${position[1].toFixed(4)}</div>
      </div>
    `;

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
      markerRef.current.setIcon(customIcon);
      markerRef.current.setPopupContent(popupHtml);
    } else {
      const marker = L.marker(position, { icon: customIcon }).addTo(map);
      marker.bindPopup(popupHtml);
      markerRef.current = marker;
    }
  }, [map, position, title, heading, speedKmh, status, tempC]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null;
}
