import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Compass, MapPin, Radio, RefreshCw, Truck } from 'lucide-react';
import MapView from './MapView';
import RoutePolyline from './RoutePolyline';
import VehicleMarker from './VehicleMarker';
import OriginMarker from './OriginMarker';
import DestinationMarker from './DestinationMarker';
import { api, gatewayUrl } from '../../services/api';
import { isGpsStale, reconcileFleet } from './fleetTelemetry';
import './fleet-map.css';

const timeLabel = (value) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : 'Chưa có thời điểm GPS';
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function RealTimeFleetMap3D({
  filterCustomerId = null, height = 480, title = 'Giám sát vị trí container và tuyến vận chuyển'
}) {
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);
  const [following, setFollowing] = useState(false);
  const [scrollSelection, setScrollSelection] = useState(null);
  const [now, setNow] = useState(Date.now);
  const refreshRef = useRef(() => {});
  const listRef = useRef(null);
  const cardRefs = useRef(new Map());
  const initiallyFocused = useRef(false);

  useEffect(() => {
    let active = true, inFlight = false, revision = 0;
    const controller = new AbortController();
    setFleetVehicles([]);
    setSelectedKey(null);
    setBackendConnected(false);
    setFollowing(false);
    setFocusCoords(null);
    setLastSyncedTime(null);
    initiallyFocused.current = false;
    const receive = (list, partial = false) => {
      setFleetVehicles((previous) => reconcileFleet(previous, list, { partial, customerId: filterCustomerId }));
      setBackendConnected(true);
      setLastSyncedTime(new Date().toLocaleTimeString('vi-VN'));
      setNow(Date.now());
    };
    const refresh = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      setSyncing(true);
      const startedRevision = revision;
      try {
        const res = await api.getLiveFleetTelemetry(filterCustomerId ? { customerId: filterCustomerId } : {}, { signal: controller.signal });
        const list = res?.result ?? res;
        if (!Array.isArray(list)) throw new Error('Invalid fleet snapshot');
        // An SSE update received during this request takes precedence over the older HTTP snapshot.
        if (active && startedRevision === revision) receive(list);
      } catch {
        if (active && startedRevision === revision) setBackendConnected(false);
      } finally {
        inFlight = false;
        if (active) setSyncing(false);
      }
    };
    refreshRef.current = refresh;
    refresh();
    const poll = setInterval(refresh, 10000);
    const clock = setInterval(() => setNow(Date.now()), 15000);
    let es;
    if (window.EventSource) {
      const params = new URLSearchParams();
      if (filterCustomerId) params.set('customerId', filterCustomerId);
      try {
        const token = window.localStorage.getItem('ccadro_token') || window.localStorage.getItem('ccadro_access_token_v1');
        if (token) params.set('token', token);
        es = new window.EventSource(`${gatewayUrl('/api/v1/tracking/stream')}${params.size ? `?${params}` : ''}`);
        es.addEventListener('fleet-snapshot', (event) => {
          try {
            const list = JSON.parse(event.data);
            if (active && Array.isArray(list)) { revision++; receive(list); }
          } catch { /* Keep the last valid snapshot. */ }
        });
        es.addEventListener('fleet-telemetry-update', (event) => {
          try {
            const item = JSON.parse(event.data);
            if (active && item && typeof item === 'object') { revision++; receive([item], true); }
          } catch { /* Keep the last valid coordinates. */ }
        });
        es.onerror = () => { if (active) setBackendConnected(false); };
      } catch { /* Polling remains available. */ }
    }
    return () => {
      active = false;
      controller.abort();
      clearInterval(poll); clearInterval(clock); es?.close();
    };
  }, [filterCustomerId]);

  const selected = useMemo(() => fleetVehicles.find((item) => item.key === selectedKey) || fleetVehicles[0] || null,
    [fleetVehicles, selectedKey]);
  const latitude = selected?.currentPos?.[0], longitude = selected?.currentPos?.[1];
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    if (following || !initiallyFocused.current) {
      setFocusCoords([latitude, longitude]);
      initiallyFocused.current = true;
    }
  }, [latitude, longitude, following]);
  // If an authoritative snapshot removes the selected trip, stop following it.
  useEffect(() => {
    if (selectedKey && !fleetVehicles.some((item) => item.key === selectedKey)) {
      setFollowing(false); setSelectedKey(null); setFocusCoords(null);
    }
  }, [fleetVehicles, selectedKey]);

  const selectVehicle = useCallback((vehicle, fromMarker = false) => {
    setSelectedKey(vehicle.key);
    setFollowing(false);
    setFocusCoords(fromMarker ? null : vehicle.currentPos);
    if (fromMarker) setScrollSelection({ key: vehicle.key });
  }, []);
  useLayoutEffect(() => {
    if (!scrollSelection) return;
    const list = listRef.current, card = cardRefs.current.get(scrollSelection.key);
    if (!list || !card) return;
    card.querySelector('button')?.focus({ preventScroll: true });
    list.scrollTo?.({
      top: Math.max(0, list.scrollTop + card.getBoundingClientRect().top - list.getBoundingClientRect().top - 8),
      behavior: reducedMotion() ? 'auto' : 'smooth'
    });
  }, [scrollSelection]);
  const locatedCount = fleetVehicles.filter((item) => item.currentPos).length;
  const route = selected?.waypoints || [];
  const stale = selected && isGpsStale(selected, now);

  return <section className="card fleet-map" aria-label="Bản đồ container">
    <header className="fleet-map-heading">
      <div><div className="fleet-map-status"><Radio size={14} /> GIÁM SÁT GPS
        <span className={`badge ${backendConnected ? 'badge-green' : 'badge-amber'}`}>
          {backendConnected ? `Đã đồng bộ${lastSyncedTime ? ` · ${lastSyncedTime}` : ''}` : 'Mất kết nối · chờ đồng bộ'}
        </span></div><h3>{title}</h3></div>
      <div className="fleet-map-actions">
        <button type="button" className="btn btn-secondary" disabled={syncing} onClick={() => refreshRef.current()}>
          <RefreshCw size={15} />{syncing ? 'Đang đồng bộ GPS…' : 'Làm mới GPS'}</button>
        <button type="button" className="btn btn-primary" disabled={!selected?.currentPos} aria-pressed={following}
          onClick={() => { setFollowing((value) => !value); setFocusCoords(selected.currentPos && [...selected.currentPos]); }}>
          <Compass size={15} />{following ? 'Dừng bám theo' : `Bám theo ${selected?.containerCode || selected?.vehicleCode || 'container'}`}</button>
      </div>
    </header>
    {!backendConnected && fleetVehicles.length > 0 && <p className="fleet-map-notice" role="status">Đang hiển thị vị trí ghi nhận lần cuối; chưa xác nhận vị trí hiện tại.</p>}
    <div className="split-map-grid fleet-map-workspace" style={{ '--fleet-map-height': typeof height === 'number' ? `${height}px` : height }}>
      <div className="fleet-map-canvas">
        <MapView center={selected?.currentPos || route[0] || [10.8231, 106.74]} zoom={12} height={height}
          focusPosition={focusCoords} focusZoom={14} defaultLayer="google_hybrid" default3D={false}
          hudTitle={selected ? `${selected.containerCode || selected.vehicleCode} · ${selected.plate}` : 'Chưa có container để định vị'}
          hudSubtitle={selected ? `${stale ? 'GPS cũ / chưa rõ thời điểm' : 'GPS ghi nhận'} · ${timeLabel(selected.lastTelemetryAt)}` : 'Chờ tọa độ từ thiết bị GPS'}>
          {route.length >= 2 && <OriginMarker position={route[0]} title={selected.originName} />}
          {route.length >= 2 && <DestinationMarker position={route[route.length - 1]} title={selected.destinationName} />}
          <RoutePolyline
            positions={route}
            routingMetadataJson={selected?.routingMetadataJson}
            color={selected?.color}
            weight={5}
            autoFit={false}
          />
          {fleetVehicles.filter((item) => item.currentPos).map((vehicle) => <VehicleMarker
            key={vehicle.key} position={vehicle.currentPos} vehicleCode={vehicle.containerCode || vehicle.vehicleCode}
            title={`${vehicle.containerCode || vehicle.vehicleCode} · ${vehicle.plate}`} heading={vehicle.heading}
            speedKmh={vehicle.liveSpeed} tempC={vehicle.tempC} selected={vehicle.key === selected?.key}
            showLabel={vehicle.key === selected?.key}
            status={vehicle.deviationStatus === 'RED_DEVIATION' ? 'DEVIATION' : !backendConnected || isGpsStale(vehicle, now) ? 'WARNING' : 'ON_ROUTE'}
            onClick={() => selectVehicle(vehicle, true)} />)}
        </MapView>
        <p className="fleet-map-caption"><MapPin size={14} />{locatedCount}/{fleetVehicles.length} có tọa độ GPS
          {selected && route.length < 2 && ' · Chưa có hình học tuyến đã chốt'}
          {selected && route.length >= 2 && ' · Tuyến đã chốt; vị trí GPS được giữ nguyên kể cả khi lệch tuyến'}</p>
      </div>
      <aside className="fleet-map-list-panel" aria-label="Danh sách container">
        <h4>Container / phương tiện ({fleetVehicles.length})</h4>
        <div className="fleet-map-list" ref={listRef}>
          {!fleetVehicles.length && <p className="fleet-map-empty" role="status">{syncing ? 'Đang tải dữ liệu GPS…' : 'Chưa có dữ liệu container. Vị trí sẽ xuất hiện khi thiết bị gửi GPS hợp lệ.'}</p>}
          {fleetVehicles.map((vehicle) => {
            const active = vehicle.key === selected?.key;
            const old = !backendConnected || isGpsStale(vehicle, now);
            return <article key={vehicle.key} ref={(node) => { if (node) cardRefs.current.set(vehicle.key, node); else cardRefs.current.delete(vehicle.key); }}
              className={`fleet-map-item${active ? ' is-selected' : ''}${vehicle.deviationStatus === 'RED_DEVIATION' ? ' is-deviating' : ''}`}>
              <button type="button" className="fleet-map-select" aria-expanded={active}
                aria-controls={`fleet-detail-${encodeURIComponent(vehicle.key)}`} onClick={() => selectVehicle(vehicle)}>
                <span className="fleet-map-item-heading"><Truck size={17} /><strong>{vehicle.containerCode || vehicle.vehicleCode}</strong>
                  <span>{vehicle.liveSpeed == null ? 'Chưa rõ tốc độ' : `${vehicle.liveSpeed} km/h`}</span></span>
                <span className="fleet-map-plate">{vehicle.plate}</span>
                <span>{vehicle.originName} → {vehicle.destinationName}</span>
                <span className="fleet-map-signal">{!vehicle.currentPos ? 'Chưa có tọa độ GPS' : old ? 'GPS cũ / chưa rõ thời điểm' : 'Có vị trí GPS'} · {timeLabel(vehicle.lastTelemetryAt)}</span>
                {vehicle.progressPercent != null && <span className="fleet-map-progress" role="progressbar" aria-label={`Tiến độ ${vehicle.containerCode || vehicle.vehicleCode}`} aria-valuenow={vehicle.progressPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${vehicle.progressPercent}%` }} /></span>}
                <span className="fleet-map-item-footer"><span>Tiến độ: {vehicle.progressPercent == null ? 'Chưa có dữ liệu' : `${vehicle.progressPercent}%`}</span>
                  <span>ETA: {vehicle.etaMins == null ? 'Chưa có dữ liệu' : vehicle.etaMins === 0 ? 'Đã tới đích' : `${vehicle.etaMins} phút`}</span></span>
              </button>
              {active && <div className="fleet-map-details" id={`fleet-detail-${encodeURIComponent(vehicle.key)}`} aria-label={`Chi tiết ${vehicle.containerCode || vehicle.vehicleCode}`}>
                <dl><div><dt>Tài xế</dt><dd>{vehicle.driverName || 'Chưa có tài xế'}</dd></div>
                  <div><dt>Vận đơn</dt><dd>{vehicle.shipmentCode || 'Chưa có vận đơn'}</dd></div>
                  <div><dt>Tọa độ GPS</dt><dd>{vehicle.currentPos ? vehicle.currentPos.map((n) => n.toFixed(6)).join(', ') : 'Chưa có tọa độ GPS'}</dd></div>
                  <div><dt>Nhiệt độ</dt><dd>{vehicle.tempC == null ? 'Chưa có cảm biến' : `${vehicle.tempC}°C`}</dd></div>
                  <div><dt>Nguồn vị trí</dt><dd>{vehicle.dataSource === 'CONTAINER_IOT_DB' ? 'Thiết bị container' : vehicle.dataSource === 'LIVE_TELEMETRY_DB' ? 'GPS chuyến xe' : 'Chưa xác nhận nguồn GPS'}</dd></div>
                  <div><dt>Khoảng cách còn lại</dt><dd>{vehicle.remainingKm == null ? 'Chưa có dữ liệu' : `${vehicle.remainingKm} km`}</dd></div></dl>
                {old && <p className="fleet-map-notice">Vị trí cuối cùng đã ghi nhận; cần GPS mới để xác nhận hiện tại.</p>}
                {vehicle.containerCode && <a className="fleet-map-profile" href={`/containers?container=${encodeURIComponent(vehicle.containerCode)}`}>Mở hồ sơ container →</a>}
              </div>}
            </article>;
          })}
        </div>
      </aside>
    </div>
  </section>;
}
