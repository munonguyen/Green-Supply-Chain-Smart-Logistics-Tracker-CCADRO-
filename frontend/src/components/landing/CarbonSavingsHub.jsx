import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  Download,
  Leaf,
  MapPin,
  Navigation,
  PieChart,
  X
} from 'lucide-react';
import {
  CARBON_EQUIVALENTS,
  CARBON_SUMMARY,
  ESTIMATOR,
  MAP_NODES,
  MONTHLY_SAVINGS,
  POWERTRAINS
} from './landingContent';
import { CountingNumber } from '../ui/CountingNumber';
import MapView from '../map/MapView';
import RoutePolyline from '../map/RoutePolyline';
import VehicleMarker from '../map/VehicleMarker';
import { getRealRoadRoute, interpolateRoadPosition } from '../../services/roadRoutingService';

/* ── Detailed real-world GPS coordinates & addresses for Southern Vietnam hubs ── */
const HUB_DETAILS = {
  vsip: {
    id: 'vsip',
    label: 'KCN VSIP 1',
    area: 'Thuận An, Bình Dương',
    address: 'Số 8 Đại lộ Hữu Nghị, KCN VSIP 1, Thuận An, Bình Dương',
    coords: [10.9242, 106.7145],
    highway: 'Quốc lộ 13 – Đại lộ Bình Dương'
  },
  songthan: {
    id: 'songthan',
    label: 'ICD Sóng Thần',
    area: 'Dĩ An, Bình Dương',
    address: 'Khu phố Bình Đường 3, Phường An Bình, Dĩ An, Bình Dương',
    coords: [10.8925, 106.7428],
    highway: 'Độc Lập – Quốc lộ 1A – Xa lộ Hà Nội'
  },
  tanbinh: {
    id: 'tanbinh',
    label: 'KCN Tân Bình',
    area: 'Tân Phú, TP. HCM',
    address: 'Đường Tây Thạnh, KCN Tân Bình, Quận Tân Phú, TP. HCM',
    coords: [10.8184, 106.6286],
    highway: 'Trường Chinh – Quốc lộ 1A'
  },
  catlai: {
    id: 'catlai',
    label: 'Cảng Cát Lái',
    area: 'TP. Thủ Đức, TP. HCM',
    address: '1295B Nguyễn Thị Định, Phường Cát Lái, TP. Thủ Đức',
    coords: [10.7623, 106.7824],
    highway: 'Vành Đai 2 – Võ Chí Công – Mai Chí Thọ'
  },
  nhontrach: {
    id: 'nhontrach',
    label: 'KCN Nhơn Trạch',
    area: 'Nhơn Trạch, Đồng Nai',
    address: 'Đường Tôn Đức Thắng (25B), KCN Nhơn Trạch, Đồng Nai',
    coords: [10.7352, 106.8954],
    highway: 'Cao tốc TP.HCM – Long Thành – Quốc lộ 51'
  },
  hiepphuoc: {
    id: 'hiepphuoc',
    label: 'Cảng Hiệp Phước',
    area: 'Nhà Bè, TP. HCM',
    address: 'Khu B, Đường số 1, KCN Hiệp Phước, Nhà Bè, TP. HCM',
    coords: [10.6354, 106.7522],
    highway: 'Nguyễn Văn Tạo – Nguyễn Hữu Thọ – Cầu Phú Mỹ'
  },
  caimep: {
    id: 'caimep',
    label: 'Cảng Cái Mép',
    area: 'Phú Mỹ, Bà Rịa – Vũng Tàu',
    address: 'Khu phố Tân Lộc, Phường Phước Hòa, Phú Mỹ, Bà Rịa – Vũng Tàu',
    coords: [10.5256, 107.0225],
    highway: 'Liên cảng Cái Mép – Thị Vải – Quốc lộ 51'
  }
};

function nodeById(id) {
  return HUB_DETAILS[id] || MAP_NODES.find((n) => n.id === id) || HUB_DETAILS.catlai;
}

/* ── Interactive Leaflet markers for all 7 hubs on the real Google Map ── */
function HubNetworkMarkers({ map, origin, dest, onSelect }) {
  useEffect(() => {
    if (!map) return undefined;

    const markers = Object.values(HUB_DETAILS).map((hub) => {
      const isOrigin = hub.id === origin;
      const isDest = hub.id === dest;

      const badgeColor = isOrigin ? '#38bdf8' : isDest ? '#10b981' : '#94a3b8';
      const badgeBg = isOrigin
        ? 'rgba(3, 105, 161, 0.94)'
        : isDest
          ? 'rgba(4, 120, 87, 0.95)'
          : 'rgba(15, 23, 42, 0.88)';
      const rolePrefix = isOrigin ? 'ĐIỂM ĐI • ' : isDest ? 'ĐIỂM ĐẾN • ' : '';
      const dotSize = isOrigin || isDest ? 18 : 13;

      const icon = L.divIcon({
        className: 'ccadro-hub-network-pin',
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="
              position: absolute;
              top: -28px;
              left: 50%;
              transform: translateX(-50%);
              white-space: nowrap;
              background: ${badgeBg};
              border: 1.5px solid ${badgeColor};
              color: #ffffff;
              font-size: ${isOrigin || isDest ? '10.5px' : '9.5px'};
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 999px;
              box-shadow: 0 6px 16px rgba(0,0,0,0.55);
              letter-spacing: 0.02em;
            ">
              ${rolePrefix}${hub.label}
            </div>
            <div style="
              width: ${dotSize}px;
              height: ${dotSize}px;
              border-radius: 50%;
              background: ${badgeColor};
              border: 3px solid #ffffff;
              box-shadow: 0 0 16px ${badgeColor};
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker(hub.coords, {
        icon,
        zIndexOffset: isOrigin || isDest ? 900 : 400
      }).addTo(map);

      marker.on('click', () => {
        onSelect(hub.id);
      });

      marker.bindTooltip(
        `<div style="font-size:12px;line-height:1.45;">
          <strong>${hub.label} (${hub.area})</strong><br/>
          <span>${hub.address}</span><br/>
          <span style="color:#10b981;font-weight:700;">Nhấn để chọn làm Điểm đi / Điểm đến</span>
        </div>`,
        { direction: 'top', offset: [0, -24] }
      );

      return marker;
    });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [map, origin, dest, onSelect]);

  return null;
}

/* ── Detailed Interactive 3D Location Corridor Map with Authentic Road Geometry ── */
function CorridorMap({ origin, dest, onSelect, onSetOrigin, onSetDest, onSwap, powertrain }) {
  const [progress, setProgress] = useState(28);

  const realRoute = useMemo(() => getRealRoadRoute(origin, dest), [origin, dest]);
  const waypoints = realRoute.points;

  useEffect(() => {
    // Realistic progression along highway (~54 km/h pace)
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 98.5 ? 1.5 : Number((prev + 0.12).toFixed(2))));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const originHub = nodeById(origin);
  const destHub = nodeById(dest);
  const vehiclePos = useMemo(
    () => interpolateRoadPosition(waypoints, progress),
    [waypoints, progress]
  );

  const mapCenter = useMemo(() => {
    const [lat1, lon1] = originHub.coords;
    const [lat2, lon2] = destHub.coords;
    return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
  }, [originHub, destHub]);

  const ptLabel =
    powertrain === 'ev'
      ? 'EV 51C-888.99'
      : powertrain === 'euro5'
        ? 'Euro5 51D-662.18'
        : 'Diesel 51C-402.11';

  return (
    <div
      className="lp-panel"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border: '1px solid rgba(16, 185, 129, 0.28)'
      }}
    >
      {/* Quick Location Selector Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <span className="lp-panel__label" style={{ marginBottom: 2, display: 'block' }}>
            BẢN ĐỒ ĐỊA LÝ 3D CHI TIẾT HÀNH LANG VẬN TẢI PHÍA NAM
          </span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Nhấn trực tiếp vào các cảng / KCN trên bản đồ Google Maps hoặc chọn nhanh bên dưới
          </div>
        </div>

        <button
          type="button"
          onClick={onSwap}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 10,
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'rgba(16, 185, 129, 0.14)',
            color: '#6ee7b7',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <ArrowLeftRight size={14} /> Đổi chiều hành trình
        </button>
      </div>

      {/* Origin & Destination Dropdown Selectors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10
        }}
      >
        <div
          style={{
            padding: '9px 12px',
            borderRadius: 12,
            background: 'rgba(3, 105, 161, 0.16)',
            border: '1px solid rgba(56, 189, 248, 0.35)'
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4
            }}
          >
            ● Điểm xuất phát (Origin)
          </label>
          <select
            value={origin}
            onChange={(e) => onSetOrigin(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {Object.values(HUB_DETAILS).map((h) => (
              <option key={h.id} value={h.id} style={{ background: '#071a14', color: '#f8fafc' }}>
                {h.label} ({h.area})
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: '9px 12px',
            borderRadius: 12,
            background: 'rgba(4, 120, 87, 0.18)',
            border: '1px solid rgba(16, 185, 129, 0.4)'
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#34d399',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4
            }}
          >
            ◉ Điểm giao hàng (Destination)
          </label>
          <select
            value={dest}
            onChange={(e) => onSetDest(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {Object.values(HUB_DETAILS).map((h) => (
              <option key={h.id} value={h.id} style={{ background: '#071a14', color: '#f8fafc' }}>
                {h.label} ({h.area})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real 3D Google Maps Location View */}
      <MapView
        center={mapCenter}
        zoom={10}
        height="380px"
        defaultTile="google_hybrid"
        default3D={true}
        defaultPitch={34}
        overlayTitle={`${originHub.label} → ${destHub.label} • ${originHub.highway}`}
      >
        <RoutePolyline positions={waypoints} color="#10b981" weight={5} showCorridorBuffer={true} />
        <HubNetworkMarkers origin={origin} dest={dest} onSelect={onSelect} />
        <VehicleMarker
          position={vehiclePos}
          vehicleCode={ptLabel}
          speedKmh={56}
          status="ON_ROUTE"
          label={`Hành trình xanh: ${originHub.label} → ${destHub.label}`}
        />
      </MapView>

      {/* Detailed GPS & Street Address Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 10,
          fontSize: '0.76rem'
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(56, 189, 248, 0.24)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#38bdf8',
              fontWeight: 800,
              marginBottom: 3
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={13} /> {originHub.label}
            </span>
            <code>
              {originHub.coords[0].toFixed(4)}°N, {originHub.coords[1].toFixed(4)}°E
            </code>
          </div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>{originHub.address}</div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(16, 185, 129, 0.28)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#34d399',
              fontWeight: 800,
              marginBottom: 3
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Navigation size={13} /> {destHub.label}
            </span>
            <code>
              {destHub.coords[0].toFixed(4)}°N, {destHub.coords[1].toFixed(4)}°E
            </code>
          </div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>{destHub.address}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Monthly trend SVG chart ── */
function TrendChart() {
  const [hover, setHover] = useState(null);
  const max = Math.max(...MONTHLY_SAVINGS.map((m) => m.tonnes));
  const W = 480;
  const H = 160;
  const pad = { t: 10, r: 10, b: 28, l: 10 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const points = MONTHLY_SAVINGS.map((m, i) => ({
    x: pad.l + (i / (MONTHLY_SAVINGS.length - 1)) * iw,
    y: pad.t + ih - (m.tonnes / max) * ih,
    ...m
  }));

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${points[points.length - 1].x},${H - pad.b} L${points[0].x},${H - pad.b} Z`;

  return (
    <div className="lp-trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#trendFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 5 : 3}
            fill="#10b981"
            stroke="#021009"
            strokeWidth="2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}

        {/* X axis labels */}
        {points.map((p) => (
          <text
            key={p.month}
            x={p.x}
            y={H - 6}
            textAnchor="middle"
            fill="#6b9a85"
            fontSize="10"
            fontWeight="600"
          >
            {p.month}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="lp-trend__tooltip"
          style={{
            left: `${(points[hover].x / W) * 100}%`,
            top: `${(points[hover].y / H) * 100}%`
          }}
        >
          <strong>{points[hover].tonnes} tấn</strong> CO2e tránh được • {points[hover].month}/2026
        </div>
      )}

      <div className="lp-trend__legend">
        <span>
          <i style={{ background: '#10b981' }} /> CO2e tránh được hàng tháng (tấn)
        </span>
      </div>
    </div>
  );
}

/* ── Fleet donut placeholder ── */
function FleetDonut() {
  const data = [
    { label: 'Xe điện (EV)', pct: 18, color: '#10b981' },
    { label: 'Euro 5', pct: 24, color: '#0ea5e9' },
    { label: 'Diesel thông thường', pct: 58, color: '#6b7280' }
  ];
  const cx = 100;
  const cy = 100;
  const r = 70;
  const inner = 46;
  let cumulative = 0;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 200 200" width="200" style={{ margin: '0 auto', display: 'block' }}>
        {data.map((d) => {
          const startAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
          cumulative += d.pct;
          const endAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
          const largeArc = d.pct > 50 ? 1 : 0;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const ix1 = cx + inner * Math.cos(endAngle);
          const iy1 = cy + inner * Math.sin(endAngle);
          const ix2 = cx + inner * Math.cos(startAngle);
          const iy2 = cy + inner * Math.sin(startAngle);
          const path = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${largeArc} 0 ${ix2},${iy2} Z`;
          return <path key={d.label} d={path} fill={d.color} />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#ecfdf5" fontSize="22" fontWeight="800">
          42%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#9ec9b5" fontSize="9" fontWeight="600">
          phát thải thấp
        </text>
      </svg>
      <div style={{ display: 'grid', gap: 6, marginTop: 14, fontSize: '0.78rem' }}>
        {data.map((d) => (
          <div
            key={d.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <i
              style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }}
            />
            {d.label}: <strong style={{ color: 'var(--text-main)' }}>{d.pct}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function CarbonSavingsHub() {
  const [tab, setTab] = useState('estimator');

  /* Estimator state */
  const [origin, setOrigin] = useState('catlai');
  const [dest, setDest] = useState('vsip');
  const [payload, setPayload] = useState(16);
  const [powertrain, setPowertrain] = useState('ev');
  const [showCert, setShowCert] = useState(false);

  const handleMapSelect = (id) => {
    if (id === origin) return;
    if (id === dest) return;
    setDest(id);
  };

  const handleSetOrigin = (newOrigin) => {
    if (newOrigin === dest) {
      setDest(origin);
    }
    setOrigin(newOrigin);
  };

  const handleSetDest = (newDest) => {
    if (newDest === origin) {
      setOrigin(dest);
    }
    setDest(newDest);
  };

  const handleSwap = () => {
    setOrigin(dest);
    setDest(origin);
  };

  /* Calculation */
  const calc = useMemo(() => {
    const a = MAP_NODES.find((n) => n.id === origin);
    const b = MAP_NODES.find((n) => n.id === dest);
    if (!a || !b) return null;
    const realRoute = getRealRoadRoute(origin, dest);
    const km = realRoute.distanceKm;
    const tkm = km * payload;
    const baseline = tkm * ESTIMATOR.dieselBaselineKgPerTkm;
    const pt = POWERTRAINS.find((p) => p.id === powertrain);
    const totalReduction = (pt ? pt.reduction : 0) + ESTIMATOR.greenRoutingReduction;
    const saved = baseline * totalReduction;
    const monthly = saved * ESTIMATOR.tripsPerMonth;
    return {
      km,
      tkm: Math.round(tkm),
      baseline: Math.round(baseline * 10) / 10,
      saved: Math.round(saved * 10) / 10,
      monthly: Math.round(monthly),
      pctReduction: Math.round(totalReduction * 100)
    };
  }, [origin, dest, payload, powertrain]);

  const tabs = [
    { id: 'estimator', icon: Calculator, label: 'Ước tính phát thải' },
    { id: 'benchmark', icon: BarChart3, label: 'Biểu đồ hành lang' },
    { id: 'fleet', icon: PieChart, label: 'Cơ cấu đội xe' }
  ];

  return (
    <>
      <section id="thong-ke-carbon" className="lp-section lp-carbon" data-theme="dark">
        <div className="lp-container">
          {/* Section head */}
          <div className="lp-section-head lp-section-head--center">
            <div>
              <span className="lp-eyebrow">Thống Kê Phát Thải</span>
              <h2 className="lp-h2">
                Đã tiết kiệm <em>{CARBON_SUMMARY.reductionPercent}% CO2e</em> cho chuỗi cung ứng
              </h2>
              <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                Tổng hợp dữ liệu kiểm kê thực tế theo chuẩn GLEC Framework v3 trong giai đoạn{' '}
                {CARBON_SUMMARY.periodLabel}.
              </p>
            </div>
          </div>

          {/* Top grid: counter + trend */}
          <div className="lp-carbon__grid">
            {/* Left: giant counter + equivalences */}
            <div className="lp-panel lp-panel--highlight">
              <span className="lp-panel__label">TỔNG CO2e ĐÃ TRÁNH PHÁT THẢI</span>
              <div className="lp-carbon__counter">
                <CountingNumber
                  value={CARBON_SUMMARY.savedKg}
                  locale="vi-VN"
                  liveStep={2}
                  liveIntervalMs={3800}
                />
                <small>kg CO2e</small>
              </div>

              {/* Baseline vs actual comparison */}
              <div className="lp-carbon__compare">
                <div className="lp-compare__row">
                  <span>Mốc đối chứng</span>
                  <div className="lp-compare__bar">
                    <motion.span
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      style={{ background: '#6b7280' }}
                    />
                  </div>
                  <strong>
                    <CountingNumber
                      value={CARBON_SUMMARY.baselineTonnes}
                      decimals={1}
                      suffix=" t"
                    />
                  </strong>
                </div>
                <div className="lp-compare__row">
                  <span>Thực tế CCADRO</span>
                  <div className="lp-compare__bar">
                    <motion.span
                      initial={{ width: 0 }}
                      whileInView={{
                        width: `${(CARBON_SUMMARY.actualTonnes / CARBON_SUMMARY.baselineTonnes) * 100}%`
                      }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        background: 'linear-gradient(90deg, #059669, #6ee7b7)'
                      }}
                    />
                  </div>
                  <strong style={{ color: '#6ee7b7' }}>
                    <CountingNumber value={CARBON_SUMMARY.actualTonnes} decimals={1} suffix=" t" />
                  </strong>
                </div>
              </div>

              {/* Equivalences */}
              <div className="lp-equivalents">
                {CARBON_EQUIVALENTS.map((eq) => {
                  const Icon = eq.icon;
                  return (
                    <div key={eq.unit} className="lp-equivalent">
                      <div className="lp-equivalent__icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <strong>
                          <CountingNumber value={eq.value} locale="vi-VN" /> {eq.unit}
                        </strong>
                        <span>{eq.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="lp-footnote">
                Hệ số quy đổi: 1 cây hấp thụ 22 kg CO2/năm • 1 lít diesel = 3,17 kg CO2e (WTW) • 1 ô
                tô con = 4.600 kg CO2/năm (EPA 2023).
              </p>
            </div>

            {/* Right: trend chart */}
            <div className="lp-panel">
              <span className="lp-panel__label">LƯỢNG CO2e TRÁNH ĐƯỢC HÀNG THÁNG</span>
              <p className="lp-panel__title">Xu hướng 12 tháng</p>
              <p className="lp-panel__desc">
                Tăng trưởng bền vững nhờ mở rộng đội xe điện và tối ưu lộ trình xanh liên tục.
              </p>
              <TrendChart />
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`lp-chip ${tab === t.id ? 'is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {tab === 'estimator' && (
              <motion.div
                key="estimator"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="lp-estimator"
              >
                {/* Left: Detailed 3D Google Maps corridor map */}
                <CorridorMap
                  origin={origin}
                  dest={dest}
                  onSelect={handleMapSelect}
                  onSetOrigin={handleSetOrigin}
                  onSetDest={handleSetDest}
                  onSwap={handleSwap}
                  powertrain={powertrain}
                />

                {/* Right: controls + result */}
                <div>
                  <div className="lp-panel">
                    <span className="lp-panel__label">TÍNH TOÁN PHÁT THẢI HÀNH TRÌNH</span>
                    <p className="lp-panel__title" style={{ marginBottom: 20 }}>
                      {nodeById(origin)?.label || '…'} → {nodeById(dest)?.label || '…'}
                    </p>

                    {/* Payload slider */}
                    <div className="lp-field">
                      <div className="lp-field__label">
                        <span>Trọng tải hàng hóa</span>
                        <strong>{payload} tấn</strong>
                      </div>
                      <input
                        type="range"
                        className="lp-range"
                        min={1}
                        max={28}
                        step={1}
                        value={payload}
                        onChange={(e) => setPayload(Number(e.target.value))}
                      />
                      <div className="lp-range__ticks">
                        <span>1t</span>
                        <span>7t</span>
                        <span>14t</span>
                        <span>21t</span>
                        <span>28t</span>
                      </div>
                    </div>

                    {/* Powertrain options */}
                    <div className="lp-field">
                      <div className="lp-field__label">
                        <span>Loại phương tiện</span>
                      </div>
                      <div className="lp-options">
                        {POWERTRAINS.map((pt) => (
                          <button
                            key={pt.id}
                            type="button"
                            className={`lp-option ${powertrain === pt.id ? 'is-active' : ''}`}
                            onClick={() => setPowertrain(pt.id)}
                          >
                            <div>
                              <div className="lp-option__name">{pt.name}</div>
                              <div className="lp-option__desc">{pt.desc}</div>
                            </div>
                            {pt.reduction > 0 && (
                              <span
                                style={{
                                  color: 'var(--lp-mint)',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                -{Math.round(pt.reduction * 100)}%
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Result panel */}
                  {calc && (
                    <div className="lp-result">
                      <div className="lp-result__grid">
                        <div>
                          <div className="lp-result__label">Quãng đường</div>
                          <div className="lp-result__value">
                            <CountingNumber value={calc.km} decimals={1} startOnView={false} />
                            <small>km</small>
                          </div>
                        </div>
                        <div>
                          <div className="lp-result__label">Phát thải mốc đối chứng</div>
                          <div className="lp-result__value">
                            <CountingNumber
                              value={calc.baseline}
                              decimals={1}
                              startOnView={false}
                            />
                            <small>kg CO2e</small>
                          </div>
                        </div>
                        <div>
                          <div className="lp-result__label">CO2e tránh được / chuyến</div>
                          <div className="lp-result__value" style={{ color: 'var(--lp-mint)' }}>
                            -<CountingNumber value={calc.saved} decimals={1} startOnView={false} />
                            <small>kg</small>
                          </div>
                        </div>
                        <div>
                          <div className="lp-result__label">Tiết kiệm / tháng (26 chuyến)</div>
                          <div className="lp-result__value" style={{ color: 'var(--lp-mint)' }}>
                            -<CountingNumber value={calc.monthly} startOnView={false} />
                            <small>kg</small>
                          </div>
                        </div>
                      </div>

                      <div className="lp-result__saving">
                        <span>
                          Tổng giảm phát thải:{' '}
                          <strong>
                            -<CountingNumber value={calc.pctReduction} startOnView={false} />%
                          </strong>
                        </span>
                      </div>

                      <div className="lp-result__actions">
                        <button
                          type="button"
                          className="lp-btn lp-btn--primary lp-btn--sm"
                          onClick={() => setShowCert(true)}
                        >
                          <Award size={15} /> Xem chứng nhận mẫu
                        </button>
                        <a href="/login" className="lp-btn lp-btn--outline lp-btn--sm">
                          Lập lộ trình thực tế <ArrowRight size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'benchmark' && (
              <motion.div
                key="benchmark"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="lp-reports">
                  <div className="lp-panel">
                    <span className="lp-panel__label">HIỆU SUẤT HÀNH LANG (kg CO2e / tấn.km)</span>
                    <div style={{ marginTop: 22 }}>
                      {[
                        { name: 'Cát Lái → VSIP 1', baseline: 0.105, actual: 0.071, pct: -32.4 },
                        { name: 'Cái Mép → Sóng Thần', baseline: 0.098, actual: 0.077, pct: -21.4 },
                        {
                          name: 'Hiệp Phước → Tân Bình',
                          baseline: 0.112,
                          actual: 0.082,
                          pct: -26.8
                        },
                        { name: 'Nhơn Trạch → Cái Mép', baseline: 0.095, actual: 0.079, pct: -16.8 }
                      ].map((c) => (
                        <div key={c.name} style={{ marginBottom: 18 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.84rem',
                              marginBottom: 6
                            }}
                          >
                            <span>{c.name}</span>
                            <strong style={{ color: 'var(--lp-mint)' }}>{c.pct}%</strong>
                          </div>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.06)',
                              overflow: 'hidden'
                            }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(c.actual / c.baseline) * 100}%` }}
                              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                              style={{
                                height: '100%',
                                borderRadius: 6,
                                background: 'linear-gradient(90deg, #059669, #6ee7b7)'
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                              color: 'var(--text-dim)',
                              marginTop: 3
                            }}
                          >
                            <span>CCADRO: {c.actual}</span>
                            <span>Mốc: {c.baseline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="lp-panel">
                    <FleetDonut />
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'fleet' && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="lp-reports"
              >
                <div className="lp-panel">
                  <span className="lp-panel__label">CƠ CẤU ĐỘI XE THEO LOẠI ĐỘNG CƠ</span>
                  <p className="lp-panel__title">Mục tiêu 60% phát thải thấp năm 2028</p>
                  <p className="lp-panel__desc" style={{ marginBottom: 18 }}>
                    Doanh nghiệp đang tích cực chuyển đổi đội xe diesel sang xe điện và xe đạt chuẩn
                    Euro 5 nhằm đáp ứng cam kết Net-Zero 2030.
                  </p>
                  <FleetDonut />
                </div>
                <div className="lp-panel">
                  <span className="lp-panel__label">XU HƯỚNG CHUYỂN ĐỔI HÀNG THÁNG</span>
                  <TrendChart />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Certificate modal */}
      <AnimatePresence>
        {showCert && (
          <motion.div
            className="lp-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCert(false)}
          >
            <motion.div
              className="lp-modal__card"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 18
                }}
              >
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  Chứng Nhận Phát Thải Mẫu (ISO 14083)
                </h3>
                <button
                  type="button"
                  className="lp-icon-btn"
                  onClick={() => setShowCert(false)}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="lp-cert">
                <div className="lp-cert__head">
                  <Leaf size={32} color="#10b981" />
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 8 }}>
                    CCADRO Green Certificate
                  </h4>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginTop: 4
                    }}
                  >
                    Chuẩn GLEC Framework v3 &amp; ISO 14083
                  </p>
                </div>

                <div className="lp-cert__rows">
                  <div>
                    <span>Hành trình</span>
                    <strong>
                      {nodeById(origin)?.label} → {nodeById(dest)?.label}
                    </strong>
                  </div>
                  <div>
                    <span>Trọng tải</span>
                    <strong>{payload} tấn</strong>
                  </div>
                  <div>
                    <span>Phương tiện</span>
                    <strong>{POWERTRAINS.find((p) => p.id === powertrain)?.name}</strong>
                  </div>
                  <div>
                    <span>Quãng đường</span>
                    <strong>{calc?.km} km</strong>
                  </div>
                  <div>
                    <span>CO2e mốc đối chứng</span>
                    <strong>{calc?.baseline} kg</strong>
                  </div>
                  <div>
                    <span>CO2e tránh được</span>
                    <strong style={{ color: 'var(--accent-green)' }}>
                      -{calc?.saved} kg ({calc?.pctReduction}%)
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                <button type="button" className="lp-btn lp-btn--outline lp-btn--sm">
                  <Download size={14} /> Tải PDF mẫu
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn--primary lp-btn--sm"
                  onClick={() => setShowCert(false)}
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
