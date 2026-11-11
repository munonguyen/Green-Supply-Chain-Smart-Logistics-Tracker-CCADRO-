import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Compass, Layers, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

const MAP_LAYERS = {
  google_hybrid: {
    id: 'google_hybrid',
    label: 'Vệ Tinh 3D',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite Hybrid'
  },
  google_street: {
    id: 'google_street',
    label: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  google_terrain: {
    id: 'google_terrain',
    label: 'Địa Hình 3D',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Terrain'
  },
  dark_radar: {
    id: 'dark_radar',
    label: 'Radar Đêm',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO & OpenStreetMap'
  }
};

export default function MapView({
  center = [10.8231, 106.74],
  zoom = 12,
  focusPosition = null,
  focusZoom = 15,
  defaultLayer = 'google_hybrid',
  default3D = true,
  height = 520,
  hudTitle = 'Bản Đồ Giám Sát Vệ Tinh 3D Thời Gian Thực',
  hudSubtitle = null,
  children,
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState(defaultLayer);
  const [is3D, setIs3D] = useState(default3D);
  const [pitch, setPitch] = useState(default3D ? 38 : 0);
  const [bearing, setBearing] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerConfig = MAP_LAYERS[activeLayer] || MAP_LAYERS.google_hybrid;
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 20
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tile layers dynamically
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const layerConfig = MAP_LAYERS[activeLayer] || MAP_LAYERS.google_hybrid;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 20
    }).addTo(mapInstanceRef.current);
  }, [activeLayer]);

  // Smooth flyTo when focusPosition changes
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
        duration: 1.1
      });
    }
  }, [focusPosition, focusZoom]);

  // Recalculate size when expanded changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 260);
    }
  }, [isExpanded, is3D]);

  const handleToggle3D = () => {
    setIs3D((prev) => {
      const next = !prev;
      setPitch(next ? 38 : 0);
      if (!next) setBearing(0);
      return next;
    });
  };

  const handleResetCamera = () => {
    setPitch(is3D ? 38 : 0);
    setBearing(0);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(center, zoom, { animate: true, duration: 0.9 });
    }
  };

  const containerHeight = isExpanded ? '78vh' : typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`map-view-container ${className}`}
      style={{
        height: containerHeight,
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        background: '#060c17',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.55)',
        transition: 'height 0.3s ease'
      }}
    >
      {/* 3D Horizon Sky & Depth Atmosphere Overlay when 3D is active */}
      {is3D && (
        <div
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: '88px',
            zIndex: 400,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(6, 12, 24, 0.86) 0%, rgba(14, 165, 233, 0.14) 55%, transparent 100%)'
          }}
        />
      )}

      {/* Top-Left Live Telemetry HUD Badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 450,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 12,
          background: 'rgba(10, 16, 29, 0.86)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          color: '#f8fafc',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'none'
        }}
      >
        <span className="radar-dot" />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.2 }}>{hudTitle}</div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
            {hudSubtitle ||
              `${is3D ? `Góc nhìn 3D (${pitch}° nghiêng • ${bearing}° hướng)` : 'Góc nhìn phẳng 2D'} • ${MAP_LAYERS[activeLayer]?.label}`}
          </div>
        </div>
      </div>

      {/* Top-Right Layer Switcher (Google Satellite 3D / Google Maps / Terrain / Dark) */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 450,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          padding: '5px',
          borderRadius: 12,
          background: 'rgba(10, 16, 29, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#94a3b8'
          }}
        >
          <Layers size={13} color="#34d399" /> Lớp bản đồ:
        </span>
        {Object.values(MAP_LAYERS).map((layer) => {
          const active = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                border: active ? '1px solid #10b981' : '1px solid transparent',
                background: active ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                color: active ? '#6ee7b7' : '#cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              {layer.label}
            </button>
          );
        })}
      </div>

      {/* Bottom-Left 3D Perspective & Camera Control Dock */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 14,
          zIndex: 450,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 12,
          background: 'rgba(10, 16, 29, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)'
        }}
      >
        <button
          type="button"
          onClick={handleToggle3D}
          title="Chuyển đổi góc nhìn 3D / 2D"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: is3D ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
            background: is3D
              ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
              : 'rgba(30, 41, 59, 0.8)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5
          }}
        >
          <Compass size={14} />
          <span>{is3D ? 'Chế độ 3D: BẬT' : 'Chế độ 2D'}</span>
        </button>

        {is3D && (
          <>
            <button
              type="button"
              onClick={() => setPitch((p) => (p >= 48 ? 24 : p + 12))}
              title="Thay đổi độ nghiêng 3D (Pitch)"
              style={{
                padding: '6px 9px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(30, 41, 59, 0.75)',
                color: '#e2e8f0',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Góc nghiêng {pitch}°
            </button>

            <button
              type="button"
              onClick={() => setBearing((b) => (b - 15 + 360) % 360)}
              title="Xoay trái góc nhìn 3D"
              style={{
                padding: '6px 9px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(30, 41, 59, 0.75)',
                color: '#e2e8f0',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ↺ Xoay trái
            </button>

            <button
              type="button"
              onClick={() => setBearing((b) => (b + 15) % 360)}
              title="Xoay phải góc nhìn 3D"
              style={{
                padding: '6px 9px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(30, 41, 59, 0.75)',
                color: '#e2e8f0',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ↻ Xoay phải
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleResetCamera}
          title="Đặt lại trung tâm bản đồ"
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(30, 41, 59, 0.75)',
            color: '#6ee7b7',
            fontSize: '0.73rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <RotateCcw size={13} /> Đặt lại
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          title={isExpanded ? 'Thu nhỏ bản đồ' : 'Mở rộng bản đồ'}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(30, 41, 59, 0.75)',
            color: '#cbd5e1',
            fontSize: '0.73rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
        </button>
      </div>

      {/* 3D Perspective Stage Wrapping the Leaflet Canvas */}
      <div
        style={{
          width: '100%',
          height: '100%',
          perspective: is3D ? '1200px' : 'none',
          overflow: 'hidden'
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            transform: is3D
              ? `rotateX(${pitch}deg) rotateZ(${bearing}deg) scale(${pitch > 40 ? 1.24 : 1.16})`
              : 'none',
            transformOrigin: '50% 58%',
            transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        />
      </div>

      {mapReady &&
        mapInstanceRef.current &&
        React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { map: mapInstanceRef.current });
          }
          return child;
        })}
    </div>
  );
}
