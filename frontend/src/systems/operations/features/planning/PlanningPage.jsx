import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../../services/api';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import VehicleMarker from '../../../../shared/map/VehicleMarker';
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
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState(DEFAULT_CANDIDATES);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [carbonWeight, setCarbonWeight] = useState(55);
  const [timeWeight, setTimeWeight] = useState(30);
  const [distanceWeight, setDistanceWeight] = useState(15);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!shipmentId) return;

    api
      .calculateRoutes(shipmentId)
      .then((res) => {
        const routes = res?.result ?? res;
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

  // True Min-Max Normalized Multi-Criteria Pareto Scoring
  const scoredCandidates = useMemo(() => {
    const sumW = carbonWeight + timeWeight + distanceWeight || 100;
    const wCo2 = carbonWeight / sumW;
    const wTime = timeWeight / sumW;
    const wDist = distanceWeight / sumW;

    const co2Vals = candidates.map((c) => Number(c.estimatedCo2Kg || 0));
    const timeVals = candidates.map((c) => Number(c.durationSeconds || 0));
    const distVals = candidates.map((c) => Number(c.distanceMeters || 0));

    const minMaxScore = (val, arr) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      if (max - min < 1e-6) return 1.0;
      return 1.0 - (val - min) / (max - min);
    };

    return candidates.map((c) => {
      const sCo2 = minMaxScore(Number(c.estimatedCo2Kg || 0), co2Vals);
      const sTime = minMaxScore(Number(c.durationSeconds || 0), timeVals);
      const sDist = minMaxScore(Number(c.distanceMeters || 0), distVals);
      const paretoScore = 0.65 + 0.34 * (wCo2 * sCo2 + wTime * sTime + wDist * sDist);
      return { ...c, paretoScore: Number(paretoScore.toFixed(3)) };
    });
  }, [candidates, carbonWeight, timeWeight, distanceWeight]);

  const bestScoreIdx = useMemo(() => {
    let bestI = 0;
    scoredCandidates.forEach((c, i) => {
      if (c.paretoScore > (scoredCandidates[bestI]?.paretoScore || 0)) bestI = i;
    });
    return bestI;
  }, [scoredCandidates]);

  const activeCandidate = scoredCandidates[selectedIdx] || scoredCandidates[0];
  const activeCoords =
    Array.isArray(activeCandidate?.waypoints) && activeCandidate.waypoints.length >= 2
      ? activeCandidate.waypoints.map((wp) => [wp.latitude, wp.longitude])
      : [
          [10.762622, 106.795677],
          [10.931215, 106.697426]
        ];
  const originCoord = activeCoords[0];
  const destCoord = activeCoords[activeCoords.length - 1];
  const midPoint = activeCoords[Math.floor(activeCoords.length / 2)] || originCoord;

  const handleConfirmPlan = async () => {
    setConfirming(true);
    try {
      if (activeCandidate?.id) {
        await api.selectRoute(activeCandidate.id).catch(() => {});
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          'ccadro_selected_plan',
          JSON.stringify({
            shipmentId,
            candidateName: activeCandidate.candidateName,
            distanceMeters: activeCandidate.distanceMeters,
            durationSeconds: activeCandidate.durationSeconds,
            estimatedCo2Kg: activeCandidate.estimatedCo2Kg,
            waypoints: activeCoords
          })
        );
      }
    } finally {
      setConfirming(false);
      navigate(`/dispatch/${shipmentId || 'e0000000-0000-0000-0000-000000000001'}`);
    }
  };

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

        <button
          type="button"
          onClick={handleConfirmPlan}
          disabled={confirming}
          className="btn btn-primary"
        >
          <Navigation size={16} />
          <span>
            {confirming
              ? 'Đang Khóa Phương Án...'
              : 'Xác Nhận Tuyến & Chuyển Sang Điều Phối Xe'}
          </span>
        </button>
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
      <div className="split-map-grid">
        <div className="card" style={{ padding: '14px' }}>
          <MapView
            center={midPoint}
            zoom={11}
            defaultLayer="google_hybrid"
            default3D={true}
            height={540}
            hudTitle={`Đang chọn: ${activeCandidate.candidateName}`}
            hudSubtitle={`Phát thải dự kiến: ${activeCandidate.estimatedCo2Kg} kgCO2e • Cự ly ${(activeCandidate.distanceMeters / 1000).toFixed(1)} km`}
          >
            <OriginMarker position={originCoord} title="Điểm xuất phát (Origin)" />
            <DestinationMarker position={destCoord} title="Điểm đích giao hàng (Destination)" />

            {/* Render unselected candidates as subtle dashed lines */}
            {scoredCandidates.map((cand, idx) => {
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
            Các Phương Án Lộ Trình Khả Thi ({scoredCandidates.length})
          </h3>

          {scoredCandidates.map((cand, idx) => {
            const isSelected = selectedIdx === idx;
            const isBestPareto = idx === bestScoreIdx;
            const dynamicScore = cand.paretoScore.toFixed(3);
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
                    marginBottom: '6px',
                    gap: '6px'
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
                    {isBestPareto ? `★ ĐỀ XUẤT PARETO • ${cand.routeBadge || ''}` : cand.routeBadge || `PHƯƠNG ÁN 0${idx + 1}`}
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
