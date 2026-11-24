import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RoutePolyline({
  map,
  positions,
  color = '#10b981',
  weight = 6,
  opacity = 0.95,
  dashArray = null,
  showCorridorBuffer = true,
  routingMetadataJson,
  autoFit = true
}) {
  const groupRef = useRef(null);
  const lastFittedSigRef = useRef('');

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    if (groupRef.current) {
      groupRef.current.remove();
    }

    const layers = [];

    if (showCorridorBuffer && !dashArray) {
      // Decorative stroke width is in pixels, not a geographical corridor buffer.
      const outerHalo = L.polyline(positions, {
        smoothFactor: 0,
        color,
        weight: weight + 14,
        opacity: 0.16,
        lineCap: 'round',
        lineJoin: 'round'
      });
      const innerHalo = L.polyline(positions, {
        smoothFactor: 0,
        color: '#ffffff',
        weight: weight + 4,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layers.push(outerHalo, innerHalo);
    }

    const mainLine = L.polyline(positions, {
        smoothFactor: 0,
      color,
      weight,
      opacity,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layers.push(mainLine);

    // Provider indices refer to this exact, unsimplified route geometry.
    let metadata;
    try { metadata = JSON.parse(routingMetadataJson || '{}'); } catch { metadata = null; }
    const sections = Array.isArray(metadata?.trafficSections) ? metadata.trafficSections : [];
    for (const section of sections) {
      const start = section.startPointIndex, end = section.endPointIndex;
      if (section.sectionType !== 'TRAFFIC' || !Number.isInteger(start) || !Number.isInteger(end)
          || start < 0 || end <= start || end >= positions.length) continue;
      const delay = Number(section.delayInSeconds);
      if (!Number.isFinite(delay) || delay <= 0) continue;
      const line = L.polyline(positions.slice(start, end + 1), {
        smoothFactor: 0, color: delay >= 300 ? '#dc2626' : '#f59e0b',
        weight: weight + 2, opacity: 0.95
      });
      const label = document.createElement('span');
      label.textContent = `Dự báo giao thông: chậm ${Math.ceil(delay / 60)} phút`
        + (metadata.departAt ? ` · khởi hành ${new Date(metadata.departAt).toLocaleString('vi-VN')}` : '')
        + (metadata.fetchedAt ? ` · dữ liệu ${new Date(metadata.fetchedAt).toLocaleString('vi-VN')}` : '');
      line.bindTooltip(label);
      layers.push(line);
    }

    const group = L.layerGroup(layers).addTo(map);
    groupRef.current = group;

    const first = positions[0];
    const last = positions[positions.length - 1];
    const sig = `${first?.[0]}:${first?.[1]}->${last?.[0]}:${last?.[1]}:${positions.length}`;
    if (autoFit && lastFittedSigRef.current !== sig) {
      map.fitBounds(mainLine.getBounds(), { padding: [55, 55] });
      lastFittedSigRef.current = sig;
    }

    return () => {
      group.remove();
    };
  }, [map, positions, color, weight, opacity, dashArray, showCorridorBuffer, autoFit, routingMetadataJson]);

  return null;
}
