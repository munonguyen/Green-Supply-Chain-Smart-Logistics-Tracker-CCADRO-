import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { gpsPosition } from './fleetTelemetry';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export default function VehicleMarker({
  map, position, title, label, vehicleCode, heading = 0, speedKmh = null,
  status = 'ON_ROUTE', tempC = null, selected = false, showLabel = true, onClick
}) {
  const displayTitle = title || label || (vehicleCode ? `Xe ${vehicleCode}` : 'Phương tiện');
  const badgeShort = vehicleCode || displayTitle.split(' ')[0];
  const markerRef = useRef(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const lat = position?.[0], lon = position?.[1];
  const hasPosition = !!gpsPosition(lat, lon);
  const positionRef = useRef(position);
  positionRef.current = position;

  useEffect(() => {
    if (!map || !hasPosition) return;
    const marker = L.marker(positionRef.current, { keyboard: true, bubblingMouseEvents: false }).addTo(map);
    marker.on('click', () => clickRef.current?.());
    markerRef.current = marker;
    return () => { marker.remove(); markerRef.current = null; };
  }, [map, hasPosition]);

  useEffect(() => {
    if (hasPosition) markerRef.current?.setLatLng([Number(lat), Number(lon)]);
  }, [map, hasPosition, lat, lon]);

  useEffect(() => {
    if (!markerRef.current) return;
    const badgeColor = status === 'DEVIATION' ? '#ef4444' : status === 'WARNING' ? '#f59e0b' : '#10b981';
    const customIcon = L.divIcon({
      className: 'vehicle-map-icon-3d',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; top: -26px; left: 50%; transform: translateX(-50%); white-space: nowrap; display: ${showLabel ? 'block' : 'none'}; background: rgba(10, 16, 29, 0.92); color: #ffffff; border: 1.5px solid ${badgeColor}; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            ${escapeHtml(badgeShort)} • ${speedKmh == null ? 'Chưa rõ tốc độ' : escapeHtml(speedKmh) + ' km/h'}
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

    markerRef.current.setIcon(customIcon);
    markerRef.current.setZIndexOffset(selected ? 1000 : 0);
    const element = markerRef.current.getElement();
    if (element) {
      element.setAttribute('aria-label', `${displayTitle}${selected ? ' · đang chọn' : ''}`);
      element.setAttribute('aria-pressed', String(selected));
    }
  }, [map, hasPosition, displayTitle, badgeShort, speedKmh, status, selected, showLabel]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (onClick) { marker.unbindPopup(); return; }
    const content = document.createElement('div');
    content.style.whiteSpace = 'pre-line';
    content.textContent = `${displayTitle}\nTốc độ: ${speedKmh == null ? 'Chưa có dữ liệu' : speedKmh + ' km/h'} · Hướng: ${heading}°\nNhiệt độ: ${tempC == null ? 'Chưa có cảm biến' : tempC + '°C'}\nGPS: ${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
    if (marker.getPopup()) marker.setPopupContent(content);
    else marker.bindPopup(content, { autoPan: false });
  }, [map, hasPosition, displayTitle, speedKmh, heading, tempC, lat, lon, onClick]);
  return null;
}
