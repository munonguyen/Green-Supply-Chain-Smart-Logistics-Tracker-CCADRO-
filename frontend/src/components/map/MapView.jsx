import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({
  center = [10.8231, 106.74],
  zoom = 12,
  focusPosition = null,
  focusZoom = 15,
  children,
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true
    });

    // Dark sleek OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      mapInstanceRef.current &&
      Array.isArray(focusPosition) &&
      focusPosition.length === 2 &&
      typeof focusPosition[0] === 'number' &&
      typeof focusPosition[1] === 'number'
    ) {
      mapInstanceRef.current.flyTo(focusPosition, focusZoom, {
        animate: true,
        duration: 1.25
      });
    }
  }, [focusPosition, focusZoom]);

  return (
    <div className={`map-view-container ${className}`} ref={mapContainerRef}>
      {mapInstanceRef.current &&
        React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { map: mapInstanceRef.current });
          }
          return child;
        })}
    </div>
  );
}
