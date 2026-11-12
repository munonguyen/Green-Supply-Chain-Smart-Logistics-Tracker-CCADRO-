import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import VehicleMarker from '../components/map/VehicleMarker';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import DeviationMarker from '../components/map/DeviationMarker';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  Cpu,
  Leaf,
  Lock,
  Navigation,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { getRealRoadRoute, interpolateRoadPosition } from '../services/roadRoutingService';
import { HUB_CORRIDOR_DIRECTORY } from '../services/logisticsReferenceData';

const REROUTE_PATH = [
  [10.8525, 106.743],
  [10.869, 106.751],
  [10.894, 106.732],
  [10.915, 106.711],
  [10.931215, 106.697426]
];

function interpolateRoute(coords, t) {
  if (!coords || coords.length === 0) return [10.7623, 106.7824];
  return interpolateRoadPosition(coords, Math.max(0, Math.min(1, t)) * 100);
}

export default function TripTrackingPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'deviation' | 'rerouted'
  const [isPlaying, setIsPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [focusCoords, setFocusCoords] = useState(null);

  // User-decided Origin and Destination
  const [selectedOrigin, setSelectedOrigin] = useState('catlai');
  const [selectedDest, setSelectedDest] = useState('vsip');

  const originNode = useMemo(() => {
    return HUB_CORRIDOR_DIRECTORY.find((h) => h.id === selectedOrigin) || HUB_CORRIDOR_DIRECTORY[0];
  }, [selectedOrigin]);

  const destNode = useMemo(() => {
    return HUB_CORRIDOR_DIRECTORY.find((h) => h.id === selectedDest) || HUB_CORRIDOR_DIRECTORY[1];
  }, [selectedDest]);

  const activeRoadRoute = useMemo(() => {
    return getRealRoadRoute(selectedOrigin, selectedDest);
  }, [selectedOrigin, selectedDest]);

  const activeRoute = simulationMode === 'rerouted' ? REROUTE_PATH : activeRoadRoute.points;

  const focusLat = parseFloat(searchParams.get('focusLat'));
  const focusLon = parseFloat(searchParams.get('focusLon'));
  const incidentBannerTitle = searchParams.get('incident');
  const hasEmergencyFocus = !Number.isNaN(focusLat) && !Number.isNaN(focusLon);

  useEffect(() => {
    if (hasEmergencyFocus) {
      setSimulationMode('deviation');
      setFocusCoords([focusLat, focusLon]);
    }
  }, [hasEmergencyFocus, focusLat, focusLon]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 100);
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const progress01 = 0.35 + (step % 55) * 0.01;
  const movingNormalPos = interpolateRoute(activeRoute, progress01);
  const deviationPosition = hasEmergencyFocus ? [focusLat, focusLon] : [10.8525, 106.743];

  const currentVehiclePos = simulationMode === 'deviation' ? deviationPosition : movingNormalPos;
  const liveSpeed = simulationMode === 'deviation' ? 18 : 54 + (step % 5);

  return (
    <div className="page-body">
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px'
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
            <Radio size={14} /> GIÁM SÁT HÀNH TRÌNH VỆ TINH 3D &amp; ĐỆM HÀNH LANG ĐỊA LÝ
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
            Theo Dõi GPS Thời Gian Thực &amp; Cảnh Báo Lệch Tuyến
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Chuyến xe <strong>V001 (51C-888.99)</strong> • Hành lang {originNode.label} →{' '}
            {destNode.label} • Ngưỡng cảnh báo: 50m (Vàng) / 200m (Đỏ)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="btn btn-secondary"
            style={{ fontSize: '0.84rem' }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Đang chạy GPS Live' : 'Tiếp tục GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSimulationMode((prev) => (prev === 'deviation' ? 'normal' : 'deviation'))
            }
            className={`btn ${simulationMode === 'deviation' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem' }}
          >
            <RefreshCw size={15} />
            <span>
              {simulationMode === 'deviation'
                ? 'Khôi phục Đi Đúng Tuyến'
                : 'Mô phỏng Lệch Tuyến (>200m)'}
            </span>
          </button>

          <Link to={`/trips/${tripId}/carbon`} className="btn btn-secondary">
            <Leaf size={15} color="var(--accent-green)" />
            <span>Kiểm Toán Phát Thải Chuyến Đi</span>
          </Link>
        </div>
      </div>

      {/* Interactive Origin & Destination Selector Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--accent-green)',
              textTransform: 'uppercase'
            }}
          >
            🚩 Tuyến giám sát do người dùng chọn:
          </span>
          <select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'var(--bg-secondary)',
              color: 'inherit',
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            {HUB_CORRIDOR_DIRECTORY.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label} ({h.area})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const temp = selectedOrigin;
              setSelectedOrigin(selectedDest);
              setSelectedDest(temp);
            }}
            title="Đảo chiều tuyến đường"
            style={{
              height: 32,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid rgba(16,185,129,0.35)',
              background: 'rgba(16,185,129,0.12)',
              color: '#10b981',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeftRight size={14} />
          </button>

          <select
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'var(--bg-secondary)',
              color: 'inherit',
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            {HUB_CORRIDOR_DIRECTORY.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label} ({h.area})
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cự ly chuẩn:{' '}
          <strong style={{ color: 'var(--accent-green)' }}>{activeRoadRoute.distanceKm} km</strong>{' '}
          • Thời gian dự kiến: <strong>{activeRoadRoute.durationMinutes} phút</strong>
        </div>
      </div>

      {/* Deviation Alert & Dynamic Reroute Approval Banner */}
      {simulationMode === 'deviation' && (
        <div
          className="card"
          style={{
            border: '1.5px solid var(--accent-red)',
            background: 'rgba(239, 68, 68, 0.12)',
            marginBottom: '20px',
            padding: '18px 20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertTriangle
                size={26}
                color="var(--accent-red)"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {incidentBannerTitle ||
                    'BÁO ĐỘNG ĐỎ: Phát hiện xe V001 lệch khỏi hành lang 300m (> ngưỡng 200m)'}
                </div>
                <div
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    lineHeight: 1.55
                  }}
                >
                  Hệ thống ghi nhận 3 tín hiệu GPS hợp lệ liên tiếp vượt ngoài vùng đệm 200m tại tọa
                  độ ({deviationPosition[0].toFixed(4)}, {deviationPosition[1].toFixed(4)}). Hệ
                  thống đã tính toán lộ trình thay thế tối ưu giảm <strong>14,2% CO2e</strong> và
                  rút ngắn <strong>18 phút</strong>.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSimulationMode('rerouted');
                setFocusCoords(REROUTE_PATH[1]);
              }}
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              <CheckCircle2 size={16} />
              <span>Phê Duyệt Đổi Tuyến Mới (ACCEPT)</span>
            </button>
          </div>
        </div>
      )}

      {simulationMode === 'rerouted' && (
        <div
          className="card"
          style={{
            border: '1.5px solid var(--accent-green)',
            background: 'rgba(16, 185, 129, 0.12)',
            marginBottom: '20px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={24} color="var(--accent-green)" />
            <div>
              <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
                Đã Phê Duyệt Lộ Trình Thay Thế (Route Version #2 — ACCEPTED)
              </strong>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Xe V001 đang di chuyển trên hành lang xanh mới • Cắt giảm thêm 3,4 kg CO2e so với
                tuyến bị ùn tắc.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSimulationMode('normal')}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Xem lại tuyến gốc
          </button>
        </div>
      )}

      {/* Main Layout: 3D Map + Right Telemetry Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 350px',
          gap: '22px',
          alignItems: 'start'
        }}
      >
        <div className="card" style={{ padding: '14px' }}>
          <MapView
            center={[10.85, 106.74]}
            zoom={12}
            focusPosition={focusCoords}
            focusZoom={14}
            defaultLayer="google_hybrid"
            default3D={true}
            height={560}
            hudTitle="Xe tải điện V001 (51C-888.99) • Giám sát 3D Thời gian thực"
            hudSubtitle={
              simulationMode === 'deviation'
                ? 'CẢNH BÁO ĐỎ: Lệch hành lang 300m • Đang chờ duyệt đổi tuyến'
                : simulationMode === 'rerouted'
                  ? 'Đang chạy trên Lộ trình Xanh thay thế (Version #2)'
                  : `Đang bám tuyến chuẩn • Tốc độ ${liveSpeed} km/h`
            }
          >
            <OriginMarker
              position={activeRoute[0] || [10.7626, 106.7956]}
              title={originNode.label}
              label={originNode.label}
            />
            <DestinationMarker
              position={activeRoute[activeRoute.length - 1] || [10.9312, 106.6974]}
              title={destNode.label}
              label={destNode.label}
            />
            <RoutePolyline
              positions={activeRoute}
              color={simulationMode === 'rerouted' ? '#64748b' : '#10b981'}
              weight={simulationMode === 'rerouted' ? 4 : 6}
              dashArray={simulationMode === 'rerouted' ? '8, 8' : null}
              showCorridorBuffer={simulationMode !== 'rerouted'}
            />
            {simulationMode !== 'normal' && (
              <RoutePolyline
                positions={REROUTE_PATH}
                color="#0ea5e9"
                weight={6}
                dashArray={simulationMode === 'deviation' ? '10, 6' : null}
                showCorridorBuffer={simulationMode === 'rerouted'}
                autoFit={false}
              />
            )}
            <VehicleMarker
              position={currentVehiclePos}
              title="V001 (51C-888.99)"
              heading={335}
              speedKmh={liveSpeed}
              status={simulationMode === 'deviation' ? 'DEVIATION' : 'ON_ROUTE'}
              tempC={-18.2}
            />
            {simulationMode === 'deviation' && (
              <DeviationMarker position={deviationPosition} distanceMeters={300} severity="RED" />
            )}
          </MapView>
        </div>

        {/* Right Telemetry & Controls Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Activity size={18} color="var(--accent-blue)" />
              <span>Thông Số Telemetry Trực Tuyến</span>
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.88rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Phương tiện &amp; Biển số</span>
                <strong>V001 • 51C-888.99</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Vận tốc tức thời</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{liveSpeed} km/h</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Hướng di chuyển</span>
                <strong>335° Tây Bắc</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Độ lệch khỏi tâm tuyến</span>
                <strong
                  style={{
                    color:
                      simulationMode === 'deviation' ? 'var(--accent-red)' : 'var(--accent-green)'
                  }}
                >
                  {simulationMode === 'deviation' ? '300m (VƯỢT NGƯỠNG)' : '12m (AN TOÀN)'}
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Mã Container ISO 6346</span>
                <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Cpu size={13} /> TCKU-781920-4 (45R1)
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Khóa Seal GPS Hải Quan</span>
                <strong style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} /> VN-CUST-819204 (LOCKED)
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Gia tốc kế 3 trục (Shock)</span>
                <strong>0.24 G (An toàn &lt; 1.0G)</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Nhiệt độ chuỗi lạnh</span>
                <strong style={{ color: 'var(--accent-blue)' }}>-18,2°C (Gió cấp -18.4°C)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tọa độ GPS hiện tại</span>
                <code style={{ color: 'var(--text-main)' }}>
                  {currentVehiclePos[0].toFixed(4)}, {currentVehiclePos[1].toFixed(4)}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFocusCoords([...currentVehiclePos])}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px' }}
            >
              <Compass size={15} />
              <span>Đưa Camera 3D Bám Theo Xe</span>
            </button>
          </div>

          <div className="card">
            <h3
              style={{
                fontSize: '1.02rem',
                fontWeight: 800,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Navigation size={17} color="var(--accent-green)" />
              <span>Quy Tắc Giám Sát Hành Lang</span>
            </h3>
            <div
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                lineHeight: 1.65,
                display: 'grid',
                gap: '10px'
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-card-hover)',
                  borderLeft: '3px solid var(--accent-green)'
                }}
              >
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>
                  Vùng an toàn (&lt; 50m)
                </strong>
                Phương tiện bám sát lộ trình xanh đã phê duyệt.
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-card-hover)',
                  borderLeft: '3px solid var(--accent-amber)'
                }}
              >
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>
                  Cảnh báo vàng (50m – 200m)
                </strong>
                Nhắc nhở tài xế qua ứng dụng buồng lái khi lệch nhẹ khỏi làn đường.
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-card-hover)',
                  borderLeft: '3px solid var(--accent-red)'
                }}
              >
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>
                  Báo động đỏ (&gt; 200m)
                </strong>
                Sau 3 điểm GPS liên tiếp, tự động tính toán lộ trình thay thế và gửi Điều phối viên
                phê duyệt.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
