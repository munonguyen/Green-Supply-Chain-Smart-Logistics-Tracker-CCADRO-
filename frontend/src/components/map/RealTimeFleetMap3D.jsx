import React, { useEffect, useState } from 'react';
import MapView from './MapView';
import RoutePolyline from './RoutePolyline';
import VehicleMarker from './VehicleMarker';
import OriginMarker from './OriginMarker';
import DestinationMarker from './DestinationMarker';
import { Activity, Compass, Pause, Play, Radio, Thermometer, Truck } from 'lucide-react';

const FLEET_CORRIDORS = [
  {
    vehicleCode: 'V001',
    plate: '51C-888.99',
    shipmentCode: 'SHP-2026-0001',
    customerId: 'VINAMILK',
    driverName: 'Nguyễn Văn Tài',
    vehicleType: 'Xe tải điện EV • Chuỗi lạnh',
    originName: 'Cảng Cát Lái, TP.HCM',
    destinationName: 'KCN VSIP 1, Bình Dương',
    baseSpeedKmh: 56,
    tempC: -18.2,
    co2SavedKg: 14.8,
    color: '#10b981',
    waypoints: [
      [10.7626, 106.7957],
      [10.7852, 106.7745],
      [10.8124, 106.7612],
      [10.8485, 106.7521],
      [10.8842, 106.7341],
      [10.9125, 106.7124],
      [10.9312, 106.6974]
    ]
  },
  {
    vehicleCode: 'V002',
    plate: '51D-686.88',
    shipmentCode: 'SHP-2026-0002',
    customerId: 'SAMSUNG_VN',
    driverName: 'Trần Hoàng Nam',
    vehicleType: 'Đầu kéo Euro 5 • Container 40ft',
    originName: 'Khu Công Nghệ Cao Q.9',
    destinationName: 'Cảng Cái Mép - Thị Vải',
    baseSpeedKmh: 64,
    tempC: 21.5,
    co2SavedKg: 26.4,
    color: '#0ea5e9',
    waypoints: [
      [10.8411, 106.8099],
      [10.7985, 106.8421],
      [10.7412, 106.9125],
      [10.6645, 106.9812],
      [10.5912, 107.0185],
      [10.5214, 107.0312]
    ]
  },
  {
    vehicleCode: 'V003',
    plate: '61C-339.79',
    shipmentCode: 'SHP-2026-0003',
    customerId: 'TH_TRUE_MILK',
    driverName: 'Lê Minh Khôi',
    vehicleType: 'Xe tải lạnh EV • Đông lạnh sâu',
    originName: 'KCN Sóng Thần, Bình Dương',
    destinationName: 'KCN Hiệp Phước, Nhà Bè',
    baseSpeedKmh: 51,
    tempC: -19.0,
    co2SavedKg: 18.2,
    color: '#a855f7',
    waypoints: [
      [10.8925, 106.7452],
      [10.8412, 106.7315],
      [10.7745, 106.7285],
      [10.7124, 106.7395],
      [10.6412, 106.7521]
    ]
  }
];

function interpolateRoutePosition(waypoints, progress01) {
  if (!waypoints || waypoints.length === 0) return [10.8231, 106.74];
  if (waypoints.length === 1) return waypoints[0];
  const clamped = Math.max(0, Math.min(0.9999, progress01));
  const totalSegments = waypoints.length - 1;
  const scaled = clamped * totalSegments;
  const segIdx = Math.floor(scaled);
  const segFrac = scaled - segIdx;
  const start = waypoints[segIdx];
  const end = waypoints[Math.min(segIdx + 1, totalSegments)];
  const lat = start[0] + (end[0] - start[0]) * segFrac;
  const lng = start[1] + (end[1] - start[1]) * segFrac;
  return [lat, lng];
}

export default function RealTimeFleetMap3D({
  filterCustomerId = null,
  height = 480,
  title = 'Bản Đồ 3D Giám Sát Đội Xe Thời Gian Thực (Google Hybrid 3D)'
}) {
  const corridors = filterCustomerId
    ? FLEET_CORRIDORS.filter((c) => c.customerId === filterCustomerId)
    : FLEET_CORRIDORS;
  const activeCorridors = corridors.length > 0 ? corridors : [FLEET_CORRIDORS[0]];

  const [selectedCode, setSelectedCode] = useState(activeCorridors[0].vehicleCode);
  const [isPlaying, setIsPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const [focusCoords, setFocusCoords] = useState(null);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const vehiclesWithLivePos = activeCorridors.map((item, idx) => {
    const baseOffset = 0.28 + idx * 0.21;
    const progress = (baseOffset + tick * 0.014) % 0.94;
    const currentPos = interpolateRoutePosition(item.waypoints, progress);
    const liveSpeed = Math.round(item.baseSpeedKmh + Math.sin(tick * 0.7 + idx) * 4);
    const remainingKm = Math.max(2.4, (1 - progress) * 28.5).toFixed(1);
    const etaMins = Math.max(4, Math.round((remainingKm / liveSpeed) * 60));
    return {
      ...item,
      progressPercent: Math.round(progress * 100),
      currentPos,
      liveSpeed,
      remainingKm,
      etaMins
    };
  });

  const selectedVehicle =
    vehiclesWithLivePos.find((v) => v.vehicleCode === selectedCode) || vehiclesWithLivePos[0];

  const handleSelectVehicle = (veh) => {
    setSelectedCode(veh.vehicleCode);
    setFocusCoords(veh.currentPos);
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px'
            }}
          >
            <Radio size={14} /> ĐỊNH VỊ VỆ TINH GPS &amp; GÓC NHÌN 3D TRỰC TUYẾN
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: isPlaying ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-card-hover)',
              color: isPlaying ? 'var(--accent-green)' : 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Đang cập nhật GPS trực tiếp' : 'Tạm dừng mô phỏng'}</span>
          </button>

          <button
            type="button"
            onClick={() => setFocusCoords([...selectedVehicle.currentPos])}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Compass size={14} />
            <span>Bám theo xe {selectedVehicle.vehicleCode}</span>
          </button>
        </div>
      </div>

      {/* Main Split: 3D Map Left + Live Vehicle Telemetry Selector Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 330px',
          gap: '18px',
          alignItems: 'stretch'
        }}
      >
        {/* 3D Map Canvas */}
        <MapView
          center={selectedVehicle.currentPos}
          zoom={12}
          focusPosition={focusCoords}
          focusZoom={14}
          defaultLayer="google_hybrid"
          default3D={true}
          height={height}
          hudTitle={`${selectedVehicle.vehicleCode} (${selectedVehicle.plate}) • ${selectedVehicle.shipmentCode}`}
          hudSubtitle={`${selectedVehicle.originName} → ${selectedVehicle.destinationName} • Còn ${selectedVehicle.remainingKm} km`}
        >
          <OriginMarker
            position={selectedVehicle.waypoints[0]}
            title={selectedVehicle.originName}
          />
          <DestinationMarker
            position={selectedVehicle.waypoints[selectedVehicle.waypoints.length - 1]}
            title={selectedVehicle.destinationName}
          />
          <RoutePolyline
            positions={selectedVehicle.waypoints}
            color={selectedVehicle.color}
            weight={6}
            showCorridorBuffer={true}
          />
          {vehiclesWithLivePos.map((veh) => (
            <VehicleMarker
              key={veh.vehicleCode}
              position={veh.currentPos}
              title={`${veh.vehicleCode} (${veh.plate})`}
              heading={325}
              speedKmh={veh.liveSpeed}
              tempC={veh.tempC}
            />
          ))}
        </MapView>

        {/* Right Column: Active Vehicles & Live Telemetry Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Phương tiện đang di chuyển ({vehiclesWithLivePos.length})
            </div>

            {vehiclesWithLivePos.map((veh) => {
              const isSelected = veh.vehicleCode === selectedVehicle.vehicleCode;
              return (
                <div
                  key={veh.vehicleCode}
                  onClick={() => handleSelectVehicle(veh)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card-hover)',
                    border: isSelected
                      ? '1.5px solid var(--accent-green)'
                      : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={16} color={veh.color} />
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                        {veh.vehicleCode} • {veh.plate}
                      </strong>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                      {veh.liveSpeed} km/h
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginBottom: '8px'
                    }}
                  >
                    {veh.originName} → {veh.destinationName}
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.2)',
                      overflow: 'hidden',
                      marginBottom: '6px'
                    }}
                  >
                    <div
                      style={{
                        width: `${veh.progressPercent}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: veh.color,
                        transition: 'width 0.6s ease'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>Tiến độ: {veh.progressPercent}%</span>
                    <span>ETA: ~{veh.etaMins} phút</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Vehicle Live Telemetry Box */}
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-card-hover)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '10px'
              }}
            >
              <Activity size={15} color="var(--accent-blue)" />
              <span>Thông số Telemetry: {selectedVehicle.vehicleCode}</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.76rem'
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Tài xế phụ trách</div>
                <strong style={{ color: 'var(--text-main)' }}>{selectedVehicle.driverName}</strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Nhiệt độ thùng hàng</div>
                <strong style={{ color: 'var(--accent-blue)' }}>
                  <Thermometer size={12} style={{ display: 'inline', marginRight: 2 }} />
                  {selectedVehicle.tempC}°C
                </strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Tọa độ GPS</div>
                <strong style={{ color: 'var(--text-main)' }}>
                  {selectedVehicle.currentPos[0].toFixed(4)},{' '}
                  {selectedVehicle.currentPos[1].toFixed(4)}
                </strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>CO2e cắt giảm</div>
                <strong style={{ color: 'var(--accent-green)' }}>
                  -{selectedVehicle.co2SavedKg} kg
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
