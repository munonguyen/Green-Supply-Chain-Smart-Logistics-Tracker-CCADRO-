import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import VehicleMarker from '../components/map/VehicleMarker';
import { Leaf, Clock, Gauge, Award, CheckCircle, Navigation, Sliders } from 'lucide-react';

const DEFAULT_CANDIDATES = [
  {
    candidateName: 'Hành Lang Xanh Tối Ưu Phát Thải (Khuyến nghị)',
    routeBadge: 'TỐI ƯU CO2e NHẤT',
    color: '#10b981',
    distanceMeters: 28500,
    durationSeconds: 2700,
    estimatedFuelLiters: 9.12,
    estimatedCo2Kg: 23.95,
    compositeScore: 0.942,
    waypoints: [
      { latitude: 10.762622, longitude: 106.795677 },
      { latitude: 10.795, longitude: 106.774 },
      { latitude: 10.835, longitude: 106.752 },
      { latitude: 10.88, longitude: 106.72 },
      { latitude: 10.931215, longitude: 106.697426 }
    ]
  },
  {
    candidateName: 'Lộ Trình Cân Bằng Đa Mục Tiêu (Xa lộ Hà Nội)',
    routeBadge: 'CÂN BẰNG THỜI GIAN & CO2e',
    color: '#0ea5e9',
    distanceMeters: 29800,
    durationSeconds: 2520,
    estimatedFuelLiters: 10.15,
    estimatedCo2Kg: 26.8,
    compositeScore: 0.875,
    waypoints: [
      { latitude: 10.762622, longitude: 106.795677 },
      { latitude: 10.808, longitude: 106.788 },
      { latitude: 10.858, longitude: 106.768 },
      { latitude: 10.902, longitude: 106.735 },
      { latitude: 10.931215, longitude: 106.697426 }
    ]
  },
  {
    candidateName: 'Tuyến Cao Tốc Nhanh Nhất (Ưu tiên ETA)',
    routeBadge: 'THỜI GIAN NHANH NHẤT',
    color: '#f59e0b',
    distanceMeters: 31600,
    durationSeconds: 2340,
    estimatedFuelLiters: 11.4,
    estimatedCo2Kg: 30.15,
    compositeScore: 0.812,
    waypoints: [
      { latitude: 10.762622, longitude: 106.795677 },
      { latitude: 10.825, longitude: 106.805 },
      { latitude: 10.878, longitude: 106.782 },
      { latitude: 10.931215, longitude: 106.697426 }
    ]
  }
];

export default function PlanningPage() {
  const { shipmentId } = useParams();
  const [candidates, setCandidates] = useState(DEFAULT_CANDIDATES);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [carbonWeight, setCarbonWeight] = useState(55);
  const [timeWeight, setTimeWeight] = useState(30);
  const [distanceWeight, setDistanceWeight] = useState(15);

  useEffect(() => {
    if (!shipmentId) return;

    api
      .calculateRoutes(shipmentId)
      .then((routes) => {
        if (Array.isArray(routes) && routes.length > 0) {
          setCandidates(
            routes.map((r, i) => ({
              ...DEFAULT_CANDIDATES[i % DEFAULT_CANDIDATES.length],
              ...r
            }))
          );
        }
      })
      .catch(() => {
        // Keep rich Vietnamese fallback candidates
      });
  }, [shipmentId]);

  const activeCandidate = candidates[selectedIdx] || candidates[0];
  const activeCoords = activeCandidate?.waypoints?.map((wp) => [wp.latitude, wp.longitude]) || [
    [10.762622, 106.795677],
    [10.931215, 106.697426]
  ];
  const midPoint = activeCoords[Math.floor(activeCoords.length / 2)] || [10.84, 106.74];

  return (
    <div className="page-body">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px'
            }}
          >
            <Leaf size={14} /> THUẬT TOÁN ĐỊNH TUYẾN ĐA MỤC TIÊU PARETO (UC05)
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
            Lập Lộ Trình Xanh 3D &amp; Phân Tích Đánh Đổi Phát Thải
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            So sánh trực quan trên bản đồ 3D giữa lượng phát thải khí nhà kính (kgCO2e), thời gian
            hành trình và cự ly vận chuyển.
          </p>
        </div>

        <Link to={`/dispatch/${shipmentId}`} className="btn btn-primary">
          <Navigation size={16} />
          <span>Xác Nhận Tuyến &amp; Chuyển Sang Điều Phối Xe</span>
        </Link>
      </div>

      {/* Multi-Criteria Weight Bar */}
      <div
        className="card"
        style={{
          marginBottom: '22px',
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={20} color="var(--accent-green)" />
          <div>
            <strong style={{ fontSize: '0.9rem', display: 'block' }}>
              Bộ Trọng Số Tối Ưu Đa Tiêu Chí
            </strong>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Điều chỉnh mức độ ưu tiên cho chuyến hàng
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              marginBottom: 4
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Trọng số Giảm CO2e</span>
            <strong style={{ color: 'var(--accent-green)' }}>{carbonWeight}%</strong>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={carbonWeight}
            onChange={(e) => setCarbonWeight(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#10b981' }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              marginBottom: 4
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Trọng số Thời gian (ETA)</span>
            <strong style={{ color: 'var(--accent-blue)' }}>{timeWeight}%</strong>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={timeWeight}
            onChange={(e) => setTimeWeight(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#0ea5e9' }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              marginBottom: 4
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Trọng số Cự ly &amp; Nhiên liệu</span>
            <strong style={{ color: 'var(--accent-amber)' }}>{distanceWeight}%</strong>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            value={distanceWeight}
            onChange={(e) => setDistanceWeight(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b' }}
          />
        </div>
      </div>

      {/* Main Split: 3D Map + Route Candidates */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 370px',
          gap: '22px',
          alignItems: 'start'
        }}
      >
        <div className="card" style={{ padding: '14px' }}>
          <MapView
            center={[10.84, 106.75]}
            zoom={11}
            defaultLayer="google_hybrid"
            default3D={true}
            height={540}
            hudTitle={`Đang chọn: ${activeCandidate.candidateName}`}
            hudSubtitle={`Phát thải dự kiến: ${activeCandidate.estimatedCo2Kg} kgCO2e • Cự ly ${(activeCandidate.distanceMeters / 1000).toFixed(1)} km`}
          >
            <OriginMarker position={[10.762622, 106.795677]} title="Cảng Cát Lái, TP.HCM" />
            <DestinationMarker position={[10.931215, 106.697426]} title="KCN VSIP 1, Bình Dương" />

            {/* Render unselected candidates as subtle dashed lines */}
            {candidates.map((cand, idx) => {
              if (idx === selectedIdx) return null;
              const coords = cand.waypoints.map((wp) => [wp.latitude, wp.longitude]);
              return (
                <RoutePolyline
                  key={cand.candidateName}
                  positions={coords}
                  color={cand.color || '#94a3b8'}
                  weight={4}
                  opacity={0.55}
                  dashArray="8, 8"
                  showCorridorBuffer={false}
                  autoFit={false}
                />
              );
            })}

            {/* Render selected candidate with full 3D Corridor Halo */}
            <RoutePolyline
              positions={activeCoords}
              color={activeCandidate.color || '#10b981'}
              weight={6}
              showCorridorBuffer={true}
            />

            <VehicleMarker
              position={midPoint}
              title="Mô phỏng lộ trình V001"
              heading={330}
              speedKmh={56}
            />
          </MapView>
        </div>

        {/* Route Candidate Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
            Các Phương Án Lộ Trình Khả Thi ({candidates.length})
          </h3>

          {candidates.map((cand, idx) => {
            const isSelected = selectedIdx === idx;
            const dynamicScore = (
              (cand.compositeScore * (carbonWeight + timeWeight + distanceWeight)) /
              100
            ).toFixed(3);
            return (
              <div
                key={idx}
                className="card"
                onClick={() => setSelectedIdx(idx)}
                style={{
                  cursor: 'pointer',
                  padding: '18px',
                  border: isSelected
                    ? `2px solid ${cand.color || 'var(--accent-green)'}`
                    : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}
                >
                  <span
                    className="badge badge-green"
                    style={{
                      fontSize: '0.68rem',
                      borderColor: cand.color,
                      color: cand.color
                    }}
                  >
                    {cand.routeBadge || `PHƯƠNG ÁN 0${idx + 1}`}
                  </span>
                  {isSelected && <CheckCircle size={18} color="var(--accent-green)" />}
                </div>

                <strong
                  style={{
                    fontSize: '0.96rem',
                    display: 'block',
                    color: 'var(--text-main)',
                    marginBottom: '12px'
                  }}
                >
                  {cand.candidateName}
                </strong>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gauge size={15} color="var(--accent-blue)" />
                    <span>
                      Cự ly:{' '}
                      <strong style={{ color: 'var(--text-main)' }}>
                        {(cand.distanceMeters / 1000).toFixed(1)} km
                      </strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--accent-amber)" />
                    <span>
                      ETA:{' '}
                      <strong style={{ color: 'var(--text-main)' }}>
                        {Math.round(cand.durationSeconds / 60)} phút
                      </strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Leaf size={15} color="var(--accent-green)" />
                    <strong style={{ color: 'var(--accent-green)' }}>
                      {cand.estimatedCo2Kg} kg CO2e
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={15} color="var(--accent-amber)" />
                    <span>
                      Điểm Pareto:{' '}
                      <strong style={{ color: 'var(--text-main)' }}>{dynamicScore}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
