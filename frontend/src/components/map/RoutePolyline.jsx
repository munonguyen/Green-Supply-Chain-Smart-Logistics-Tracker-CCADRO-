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
  autoFit = true
}) {
  const groupRef = useRef(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    if (groupRef.current) {
      groupRef.current.remove();
    }

    const layers = [];

    if (showCorridorBuffer && !dashArray) {
      // Outer 200m corridor safety halo
      const outerHalo = L.polyline(positions, {
        color,
        weight: weight + 14,
        opacity: 0.16,
        lineCap: 'round',
        lineJoin: 'round'
      });
      // Inner 50m corridor buffer
      const innerHalo = L.polyline(positions, {
        color: '#ffffff',
        weight: weight + 4,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layers.push(outerHalo, innerHalo);
    }

    const mainLine = L.polyline(positions, {
      color,
      weight,
      opacity,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layers.push(mainLine);

    const group = L.layerGroup(layers).addTo(map);
    groupRef.current = group;

    if (autoFit && !fittedRef.current) {
      map.fitBounds(mainLine.getBounds(), { padding: [55, 55] });
      fittedRef.current = true;
    }

    return () => {
      group.remove();
    };
  }, [map, positions, color, weight, opacity, dashArray, showCorridorBuffer, autoFit]);

  return null;
}
