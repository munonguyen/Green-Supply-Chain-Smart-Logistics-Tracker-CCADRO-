import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RoutePolyline({
  map,
  positions,
  color = '#10b981',
  weight = 5,
  opacity = 0.85,
  dashArray = null
}) {
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!map || !positions || positions.length < 2) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    const polyline = L.polyline(positions, {
      color,
      weight,
      opacity,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    polylineRef.current = polyline;

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    return () => {
      polyline.remove();
    };
  }, [map, positions, color, weight, opacity, dashArray]);

  return null;
}
