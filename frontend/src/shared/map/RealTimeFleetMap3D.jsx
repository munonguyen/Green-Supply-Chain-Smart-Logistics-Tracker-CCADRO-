import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from './MapView';
import RoutePolyline from './RoutePolyline';
import VehicleMarker from './VehicleMarker';
import OriginMarker from './OriginMarker';
import DestinationMarker from './DestinationMarker';
import {
  Activity,
  AlertTriangle,
  Compass,
  Radio,
  RefreshCw,
  Thermometer,
  Truck
} from 'lucide-react';
import { api } from '../../services/api';
import {
  findNearestHubId,
  getRealRoadRoute,
  haversineDistanceMeters
} from '../../services/roadRoutingService';

const catlaiVsip = getRealRoadRoute('catlai', 'vsip');
const songthanCaimep = getRealRoadRoute('songthan', 'caimep');
const songthanHiepphuoc = getRealRoadRoute('songthan', 'hiepphuoc');

const BASELINE_REFERENCE_VEHICLES = [
  {
    vehicleCode: 'V001',
    plate: '51C-888.99',
    shipmentCode: 'SHP-2026-0001',
    customerId: 'VINAMILK',
    driverName: 'Nguyễn Văn Tài',
    vehicleType: 'Xe tải điện EV • Chuỗi lạnh',
    originName: 'Cảng Cát Lái, TP.HCM',
    destinationName: 'KCN VSIP 1, Bình Dương',
    baseSpeedKmh: 54,
    tempC: -18.2,
    co2SavedKg: 14.8,
    color: '#10b981',
    totalKm: catlaiVsip.distanceKm,
    waypoints: catlaiVsip.points,
    progressPercent: 42
  },
  {
    vehicleCode: 'V002',
    plate: '51D-686.88',
    shipmentCode: 'SHP-2026-0002',
    customerId: 'SAMSUNG_VN',
    driverName: 'Trần Hoàng Nam',
    vehicleType: 'Đầu kéo Euro 5 • Container 40ft',
    originName: 'ICD Sóng Thần, Bình Dương',
    destinationName: 'Cảng Cái Mép - Thị Vải',
    baseSpeedKmh: 62,
    tempC: 21.5,
    co2SavedKg: 26.4,
    color: '#0ea5e9',
    totalKm: songthanCaimep.distanceKm,
    waypoints: songthanCaimep.points,
    progressPercent: 58
  },
  {
    vehicleCode: 'V003',
    plate: '61C-339.79',
    shipmentCode: 'SHP-2026-0003',
    customerId: 'TH_TRUE_MILK',
    driverName: 'Lê Minh Khôi',
    vehicleType: 'Xe tải lạnh EV • Đông lạnh sâu',
    originName: 'ICD Sóng Thần, Bình Dương',
    destinationName: 'Cảng Hiệp Phước, Nhà Bè',
    baseSpeedKmh: 50,
    tempC: -19.0,
    co2SavedKg: 18.2,
    color: '#a855f7',
    totalKm: songthanHiepphuoc.distanceKm,
    waypoints: songthanHiepphuoc.points,
    progressPercent: 76
  }
];

function computeBearingDeg(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function loadLocalBookedSnapshots() {
  try {
    const raw = window.localStorage.getItem('ccadro_user_booked_shipments_v2');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => !s.isDeleted && s.status !== 'CANCELLED')
      .map((s) => {
        const originHub = Array.isArray(s.originCoords)
          ? findNearestHubId(s.originCoords[0], s.originCoords[1])
          : 'catlai';
        const destHub = Array.isArray(s.destCoords)
          ? findNearestHubId(s.destCoords[0], s.destCoords[1])
          : 'vsip';
        const road = getRealRoadRoute(originHub, destHub);
        const pts =
          Array.isArray(s.waypoints) && s.waypoints.length >= 2 ? s.waypoints : road.points;
        const totalKm = Number(s.distanceKm || road.distanceKm || 28);
        const speedKmh = Number(s.speedKmh || 52);
        const progress = Math.min(100, Math.max(0, Math.round(Number(s.progress || 35))));
        const idx = Math.min(
          pts.length - 1,
          Math.max(0, Math.floor((progress / 100) * (pts.length - 1)))
        );
        const currentPos = pts[idx] || pts[0];
        const remainingKm = Number(((totalKm * (100 - progress)) / 100).toFixed(1));
        const etaMins =
          s.status === 'DELIVERED' || remainingKm <= 0.1
            ? 0
            : Math.max(1, Math.round((remainingKm / Math.max(speedKmh, 30)) * 60));
        return {
          key: s.shipmentCode,
          vehicleCode: s.containerCode || s.shipmentCode,
          plate: s.licensePlate || '51C-888.99',
          shipmentCode: s.shipmentCode,
          customerId: s.customerId || 'B2B_CUSTOMER',
          driverName: s.driverName || 'Tài xế CCADRO',
          originName: s.originName || 'Cảng Cát Lái',
          destinationName: s.destinationName || 'KCN VSIP 1',
          currentPos,
          liveSpeed: speedKmh,
          heading: computeBearingDeg(
            currentPos[0],
            currentPos[1],
            pts[pts.length - 1][0],
            pts[pts.length - 1][1]
          ),
          totalKm,
          remainingKm: remainingKm.toFixed(1),
          progressPercent: progress,
          etaMins,
          tempC: Number(s.temperatureC ?? 18.5),
          co2SavedKg: Number(s.co2SavedKg || 14.5),
          deviationMeters: 0,
          deviationStatus: 'ON_ROUTE',
          color: '#10b981',
          waypoints: pts,
          dataSource: 'LOCAL_BOOKING_SYNC',
          lastTelemetryAt: s.createdAt || null
        };
      });
  } catch {
    return [];
  }
}

function mapBackendTelemetryToView(item, index) {
  const palette = ['#10b981', '#0ea5e9', '#a855f7', '#f59e0b'];
  const oHub =
    item.originLat != null && item.originLon != null
      ? findNearestHubId(item.originLat, item.originLon)
      : 'catlai';
  const dHub =
    item.destinationLat != null && item.destinationLon != null
      ? findNearestHubId(item.destinationLat, item.destinationLon)
      : 'vsip';
  const road = getRealRoadRoute(oHub, dHub);

  const curPos =
    item.latitude != null && item.longitude != null
      ? [Number(item.latitude), Number(item.longitude)]
      : road.points[Math.floor(road.points.length * 0.35)] || road.points[0];

  const destPt =
    item.destinationLat != null && item.destinationLon != null
      ? [Number(item.destinationLat), Number(item.destinationLon)]
      : road.points[road.points.length - 1];

  const totalKm = Number(item.totalDistanceKm || road.distanceKm || 28);
  const directKm =
    haversineDistanceMeters(curPos[0], curPos[1], destPt[0], destPt[1]) / 1000.0;
  const remainingNum =
    item.remainingDistanceKm != null
      ? Math.max(0, Number(item.remainingDistanceKm))
      : Math.min(totalKm, Number((directKm * 1.15).toFixed(1)));
  const speedNum = Math.max(0, Math.round(Number(item.speedKmh ?? 0)));
  const progress = Math.min(100, Math.max(0, Number(item.progressPercent ?? 0)));
  const etaMins =
    item.etaMinutes != null
      ? Math.max(0, Number(item.etaMinutes))
      : progress >= 100
        ? 0
        : Math.max(1, Math.round((remainingNum / Math.max(speedNum, 45)) * 60));

  return {
    key: item.tripId || item.vehicleCode || item.containerCode || `live-${index}`,
    tripId: item.tripId,
    vehicleCode: item.vehicleCode || item.containerCode || `V00${index + 1}`,
    plate: item.licensePlate || '51C-888.99',
    shipmentCode: item.shipmentCode || item.tripCode || 'SHP-LIVE',
    customerId: item.customerId || 'VINAMILK',
    driverName: item.driverName || 'Tài xế điều phối NOC',
    originName: item.originName || 'Điểm xuất phát',
    destinationName: item.destinationName || 'Điểm giao hàng',
    currentPos: curPos,
    liveSpeed: speedNum,
    heading:
      item.headingDegrees != null && Number(item.headingDegrees) > 0
        ? Number(item.headingDegrees)
        : computeBearingDeg(curPos[0], curPos[1], destPt[0], destPt[1]),
    totalKm,
    remainingKm: remainingNum.toFixed(1),
    progressPercent: progress,
    etaMins,
    tempC: item.temperatureC != null ? Number(item.temperatureC) : 20.0,
    co2SavedKg: item.co2SavedKg != null ? Number(item.co2SavedKg) : 0.0,
    deviationMeters: item.deviationMeters != null ? Number(item.deviationMeters) : 0,
    deviationStatus: item.deviationStatus || 'ON_ROUTE',
    color: palette[index % palette.length],
    waypoints: road.points,
    dataSource: item.dataSource || 'LIVE_TELEMETRY_DB',
    lastTelemetryAt: item.lastTelemetryAt || null
  };
}

function buildBaselineFallbackList(filterCustomerId) {
  const scoped = filterCustomerId
    ? BASELINE_REFERENCE_VEHICLES.filter((c) => c.customerId === filterCustomerId)
    : BASELINE_REFERENCE_VEHICLES;
  const list = scoped.length > 0 ? scoped : [BASELINE_REFERENCE_VEHICLES[0]];
  return list.map((item) => {
    const progress01 = item.progressPercent / 100;
    const idx = Math.min(
      item.waypoints.length - 1,
      Math.max(0, Math.floor(progress01 * (item.waypoints.length - 1)))
    );
    const currentPos = item.waypoints[idx] || item.waypoints[0];
    const destPos = item.waypoints[item.waypoints.length - 1];
    const remainingKm = Math.max(0, item.totalKm * (1 - progress01));
    const etaMins = Math.max(1, Math.round((remainingKm / item.baseSpeedKmh) * 60));
    return {
      key: item.vehicleCode,
      vehicleCode: item.vehicleCode,
      plate: item.plate,
      shipmentCode: item.shipmentCode,
      customerId: item.customerId,
      driverName: item.driverName,
      originName: item.originName,
      destinationName: item.destinationName,
      currentPos,
      liveSpeed: item.baseSpeedKmh,
      heading: computeBearingDeg(currentPos[0], currentPos[1], destPos[0], destPos[1]),
      totalKm: item.totalKm,
      remainingKm: remainingKm.toFixed(1),
      progressPercent: item.progressPercent,
      etaMins,
      tempC: item.tempC,
      co2SavedKg: item.co2SavedKg,
      deviationMeters: 0,
      deviationStatus: 'ON_ROUTE',
      color: item.color,
      waypoints: item.waypoints,
      dataSource: 'AWAITING_BACKEND_GPS',
      lastTelemetryAt: null
    };
  });
}

export default function RealTimeFleetMap3D({
  filterCustomerId = null,
  height = 480,
  title = 'Bản Đồ Vệ Tinh 3D Giám Sát Toàn Đội Xe Thời Gian Thực (Google Hybrid 3D)'
}) {
  const [fleetVehicles, setFleetVehicles] = useState(() => {
    const localOrders = !filterCustomerId ? loadLocalBookedSnapshots() : [];
    const baselines = buildBaselineFallbackList(filterCustomerId);
    const codes = new Set(localOrders.map((o) => o.shipmentCode));
    return [...localOrders, ...baselines.filter((b) => !codes.has(b.shipmentCode))];
  });
  const [backendConnected, setBackendConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);

  const fetchLiveFromBackend = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api.getLiveFleetTelemetry(
        filterCustomerId ? { customerId: filterCustomerId } : {}
      );
      const list = res?.result ?? res;
      if (Array.isArray(list) && list.length > 0) {
        setFleetVehicles(list.map(mapBackendTelemetryToView));
        setBackendConnected(true);
        setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
        return;
      }
      setBackendConnected(true);
      setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
    } catch {
      setBackendConnected(false);
    } finally {
      setSyncing(false);
    }
  }, [filterCustomerId]);

  useEffect(() => {
    let isMounted = true;
    fetchLiveFromBackend();

    const pollTimer = setInterval(() => {
      if (isMounted) fetchLiveFromBackend();
    }, 10000);

    let es;
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      const base =
        (import.meta.env.VITE_API_URL || 'http://localhost:8888') + '/api/v1/tracking/stream';
      const params = new URLSearchParams();
      if (filterCustomerId) params.set('customerId', filterCustomerId);
      const jwtToken =
        window.localStorage.getItem('ccadro_token') ||
        window.localStorage.getItem('ccadro_access_token_v1');
      if (jwtToken) params.set('token', jwtToken);
      const streamUrl = params.toString() ? `${base}?${params.toString()}` : base;

      try {
        es = new window.EventSource(streamUrl);
        es.addEventListener('fleet-snapshot', (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (isMounted && Array.isArray(payload) && payload.length > 0) {
              setFleetVehicles(payload.map(mapBackendTelemetryToView));
              setBackendConnected(true);
              setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
            }
          } catch {
            // ignore parse error
          }
        });
        es.addEventListener('fleet-telemetry-update', (evt) => {
          try {
            const updated = JSON.parse(evt.data);
            const mapped = mapBackendTelemetryToView(updated, 0);
            if (isMounted && mapped?.vehicleCode) {
              setBackendConnected(true);
              setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
              setFleetVehicles((prev) => {
                const idx = prev.findIndex(
                  (v) =>
                    (mapped.tripId && v.tripId === mapped.tripId) ||
                    v.vehicleCode === mapped.vehicleCode
                );
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = { ...copy[idx], ...mapped, color: copy[idx].color };
                  return copy;
                }
                return [mapped, ...prev];
              });
            }
          } catch {
            // ignore parse error
          }
        });
      } catch {
        // Offline / unit-test EventSource skip
      }
    }

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (es) es.close();
    };
  }, [fetchLiveFromBackend, filterCustomerId]);

  const selectedVehicle = useMemo(
    () =>
      fleetVehicles.find((v) => v.vehicleCode === selectedCode) ||
      fleetVehicles[0] ||
      buildBaselineFallbackList(filterCustomerId)[0],
    [fleetVehicles, selectedCode, filterCustomerId]
  );

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
              gap: '8px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
              flexWrap: 'wrap'
            }}
          >
            <Radio size={14} /> ĐỊNH VỊ VỆ TINH GPS &amp; GÓC NHÌN 3D TRỰC TUYẾN
            <span
              className={`badge ${backendConnected ? 'badge-green' : 'badge-amber'}`}
              style={{ fontSize: '0.68rem', padding: '2px 8px' }}
            >
              {backendConnected
                ? `LIVE GPS BACKEND (SSE)${lastSyncedTime ? ` • ${lastSyncedTime}` : ''}`
                : 'CHỜ KẾT NỐI TRACKING SERVICE (:8084)'}
            </span>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchLiveFromBackend}
            disabled={syncing}
            style={{
              padding: '7px 13px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: backendConnected ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-card-hover)',
              color: backendConnected ? 'var(--accent-green)' : 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: syncing ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} />
            <span>{syncing ? 'Đang đồng bộ GPS...' : 'Làm mới GPS từ Backend'}</span>
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
      <div className="split-map-grid">
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
          {fleetVehicles.map((veh) => (
            <VehicleMarker
              key={veh.key || veh.vehicleCode}
              position={veh.currentPos}
              title={`${veh.vehicleCode} (${veh.plate})`}
              heading={veh.heading}
              speedKmh={veh.liveSpeed}
              status={veh.deviationStatus === 'RED_DEVIATION' ? 'DEVIATION' : 'ON_ROUTE'}
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
              Phương tiện đang di chuyển ({fleetVehicles.length})
            </div>

            {fleetVehicles.map((veh) => {
              const isSelected = veh.vehicleCode === selectedVehicle.vehicleCode;
              const isRedDev = veh.deviationStatus === 'RED_DEVIATION';
              return (
                <div
                  key={veh.key || veh.vehicleCode}
                  onClick={() => handleSelectVehicle(veh)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card-hover)',
                    border: isRedDev
                      ? '1.5px solid #ef4444'
                      : isSelected
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
                    <span>
                      ETA: {veh.etaMins === 0 ? 'Đã tới đích' : `Khoảng ${veh.etaMins} phút`}
                    </span>
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
                justifyContent: 'space-between',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginBottom: '10px'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Activity size={15} color="var(--accent-blue)" />
                Thông số Telemetry: {selectedVehicle.vehicleCode}
              </span>
              {selectedVehicle.deviationStatus === 'RED_DEVIATION' && (
                <span className="badge badge-red" style={{ fontSize: '0.66rem' }}>
                  <AlertTriangle size={11} /> Lệch {selectedVehicle.deviationMeters}m
                </span>
              )}
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
