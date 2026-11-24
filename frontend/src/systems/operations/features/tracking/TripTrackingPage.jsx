import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  Leaf,
  Lock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import VehicleMarker from '../../../../shared/map/VehicleMarker';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import DeviationMarker from '../../../../shared/map/DeviationMarker';
import RouteEvidence from '../../../../shared/map/RouteEvidence';
import {
  evaluateDestinationArrival,
  extractGeoJsonLineStringPoints,
  measurePolylineDistanceKm
} from '../../../../services/roadRoutingService';
import { api, gatewayUrl } from '../../../../services/api';


export default function TripTrackingPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();

  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [liveTrip, setLiveTrip] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [liveProposals, setLiveProposals] = useState([]);
  const [linkedContainer, setLinkedContainer] = useState(null);
  const [dataSourceState, setDataSourceState] = useState('CONNECTING'); // 'LIVE_SSE' | 'LIVE_DB' | 'OFFLINE_NO_DATA'
  const [syncError, setSyncError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [calculatingReroute, setCalculatingReroute] = useState(false);
  const [focusCoords, setFocusCoords] = useState(null);

  const focusLat = parseFloat(searchParams.get('focusLat'));
  const focusLon = parseFloat(searchParams.get('focusLon'));
  const incidentBannerTitle = searchParams.get('incident');
  const hasEmergencyFocus = !Number.isNaN(focusLat) && !Number.isNaN(focusLon);

  const fetchRealTripData = useCallback(async () => {
    if (!tripId) return;
    setSyncing(true);
    try {
      const [liveRes, tripRes, histRes, propRes, contRes] = await Promise.allSettled([
        api.getLiveTripTelemetry(tripId),
        api.getTrip(tripId),
        api.getTripTelemetry(tripId),
        api.getTripProposals(tripId),
        api.getContainers()
      ]);

      const liveSnap =
        liveRes.status === 'fulfilled' ? liveRes.value?.result ?? liveRes.value : null;
      const tripData =
        tripRes.status === 'fulfilled' ? tripRes.value?.result ?? tripRes.value : null;
      const histList =
        histRes.status === 'fulfilled' ? histRes.value?.result ?? histRes.value : null;
      const proposals =
        propRes.status === 'fulfilled' ? propRes.value?.result ?? propRes.value : null;
      const containersList =
        contRes.status === 'fulfilled' ? contRes.value?.result ?? contRes.value : null;

      if (tripData && tripData.id) setLiveTrip(tripData);
      if (liveSnap && liveSnap.tripId) {
        setLiveTelemetry(liveSnap);
        setDataSourceState((prev) => (prev === 'LIVE_SSE' ? 'LIVE_SSE' : 'LIVE_DB'));
        setSyncError(null);
      } else if (tripData && tripData.id) {
        setDataSourceState('LIVE_DB');
        setSyncError(null);
      } else {
        setDataSourceState('OFFLINE_NO_DATA');
        setSyncError(
          'Chưa kết nối được Hệ thống Giám sát Hành trình. Dữ liệu GPS hiển thị dựa trên tín hiệu thực tế.'
        );
      }

      if (Array.isArray(histList)) {
        setTelemetryHistory(histList);
      }
      if (Array.isArray(proposals)) {
        setLiveProposals(proposals);
      }
      if (Array.isArray(containersList)) {
        const match =
          containersList.find(
            (c) =>
              (liveSnap?.containerCode && c.containerCode === liveSnap.containerCode) ||
              (liveSnap?.shipmentId && c.assignedShipmentId === liveSnap.shipmentId)
          ) || null;
        setLinkedContainer(match);
      }
    } catch (_) {
      setDataSourceState('OFFLINE_NO_DATA');
      setSyncError('Không thể truy vấn Tracking Service — chưa có telemetry thực.');
    } finally {
      setSyncing(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchRealTripData();
  }, [fetchRealTripData]);

  // Live SSE Stream + 10s backend refresh
  useEffect(() => {
    if (!tripId) return undefined;
    let eventSource = null;

    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      try {
        const base =
          gatewayUrl('/api/v1/tracking/stream');
        const token =
          window.localStorage.getItem('ccadro_token') ||
          window.localStorage.getItem('ccadro_access_token_v1') ||
          window.sessionStorage.getItem('ccadro_access_token_v1');
        const url = token ? `${base}?token=${encodeURIComponent(token)}` : base;
        eventSource = new window.EventSource(url);

        eventSource.addEventListener('fleet-snapshot', (evt) => {
          try {
            const list = JSON.parse(evt.data);
            if (Array.isArray(list)) {
              const matched = list.find((item) => item.tripId === tripId);
              if (matched) {
                setLiveTelemetry(matched);
                setDataSourceState('LIVE_SSE');
                setSyncError(null);
              }
            }
          } catch (_) {
            // ignore
          }
        });

        eventSource.addEventListener('fleet-telemetry-update', (evt) => {
          try {
            const updated = JSON.parse(evt.data);
            if (updated?.tripId === tripId) {
              setLiveTelemetry(updated);
              setDataSourceState('LIVE_SSE');
              setSyncError(null);
            }
          } catch (_) {
            // ignore
          }
        });
      } catch (_) {
        // fallback poll below
      }
    }

    const pollTimer = setInterval(fetchRealTripData, 10000);
    return () => {
      clearInterval(pollTimer);
      if (eventSource) eventSource.close();
    };
  }, [tripId, fetchRealTripData]);

  useEffect(() => {
    if (hasEmergencyFocus) {
      setFocusCoords([focusLat, focusLon]);
    }
  }, [hasEmergencyFocus, focusLat, focusLon]);

  const originCoords = useMemo(() => {
    const oLat = liveTelemetry?.originLat ?? liveTelemetry?.originLatitude;
    const oLon = liveTelemetry?.originLon ?? liveTelemetry?.originLongitude;
    if (oLat != null && oLon != null) {
      return [Number(oLat), Number(oLon)];
    }
    return null;
  }, [liveTelemetry]);

  const destCoords = useMemo(() => {
    const dLat = liveTelemetry?.destinationLat ?? liveTelemetry?.destinationLatitude;
    const dLon = liveTelemetry?.destinationLon ?? liveTelemetry?.destinationLongitude;
    if (dLat != null && dLon != null) {
      return [Number(dLat), Number(dLon)];
    }
    return null;
  }, [liveTelemetry]);

  const postgisRoutePoints = useMemo(
    () => extractGeoJsonLineStringPoints(liveTelemetry?.routeWaypoints),
    [liveTelemetry?.routeWaypoints]
  );

  const activeRoadRoute = useMemo(() => {
    if (postgisRoutePoints.length >= 2) {
      return {
        points: postgisRoutePoints,
        distanceKm:
          liveTelemetry?.totalDistanceKm ?? measurePolylineDistanceKm(postgisRoutePoints),
        source: 'POSTGIS_ROUTE_VERSION'
      };
    }
    return {
      points: [], distanceKm: null,
      source: 'Chưa có hình học tuyến chính thức'
    };
  }, [postgisRoutePoints, liveTelemetry?.totalDistanceKm]);

  // Authentic recorded GPS coordinates from Backend TelemetryEvent / Container IoT (chronological ascending)
  const recordedTrail = useMemo(() => {
    return telemetryHistory
      .filter((t) => t.latitude != null && t.longitude != null)
      .map((t) => [Number(t.latitude), Number(t.longitude)]);
  }, [telemetryHistory]);

  const latestRecordedEvent =
    telemetryHistory.length > 0 ? telemetryHistory[telemetryHistory.length - 1] : null;

  const currentVehiclePos = useMemo(() => {
    if (liveTelemetry?.latitude != null && liveTelemetry?.longitude != null) {
      return [Number(liveTelemetry.latitude), Number(liveTelemetry.longitude)];
    }
    if (latestRecordedEvent?.latitude != null && latestRecordedEvent?.longitude != null) {
      return [Number(latestRecordedEvent.latitude), Number(latestRecordedEvent.longitude)];
    }
    if (hasEmergencyFocus) {
      return [focusLat, focusLon];
    }
    return null;
  }, [liveTelemetry, latestRecordedEvent, hasEmergencyFocus, focusLat, focusLon]);

  const pendingProposal = useMemo(
    () =>
      liveProposals.find(
        (p) => p.status === 'PENDING_DISPATCHER' || p.decision === 'PENDING'
      ) || null,
    [liveProposals]
  );

  const isCriticalDeviation =
    hasEmergencyFocus ||
    liveTelemetry?.deviationStatus === 'RED_DEVIATION' ||
    liveTelemetry?.deviationStatus === 'CRITICAL_200M' ||
    Number(liveTelemetry?.deviationMeters || 0) > 200;
  const isWarningDeviation =
    !isCriticalDeviation &&
    (liveTelemetry?.deviationStatus === 'YELLOW_WARNING' ||
      liveTelemetry?.deviationStatus === 'WARNING_50M');

  const arrivalInfo = useMemo(() => {
    const computed = evaluateDestinationArrival(currentVehiclePos, destCoords, {
      arrivalRadiusMeters: liveTelemetry?.arrivalRadiusMeters ?? 250,
      isDelivered:
        (liveTelemetry?.tripStatus || liveTrip?.status) === 'COMPLETED' ||
        liveTelemetry?.arrivalStatus === 'DELIVERED',
      progressPct: liveTelemetry?.progressPercent
    });
    const distMeters = liveTelemetry?.distanceToDestinationMeters ?? computed.distanceMeters;
    const arrived =
      typeof liveTelemetry?.arrivedAtDestination === 'boolean'
        ? liveTelemetry.arrivedAtDestination
        : computed.arrived;
    const status = liveTelemetry?.arrivalStatus || computed.status;
    return {
      ...computed,
      distanceMeters: distMeters,
      distanceKm: distMeters != null ? Number((distMeters / 1000).toFixed(2)) : computed.distanceKm,
      arrived,
      status,
      arrivedAt: liveTelemetry?.arrivedAt || liveTrip?.arrivedAt || null
    };
  }, [currentVehiclePos, destCoords, liveTelemetry, liveTrip]);


  const handleSendRealDeviceGps = () => {
    setActionMsg(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setActionMsg('Trình duyệt không hỗ trợ Geolocation API để đọc tọa độ thiết bị thực.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        const speedKmh =
          position.coords.speed != null && position.coords.speed >= 0
            ? Number((position.coords.speed * 3.6).toFixed(1))
            : 0;
        const heading =
          position.coords.heading != null && !Number.isNaN(position.coords.heading)
            ? Number(position.coords.heading.toFixed(1))
            : 0;
        try {
          await api.ingestTelemetry({
            tripId,
            vehicleId:
              liveTelemetry?.vehicleId ||
              liveTrip?.vehicleId ||
              'a0000000-0000-0000-0000-000000000001',
            timestamp: new Date(position.timestamp || Date.now()).toISOString(),
            latitude: lat,
            longitude: lon,
            speedKmh,
            headingDegrees: heading,
            rawPayload: JSON.stringify({
              source: 'BROWSER_GEOLOCATION_HARDWARE',
              accuracyMeters: position.coords.accuracy
            })
          });
          setActionMsg(
            `Đã gửi tọa độ GPS thực (${lat}, ${lon} • sai số ±${Math.round(position.coords.accuracy || 0)}m) lên Tracking Service!`
          );
          await fetchRealTripData();
        } catch (err) {
          setActionMsg(
            err?.message ||
              `Đã đọc GPS thực (${lat}, ${lon}) nhưng không gửi được tới Backend :8888.`
          );
        }
      },
      (geoErr) => {
        setActionMsg(
          `Không đọc được vị trí thiết bị thực (${geoErr?.message || 'Permission denied'}). Hãy cấp quyền Vị trí hoặc phát telemetry từ Thiết bị Buồng lái (/driver).`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleProposalDecision = async (decision) => {
    if (!pendingProposal?.id) return;
    try {
      await api.decideRerouteProposal(pendingProposal.id, decision, {
        decidedByUsername: 'dispatcher',
        note:
          decision === 'ACCEPTED'
            ? 'Dispatcher phê duyệt đổi tuyến tối ưu trên NOC'
            : 'Dispatcher từ chối đổi tuyến, giữ tuyến gốc'
      });
      setActionMsg(
        decision === 'ACCEPTED'
          ? 'Đã phê duyệt (ACCEPTED) lộ trình thay thế xuống Backend.'
          : 'Đã từ chối (REJECTED) đề xuất đổi tuyến — duy trì hành lang gốc.'
      );
      await fetchRealTripData();
    } catch (err) {
      setActionMsg(err?.message || 'Lỗi khi gửi quyết định đổi tuyến xuống Backend.');
    }
  };

  const calculateRoadReroute = async () => {
    setCalculatingReroute(true);
    try {
      const response = await api.calculateTripReroute(tripId);
      setActionMsg(response.message || 'Đã tính phương án từ GPS hiện tại.');
      await fetchRealTripData();
    } catch (error) { setActionMsg(error.message || 'Chưa tính được phương án đường thực.'); }
    finally { setCalculatingReroute(false); }
  };

  const liveSpeed =
    liveTelemetry?.speedKmh != null
      ? Number(liveTelemetry.speedKmh)
      : latestRecordedEvent?.speedKmh != null
        ? Number(latestRecordedEvent.speedKmh)
        : null;
  const bearingDeg =
    liveTelemetry?.bearingDegrees != null
      ? Number(liveTelemetry.bearingDegrees)
      : liveTelemetry?.headingDegrees != null
        ? Number(liveTelemetry.headingDegrees)
        : null;
  const deviationMeters =
    liveTelemetry?.deviationMeters != null ? Number(liveTelemetry.deviationMeters) : null;
  const supplyTempC = liveTelemetry?.supplyAirTempC ?? linkedContainer?.supplyAirTempC ?? null;
  const shockG = linkedContainer?.shockG ?? null;
  const containerCode = liveTelemetry?.containerCode || linkedContainer?.containerCode || null;
  const eSealDisplay = linkedContainer?.eSealNumber
    ? `${linkedContainer.eSealNumber} (${linkedContainer.eSealStatus || 'LOCKED'})`
    : null;
  const vehicleTitle = liveTelemetry?.vehicleCode
    ? `${liveTelemetry.vehicleCode} • ${liveTelemetry.licensePlate || 'Đang cập nhật'}`
    : liveTrip?.vehicleId
      ? `Xe ${String(liveTrip.vehicleId).slice(0, 8)}`
      : 'Chưa có dữ liệu xe từ DB';

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
          marginBottom: '18px'
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
              color:
                dataSourceState === 'OFFLINE_NO_DATA'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px'
            }}
          >
            <Radio size={14} />
            {dataSourceState === 'LIVE_SSE'
              ? 'LUỒNG DỮ LIỆU ĐỘI XE THỜI GIAN THỰC'
              : dataSourceState === 'LIVE_DB'
                ? 'DỮ LIỆU GIÁM SÁT TRỰC TUYẾN TỪ MÁY CHỦ'
                : 'CHẾ ĐỘ CHỜ KẾT NỐI — KHÔNG TỰ SINH GPS ẢO'}
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
            Giám Sát GPS Thời Gian Thực &amp; Cảnh Báo Lệch Tuyến
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
            Mã chuyến: <code>{liveTelemetry?.tripCode || liveTrip?.tripCode || tripId}</code> •{' '}
            <strong>{vehicleTitle}</strong> • Trạng thái:{' '}
            <strong>{liveTelemetry?.tripStatus || liveTrip?.status || 'CHỜ ĐỒNG BỘ'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchRealTripData}
            disabled={syncing}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            <RefreshCw size={15} />
            <span>{syncing ? 'Đang tải...' : 'Làm mới từ DB'}</span>
          </button>

          {(liveTrip?.status === 'SCHEDULED' || liveTelemetry?.tripStatus === 'SCHEDULED') &&
            <p>Đang chờ tài xế kiểm tra trước chuyến và xác nhận khởi hành trong khoang lái.</p>}


          <button
            type="button"
            onClick={handleSendRealDeviceGps}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            <MapPin size={15} color="#10b981" />
            <span>Gửi GPS Thiết Bị Thực</span>
          </button>

          <Link to={`/trips/${tripId}/carbon`} className="btn btn-secondary">
            <Leaf size={15} color="var(--accent-green)" />
            <span>Kiểm Toán Phát Thải</span>
          </Link>
        </div>
      </div>

      {/* Honest Telemetry Status Banner */}
      {(syncError || actionMsg) && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            border: `1px solid ${syncError ? 'rgba(245, 158, 11, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
            background: syncError ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: '0.83rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} color={syncError ? '#f59e0b' : '#10b981'} />
            <span>{actionMsg || syncError}</span>
          </div>
          {!currentVehiclePos && (
            <Link to="/driver" style={{ color: '#10b981', fontWeight: 700, textDecoration: 'underline' }}>
              Mở Terminal Tài xế (/driver) để phát Telemetry thực →
            </Link>
          )}
        </div>
      )}

      {/* Corridor Summary Strip from Backend / Route */}
      <div
        className="card"
        style={{
          padding: '13px 18px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}
      >
        <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>
          🚩 Hành lang:{' '}
          <span style={{ color: 'var(--accent-green)' }}>
            {liveTelemetry?.originName || 'Chưa có điểm đi'} ➔{' '}
            {liveTelemetry?.destinationName || 'Chưa có điểm đến'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>
            Tổng cự ly:{' '}
            <strong style={{ color: 'var(--accent-green)' }}>
              {liveTelemetry?.totalDistanceKm != null
                ? `${liveTelemetry.totalDistanceKm} km`
                : activeRoadRoute.distanceKm == null ? 'Chưa xác minh' : `${activeRoadRoute.distanceKm} km`}
            </strong>
          </span>
          <span>
            Đã đi:{' '}
            <strong>
              {liveTelemetry?.traveledDistanceKm != null
                ? `${liveTelemetry.traveledDistanceKm} km (${liveTelemetry.progressPercent || 0}%)`
                : 'Chưa có GPS'}
            </strong>
          </span>
          <span>
            ETA tham khảo theo vị trí/tốc độ:{' '}
            <strong>
              {liveTelemetry?.etaMinutes != null
                ? `Khoảng ${liveTelemetry.etaMinutes} phút`
                : 'Chờ tốc độ thực'}
            </strong>
          </span>
          <span>
            Mẫu GPS ghi nhận: <strong>{telemetryHistory.length}</strong>
          </span>
          <span>
            Tới điểm giao:{' '}
            <strong
              style={{
                color: arrivalInfo.arrived
                  ? 'var(--accent-green)'
                  : arrivalInfo.status === 'APPROACHING_DESTINATION'
                    ? 'var(--accent-amber)'
                    : 'var(--accent-blue)'
              }}
            >
              {arrivalInfo.arrived
                ? `✓ ĐÃ TỚI ĐÍCH (${arrivalInfo.distanceMeters ?? 0}m)`
                : arrivalInfo.distanceMeters != null
                  ? `Chưa tới (còn ${
                      arrivalInfo.distanceMeters >= 1000
                        ? `${arrivalInfo.distanceKm} km`
                        : `${arrivalInfo.distanceMeters} m`
                    })`
                  : 'Đang theo dõi'}
            </strong>
          </span>
          <span>
            Nguồn tuyến: <strong>{activeRoadRoute.source}</strong>
          </span>
        </div>
      </div>

      {/* Real Deviation / Reroute Proposal Alert */}
      <div className="card" style={{ marginBottom: 18 }}>
        <button type="button" className="btn btn-secondary" onClick={calculateRoadReroute} disabled={calculatingReroute || liveTrip?.status !== 'EN_ROUTE'}>
          <RefreshCw size={16} /> {calculatingReroute ? 'Đang tính tuyến đường…' : 'Tính đổi tuyến từ GPS hiện tại'}
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 10 }}>Dùng GPS hợp lệ trong 5 phút gần nhất. Ngưỡng lợi ích so với phần đường còn lại của tuyến đã chốt; không khẳng định mức tiết kiệm nhiên liệu thực đo.</p>
      </div>
      {(isCriticalDeviation || isWarningDeviation || pendingProposal) && (
        <div
          className="card"
          style={{
            border: `1.5px solid ${isCriticalDeviation ? 'var(--accent-red)' : 'var(--accent-amber)'}`,
            background: isCriticalDeviation
              ? 'rgba(239, 68, 68, 0.12)'
              : 'rgba(245, 158, 11, 0.12)',
            marginBottom: '18px',
            padding: '16px 18px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle
                size={24}
                color={isCriticalDeviation ? 'var(--accent-red)' : 'var(--accent-amber)'}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800 }}>
                  {incidentBannerTitle ||
                    `CẢNH BÁO HÀNH LANG: Độ lệch thực đo ${deviationMeters ?? 0}m (${liveTelemetry?.deviationStatus || 'INCIDENT'})`}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {pendingProposal
                    ? `Đề xuất đổi tuyến #${pendingProposal.id}: ${pendingProposal.reason || 'Tránh ùn tắc / lệch hành lang'}`
                    : 'Ghi nhận từ cảm biến định vị GPS vệ tinh thời gian thực.'}
                  {pendingProposal && !pendingProposal.routeGeometryAvailable && <p>Đây là ước tính lợi ích, chưa có hình học đường mới. Cần tính tuyến thực trước khi phê duyệt.</p>}
                </div>
              </div>
            </div>

            {pendingProposal && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleProposalDecision('REJECTED')}
                  className="btn btn-secondary"
                >
                  Từ Chối (REJECT)
                </button>
                <button
                  type="button"
                  onClick={() => handleProposalDecision('ACCEPTED')}
                  disabled={!pendingProposal.routeGeometryAvailable}
                  className="btn btn-primary"
                >
                  <CheckCircle2 size={15} />
                  <span>Phê Duyệt Đổi Tuyến (ACCEPT)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingProposal?.routeGeometryAvailable && <section className="card" style={{ marginBottom: 18 }}>
        <h3>Phương án đổi tuyến đang chờ duyệt</h3>
        <p>{(Number(pendingProposal.proposedDistanceMeters) / 1000).toFixed(2)} km · {Math.round(Number(pendingProposal.proposedDurationSeconds) / 60)} phút ước tính · giảm {(Number(pendingProposal.benefitRatio) * 100).toFixed(1)}% quãng đường so với phần tuyến được chiếu từ GPS.</p>
        <p>Đường nét đứt màu cam trên bản đồ là phương án chờ duyệt. Tuyến xanh vẫn là tuyến đang áp dụng.</p>
        <RouteEvidence candidate={pendingProposal} />
      </section>}

      {/* Main Layout: 3D Map + Authentic Backend Telemetry Panel */}
      <div className="split-map-grid">
        <div className="card" style={{ padding: '14px' }}>
          <MapView
            center={currentVehiclePos || originCoords || [10.8231, 106.74]}
            zoom={12}
            focusPosition={focusCoords}
            focusZoom={14}
            defaultLayer="google_hybrid"
            default3D={false}
            height={560}
            hudTitle={`${vehicleTitle} • Định vị vệ tinh trực tiếp (Real-time)`}
            hudSubtitle={
              currentVehiclePos
                ? `${liveTelemetry?.dataSource || 'LIVE_DB'} • Tốc độ ${liveSpeed ?? 0} km/h`
                : 'Chưa có tọa độ GPS thực từ TelemetryEvent — hiển thị điểm đầu/cuối hành lang'
            }
          >
            {originCoords && <OriginMarker
              position={originCoords}
              title={liveTelemetry?.originName}
              label={liveTelemetry?.originName}
            />}
            {destCoords && <DestinationMarker
              position={destCoords}
              title={liveTelemetry?.destinationName}
              label={liveTelemetry?.destinationName}
              showGeofence={true}
              geofenceRadiusMeters={arrivalInfo.arrivalRadiusMeters || 250}
              arrived={arrivalInfo.arrived}
            />}
            <RoutePolyline
              routingMetadataJson={liveTelemetry?.routingMetadataJson}
              positions={activeRoadRoute.points}
              color="#10b981"
              weight={5}
              showCorridorBuffer={true}
            />
            {recordedTrail.length >= 2 && (
              <RoutePolyline
                positions={recordedTrail}
                color="#0ea5e9"
                weight={4}
                dashArray="5, 6"
                showCorridorBuffer={false}
                autoFit={false}
              />
            )}
            {pendingProposal?.routeGeometryAvailable && <RoutePolyline
              routingMetadataJson={pendingProposal.routingMetadataJson}
              positions={extractGeoJsonLineStringPoints(pendingProposal.routeWaypoints)}
              color="#f59e0b" weight={5} dashArray="10, 7" showCorridorBuffer={false} autoFit={false}
            />}
            {currentVehiclePos && (
              <VehicleMarker
                position={currentVehiclePos}
                title={vehicleTitle}
                heading={bearingDeg ?? 0}
                speedKmh={liveSpeed ?? 0}
                status={isCriticalDeviation ? 'DEVIATION' : 'ON_ROUTE'}
                tempC={supplyTempC}
              />
            )}
            {isCriticalDeviation && currentVehiclePos && (
              <DeviationMarker
                position={currentVehiclePos}
                distanceMeters={deviationMeters || 250}
                severity="RED"
              />
            )}
          </MapView>
          {liveTelemetry?.routingMetadataJson && (
            <RouteEvidence candidate={{ routingMetadataJson: liveTelemetry.routingMetadataJson }} />
          )}
        </div>

        {/* Right Authentic Telemetry Panel */}
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
              <span>Thông Số Telemetry Thực Tế (DB)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phương tiện &amp; Biển số</span>
                <strong>{vehicleTitle}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tài xế phụ trách</span>
                <strong>{liveTelemetry?.driverName || 'Chưa gán trên DB'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vận tốc đo được</span>
                <strong style={{ color: 'var(--accent-blue)' }}>
                  {liveSpeed != null ? `${liveSpeed} km/h` : 'Chờ tín hiệu GPS'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hướng di chuyển (Bearing)</span>
                <strong>{bearingDeg != null ? `${bearingDeg}°` : '--'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Độ lệch khỏi tâm tuyến</span>
                <strong
                  style={{
                    color: isCriticalDeviation
                      ? 'var(--accent-red)'
                      : isWarningDeviation
                        ? 'var(--accent-amber)'
                        : 'var(--accent-green)'
                  }}
                >
                  {deviationMeters != null
                    ? `${deviationMeters}m (${liveTelemetry?.deviationStatus || 'ON_ROUTE'})`
                    : 'Chờ tính ST_Distance'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Container ISO 6346</span>
                <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Cpu size={13} /> {containerCode || 'Chưa gắn Container'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khóa Seal GPS Hải Quan</span>
                <strong style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} /> {eSealDisplay || 'Chưa đồng bộ'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gia tốc kế 3 trục (Shock)</span>
                <strong>{shockG != null ? `${shockG} G` : 'Chưa có cảm biến'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nhiệt độ chuỗi lạnh</span>
                <strong style={{ color: 'var(--accent-blue)' }}>
                  {supplyTempC != null ? `${supplyTempC}°C` : 'Chưa có cảm biến'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>CO2e cắt giảm (GLEC v3)</span>
                <strong style={{ color: 'var(--accent-green)' }}>
                  {liveTelemetry?.co2SavedKg != null ? `${liveTelemetry.co2SavedKg} kg` : '--'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trạng thái giao tới điểm đích</span>
                <strong
                  style={{
                    color: arrivalInfo.arrived
                      ? 'var(--accent-green)'
                      : arrivalInfo.status === 'APPROACHING_DESTINATION'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-blue)'
                  }}
                >
                  {arrivalInfo.arrived
                    ? `ĐÃ TỚI ĐÍCH (${arrivalInfo.distanceMeters ?? 0}m)`
                    : arrivalInfo.distanceMeters != null
                      ? `Chưa tới • Còn ${
                          arrivalInfo.distanceMeters >= 1000
                            ? `${arrivalInfo.distanceKm} km`
                            : `${arrivalInfo.distanceMeters} m`
                        }`
                      : arrivalInfo.status}
                  {arrivalInfo.arrivedAt
                    ? ` • ${new Date(arrivalInfo.arrivedAt).toLocaleTimeString('vi-VN')}`
                    : ''}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tọa độ GPS hiện tại</span>
                <code style={{ color: 'var(--text-main)' }}>
                  {currentVehiclePos
                    ? `${currentVehiclePos[0].toFixed(4)}, ${currentVehiclePos[1].toFixed(4)}`
                    : 'Chưa nhận GPS thực'}
                </code>
              </div>
            </div>

            {currentVehiclePos && (
              <button
                type="button"
                onClick={() => setFocusCoords([...currentVehiclePos])}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '14px' }}
              >
                <Compass size={15} />
                <span>Đưa Camera 3D Bám Theo Xe</span>
              </button>
            )}
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
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, display: 'grid', gap: 9 }}>
              <div style={{ padding: '9px 11px', borderRadius: 10, background: 'var(--bg-card-hover)', borderLeft: '3px solid var(--accent-green)' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>Vùng an toàn (&lt; 50m)</strong>
                Phương tiện bám sát đúng tuyến hành lang đã phê duyệt.
              </div>
              <div style={{ padding: '9px 11px', borderRadius: 10, background: 'var(--bg-card-hover)', borderLeft: '3px solid var(--accent-amber)' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>Cảnh báo vàng (50m – 200m)</strong>
                Gửi nhắc nhở Cabin OS cho tài xế.
              </div>
              <div style={{ padding: '9px 11px', borderRadius: 10, background: 'var(--bg-card-hover)', borderLeft: '3px solid var(--accent-red)' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>Báo động đỏ (&gt; 200m)</strong>
                Sau 3 điểm liên tiếp vượt ngưỡng, hệ thống gửi đề xuất đổi tuyến chờ Điều phối viên phê duyệt.
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Cập nhật lần cuối: {liveTelemetry?.lastTelemetryAt ? new Date(liveTelemetry.lastTelemetryAt).toLocaleTimeString('vi-VN') : 'Chưa có'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
