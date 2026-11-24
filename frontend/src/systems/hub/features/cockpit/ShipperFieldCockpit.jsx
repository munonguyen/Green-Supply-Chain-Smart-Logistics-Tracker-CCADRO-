import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Banknote,
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  PhoneCall,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  Truck,
  Undo2,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import MapView from '../../../../shared/map/MapView';
import { formatVnd } from '../../../../utils/formatters';
import { parseTrackingTimeline } from '../../shared/hubShipperSeedData';
import ShipperMultiStopMapLayer from './ShipperMultiStopMapLayer';
import './shipper-cockpit.css';

const EARTH_RADIUS_KM = 6371.0;

function haversineKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((v) => Number.isFinite(Number(v)))) return 0;
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ON_HOLD_REASONS = [
  'Kho / Người nhận tạm đóng cửa nghỉ ca — hẹn giao lại khung giờ chiều',
  'Không liên lạc được người nhận (đã gọi tối thiểu 3 cuộc theo quy định)',
  'Thủ kho nhà máy đề nghị dời giờ tiếp nhận sang ca SLA kế tiếp',
  'Cổng bảo vệ KCN yêu cầu bổ sung phiếu đăng ký xe vào cổng trước khi dỡ hàng'
];

const RTS_REASONS = [
  'Khách từ chối nhận hàng (đổi ý / không đặt)',
  'Hàng hóa không đúng chủng loại / thông số kỹ thuật yêu cầu',
  'Đã vượt quá 3 lần phát không thành công (Hệ thống tự động chuyển hoàn Bưu cục)',
  'Địa chỉ nhận hàng sai lệch / khu vực cấm tải trọng xe'
];

export default function ShipperFieldCockpit({
  activeHub,
  activeShipper,
  items = [],
  isHubShipper = false,
  canAct = true,
  isDark = false,
  onChangeShiftStatus,
  onBatchPickupScan,
  onScanSingleCode,
  onStartItemDelivery,
  onCheckInStopArrival,
  onOpenPhotoPod,
  onReportNdrException,
  onRetryNdrDelivery,
  onLogCall,
  onScanHubReturn,
  onCheckInShift,
  onEndShift
}) {
  const [scanCode, setScanCode] = useState('');
  const [selectedStopCode, setSelectedStopCode] = useState('');
  const [showNdr, setShowNdr] = useState(false);
  const [ndrMode, setNdrMode] = useState('ON_HOLD'); // 'ON_HOLD' (hẹn giao lại) | 'RTS' (hoàn hàng Hub)
  const [ndrReason, setNdrReason] = useState(ON_HOLD_REASONS[0]);
  const [contactConfirmed, setContactConfirmed] = useState(true);
  const [roadRoutePoints, setRoadRoutePoints] = useState([]);
  const [osrmMeta, setOsrmMeta] = useState(null);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);

  const activeItems = useMemo(() => items.filter((i) => !i.isDeleted), [items]);

  const deliveredCount = activeItems.filter((i) => i.dispatchStatus === 'DELIVERED_POD').length;
  const inTransitItems = activeItems.filter((i) => i.dispatchStatus === 'OUT_FOR_DELIVERY');
  const readyPickupItems = activeItems.filter((i) => i.dispatchStatus === 'ASSIGNED_TO_SHIPPER');
  const ndrItems = activeItems.filter((i) => i.dispatchStatus === 'NDR_RESCHEDULED');
  const returnPendingItems = activeItems.filter((i) => i.dispatchStatus === 'RETURN_PENDING');
  const returnedToHubItems = activeItems.filter((i) => i.dispatchStatus === 'RETURNED_TO_HUB');

  // Items that are on-hold or return-pending but not yet scanned into hub
  const unreturnedItems = useMemo(
    () =>
      activeItems.filter(
        (i) =>
          (i.dispatchStatus === 'NDR_RESCHEDULED' || i.dispatchStatus === 'RETURN_PENDING') &&
          !i.returnedToHubAt
      ),
    [activeItems]
  );

  const progressPct = activeItems.length
    ? Math.round((deliveredCount / activeItems.length) * 100)
    : 0;

  // Priority next stop: explicit click -> OUT_FOR_DELIVERY -> ASSIGNED_TO_SHIPPER -> NDR_RESCHEDULED -> first item
  const focusedStop = useMemo(() => {
    if (selectedStopCode) {
      const found = activeItems.find((i) => i.itemCode === selectedStopCode);
      if (found) return found;
    }
    return (
      activeItems.find((i) => i.dispatchStatus === 'OUT_FOR_DELIVERY') ||
      activeItems.find((i) => i.dispatchStatus === 'ASSIGNED_TO_SHIPPER') ||
      activeItems.find((i) => i.dispatchStatus === 'NDR_RESCHEDULED') ||
      activeItems.find((i) => i.dispatchStatus === 'RETURN_PENDING') ||
      activeItems[0] ||
      null
    );
  }, [activeItems, selectedStopCode]);

  const hubCoords = useMemo(
    () => [Number(activeHub?.centerLat || 21.1145), Number(activeHub?.centerLng || 105.9585)],
    [activeHub?.centerLat, activeHub?.centerLng]
  );

  const shipperCoords = useMemo(() => {
    const lat = Number(activeShipper?.currentLat ?? activeShipper?.assignedLat ?? hubCoords[0]);
    const lng = Number(activeShipper?.currentLng ?? activeShipper?.assignedLng ?? hubCoords[1]);
    return [lat, lng];
  }, [activeShipper?.currentLat, activeShipper?.currentLng, activeShipper?.assignedLat, activeShipper?.assignedLng, hubCoords]);

  // Parse SLA urgency from slaWindow text — returns 'red' | 'orange' | 'green'
  const getSlaUrgency = (slaText) => {
    if (!slaText) return 'green';
    const match = slaText.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 'green';
    const now = new Date();
    const target = new Date();
    target.setHours(Number(match[1]), Number(match[2]), 0, 0);
    const diffMin = (target - now) / 60000;
    if (diffMin < 0) return 'red';
    if (diffMin < 30) return 'red';
    if (diffMin < 60) return 'orange';
    return 'green';
  };

  const slaUrgencyColor = { red: '#dc2626', orange: '#d97706', green: '#059669' };

  // Order stops sequentially and calculate accurate cumulative/leg road distances (Hub -> #1 -> #2 -> #3)
  const orderedStops = useMemo(() => {
    let prevPt = hubCoords;
    return activeItems.map((item, idx) => {
      const lat = Number(item.deliveryLat ?? hubCoords[0] + (idx + 1) * 0.003);
      const lng = Number(item.deliveryLng ?? hubCoords[1] + (idx + 1) * 0.003);
      const pos = [lat, lng];
      const legDistanceKm = Math.max(
        0.2,
        Math.round(haversineKm(prevPt[0], prevPt[1], pos[0], pos[1]) * 1.28 * 100) / 100
      );
      prevPt = pos;
      return {
        item,
        index: idx + 1,
        position: pos,
        legDistanceKm
      };
    });
  }, [activeItems, hubCoords]);

  // Fetch real OSRM street road geometry across Hub -> Stop #1 -> Stop #2 -> Stop #3
  useEffect(() => {
    const waypoints = [hubCoords, ...orderedStops.map((s) => s.position)];
    if (waypoints.length < 2) {
      setRoadRoutePoints([]);
      setOsrmMeta(null);
      return undefined;
    }
    const fallbackLine = waypoints;
    setRoadRoutePoints(fallbackLine);

    if (typeof fetch !== 'function') return undefined;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 3200) : null;

    const coordParam = waypoints.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordParam}?overview=full&geometries=geojson`,
      controller ? { signal: controller.signal } : undefined
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const coords = json?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          setRoadRoutePoints(coords.map(([lon, lat]) => [lat, lon]));
          setOsrmMeta({
            totalKm: Number(((json.routes[0].distance || 0) / 1000).toFixed(2)),
            totalMin: Math.max(2, Math.round((json.routes[0].duration || 0) / 60))
          });
        }
      })
      .catch(() => {
        // Keep clean multi-stop waypoint line when offline or in test environment
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
      });

    return () => {
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [hubCoords, orderedStops]);

  const focusedStopEntry = useMemo(
    () => orderedStops.find((s) => s.item.itemCode === focusedStop?.itemCode) || null,
    [orderedStops, focusedStop?.itemCode]
  );

  // Live navigation leg from Shipper's current GPS (or Hub if still at Hub) -> Focused Stop
  const liveLegMetrics = useMemo(() => {
    if (!focusedStopEntry) return { points: [], distanceKm: 0, etaMin: 0 };
    const originPt =
      focusedStopEntry.item.dispatchStatus === 'ASSIGNED_TO_SHIPPER' ? hubCoords : shipperCoords;
    const distKm = Math.round(
      haversineKm(originPt[0], originPt[1], focusedStopEntry.position[0], focusedStopEntry.position[1]) *
        1.25 *
        100
    ) / 100;
    const etaMin = distKm < 0.08 ? 1 : Math.max(2, Math.round((distKm / 26) * 60));
    const activeLeg =
      focusedStopEntry.item.dispatchStatus === 'OUT_FOR_DELIVERY'
        ? [shipperCoords, focusedStopEntry.position]
        : focusedStopEntry.item.dispatchStatus === 'ASSIGNED_TO_SHIPPER'
          ? [hubCoords, focusedStopEntry.position]
          : [];
    return { points: activeLeg, distanceKm: distKm, etaMin };
  }, [focusedStopEntry, hubCoords, shipperCoords]);

  // Effective operational shift status: if carrying OUT_FOR_DELIVERY cargo, shipper MUST be ON_DELIVERY
  const hasActiveVehicleCargo = inTransitItems.length > 0;
  const effectiveShiftStatus = hasActiveVehicleCargo
    ? 'ON_DELIVERY'
    : activeShipper?.shiftStatus || 'AVAILABLE';

  const hasArrivedAtFocusedStop = useMemo(() => {
    if (!focusedStop) return false;
    if (focusedStop.arrivedAtStop) return true;
    const tl = parseTrackingTimeline(focusedStop);
    return tl.some((step) => step.status === 'ARRIVED_AT_STOP');
  }, [focusedStop]);

  // SPX 3-Call Rule: Required >= 3 calls before selecting "Uncontactable recipient"
  const currentCallAttempts = Number(focusedStop?.callAttemptsCount || 0);
  const isUncontactableReason = ndrReason.includes('Không liên lạc được');
  const is3CallRuleViolated = isUncontactableReason && currentCallAttempts < 3;

  // 3-Gate Shift Checkout Validation
  const gate1Pass = inTransitItems.length === 0;
  const gate2Pass = unreturnedItems.length === 0;
  const codHoldingCash = Number(activeShipper?.codHoldingVnd || 0);
  const gate3Pass = codHoldingCash === 0;
  const all3GatesPass = gate1Pass && gate2Pass && gate3Pass;

  const handleScanSubmit = (e) => {
    e.preventDefault();
    const cleaned = scanCode.trim().toUpperCase();
    if (!cleaned) return;
    onScanSingleCode?.(cleaned);
    setScanCode('');
  };

  const submitNdr = () => {
    if (!focusedStop || !ndrReason || !contactConfirmed) return;
    if (is3CallRuleViolated) return;
    onReportNdrException?.(focusedStop, ndrReason, ndrMode);
    setShowNdr(false);
    setSelectedStopCode(focusedStop.itemCode);
  };

  if (!activeItems.length) return null;

  const totalRouteKm =
    osrmMeta?.totalKm ||
    Math.round(orderedStops.reduce((sum, s) => sum + s.legDistanceKm, 0) * 100) / 100;

  return (
    <div
      className={`spx-cockpit${isDark ? ' is-dark' : ''}`}
      aria-label="Buồng lái lộ trình & tác nghiệp Tài xế giao hàng"
    >
      {/* 1. Top Shift Status + Operational Guard + Barcode Scanner */}
      <div className="spx-shift-bar">
        <div className="spx-shift-left">
          {activeShipper && (
            <div className="spx-shift-toggle-group" role="group" aria-label="Trạng thái hoạt động ca trực">
              {[
                {
                  id: 'AVAILABLE',
                  label: 'Đang nhận tuyến',
                  cls: 'is-online',
                  locked: hasActiveVehicleCargo,
                  lockHint: 'Đang có kiện đi giao trên xe — trạng thái cố định ở Đang đi giao'
                },
                {
                  id: 'ON_DELIVERY',
                  label: `Đang đi giao${hasActiveVehicleCargo ? ` (${inTransitItems.length})` : ''}`,
                  cls: 'is-delivering',
                  locked: false,
                  lockHint: ''
                },
                {
                  id: 'OFF_SHIFT',
                  label: 'Tạm nghỉ',
                  cls: 'is-offline',
                  locked: hasActiveVehicleCargo,
                  lockHint: 'Không thể nghỉ ca khi còn kiện Đang đi giao trên xe'
                }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={!canAct || st.locked}
                  title={st.locked ? st.lockHint : st.label}
                  className={`spx-shift-pill ${st.cls}`}
                  aria-pressed={effectiveShiftStatus === st.id}
                  onClick={() => onChangeShiftStatus?.(activeShipper.shipperCode, st.id)}
                >
                  ● {st.label}
                </button>
              ))}
            </div>
          )}

          {/* SPX Hub Check-in & 3-Gate Checkout Actions */}
          {canAct && activeShipper && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {(!activeShipper.shiftCheckedInAt || effectiveShiftStatus === 'OFF_SHIFT') && (
                <button
                  type="button"
                  data-testid="btn-checkin-shift"
                  onClick={() => onCheckInShift?.(activeShipper.shipperCode)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 11px',
                    borderRadius: 999,
                    border: '1px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    fontSize: '0.73rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title="Điểm danh nhận ca làm việc tại Bưu cục đầu ngày"
                >
                  <LogIn size={13} /> Điểm danh nhận ca Bưu cục
                </button>
              )}

              <button
                type="button"
                data-testid="btn-open-end-shift"
                onClick={() => setShowEndShiftModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 11px',
                  borderRadius: 999,
                  border: all3GatesPass ? '1.5px solid #059669' : '1px solid #cbd5e1',
                  background: all3GatesPass ? 'rgba(5, 150, 105, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                  color: all3GatesPass ? '#059669' : '#475569',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Khóa kiểm tra 3 cổng: 0 đơn trên xe, 0 đơn On-Hold/RTS chưa trả kho, 0đ COD tiền mặt"
              >
                <LogOut size={13} /> Kết ca Bưu cục (3 Cổng)
              </button>
            </div>
          )}

          <div className="spx-progress-inline">
            <div style={{ fontSize: '0.76rem', fontWeight: 800 }}>
              Hoàn tất: <span style={{ color: '#059669' }}>{deliveredCount}/{activeItems.length}</span> điểm ({progressPct}%)
              {ndrItems.length > 0 && (
                <span style={{ color: '#ea580c', marginLeft: 6 }}>• {ndrItems.length} On-Hold</span>
              )}
              {returnPendingItems.length > 0 && (
                <span style={{ color: '#dc2626', marginLeft: 6 }}>• {returnPendingItems.length} Chờ hoàn</span>
              )}
              {returnedToHubItems.length > 0 && (
                <span style={{ color: '#475569', marginLeft: 6 }}>• {returnedToHubItems.length} Đã trả kho</span>
              )}
            </div>
            <div className="spx-progress-track">
              <div className="spx-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706'
            }}
          >
            <Award size={13} /> Đối tác Kim Cương · SLA {activeShipper?.onTimeRatePct ?? 99.1}%
          </span>
        </div>

        {/* SPX Barcode Scan & Hub Pickup */}
        {canAct && (
          <div className="spx-scan-bar">
            <form onSubmit={handleScanSubmit} className="spx-scan-input-wrap">
              <QrCode size={15} color="#059669" />
              <input
                aria-label="Quét mã vạch kiện hàng"
                placeholder="Quét mã PKG-DB-0002..."
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
              />
              <button
                type="submit"
                style={{
                  border: 0,
                  borderRadius: 6,
                  padding: '4px 8px',
                  background: '#059669',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Quét
              </button>
            </form>

            {readyPickupItems.length > 0 && (
              <button
                type="button"
                data-testid="btn-batch-pickup-scan"
                onClick={() => onBatchPickupScan?.(readyPickupItems)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  borderRadius: 10,
                  border: 0,
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Zap size={14} />{' '}
                {hasActiveVehicleCargo
                  ? `Quét nhận đơn ghép tại Hub (${readyPickupItems.length} kiện)`
                  : `Quét nhận xuất trạm (${readyPickupItems.length} kiện)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Split View: Left = REAL Leaflet Street/Satellite Map | Right = Strict Stop Execution Card */}
      <div className="spx-split-grid">
        <div className="spx-map-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.69rem', fontWeight: 800, color: '#059669', letterSpacing: '0.05em' }}>
                BẢN ĐỒ LỘ TRÌNH ĐƯỜNG BỘ &amp; ĐIỀU HƯỚNG XE GIAO HÀNG
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                {isHubShipper
                  ? `Lộ trình thực tế xe ${activeShipper?.vehiclePlate || '99C-182.68'} • ${activeShipper?.fullName || 'Shipper'}`
                  : `Bản đồ điều phối điểm giao từ ${activeHub?.shortName || activeHub?.hubCode}`}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>
              Tổng lộ trình: {totalRouteKm} km • {orderedStops.length} điểm dừng
            </span>
          </div>

          <div
            className="spx-real-map-shell"
            role="region"
            aria-label="Sơ đồ tuyến giao hàng nhiều điểm dừng"
            data-testid="shipper-real-route-map"
          >
            <MapView
              center={focusedStopEntry?.position || shipperCoords}
              zoom={14}
              focusPosition={selectedStopCode && focusedStopEntry ? focusedStopEntry.position : null}
              focusZoom={15}
              defaultLayer={isDark ? 'dark_radar' : 'google_street'}
              default3D={false}
              height={365}
              hudTitle={`${activeHub?.hubCode || 'HUB'} → Chặng #${focusedStopEntry?.index || 1}: ${focusedStop?.itemCode || ''}`}
              hudSubtitle={
                focusedStop?.dispatchStatus === 'DELIVERED_POD'
                  ? `✓ Đã hoàn tất giao & lưu POD tại ${focusedStop.consigneeName}`
                  : focusedStop?.dispatchStatus === 'RETURNED_TO_HUB'
                    ? `✓ Đã quét trả kho Bưu cục bàn giao Thủ kho`
                    : focusedStop?.dispatchStatus === 'RETURN_PENDING'
                      ? `⚠️ Hàng chờ hoàn về Bưu cục (RTS)`
                      : focusedStop?.dispatchStatus === 'NDR_RESCHEDULED'
                        ? `⏸ Hàng giữ On-Hold hẹn giao lại`
                        : focusedStop?.dispatchStatus === 'ASSIGNED_TO_SHIPPER'
                          ? `Kiện đang chờ lấy tại Trụ sở (${liveLegMetrics.distanceKm} km từ Hub tới điểm nhận)`
                          : `Cách điểm giao ${liveLegMetrics.distanceKm} km (~${liveLegMetrics.etaMin} phút đường bộ)`
              }
            >
              <ShipperMultiStopMapLayer
                hubPosition={hubCoords}
                hubName={activeHub?.shortName || activeHub?.hubCode}
                hubRadiusMeters={Math.round((activeShipper?.coverageRadiusKm || 2.2) * 1000)}
                shipperPosition={shipperCoords}
                shipperLabel={activeShipper?.fullName || 'Shipper'}
                shipperPlate={activeShipper?.vehiclePlate || '99C-182.68'}
                stops={orderedStops}
                focusedItemCode={focusedStop?.itemCode || ''}
                roadRoutePoints={roadRoutePoints}
                activeLegPoints={liveLegMetrics.points}
                onSelectStop={(code) => {
                  setSelectedStopCode(code);
                  setShowNdr(false);
                }}
              />
            </MapView>
          </div>

          {/* Clickable Ordered Stop Chips with Accurate Leg Distance */}
          <div className="spx-stop-sequence" role="list" aria-label="Thứ tự điểm dừng trên tuyến">
            {orderedStops.map(({ item, index, legDistanceKm }) => {
              const done = item.dispatchStatus === 'DELIVERED_POD';
              const isNdr = item.dispatchStatus === 'NDR_RESCHEDULED';
              const isReturnPending = item.dispatchStatus === 'RETURN_PENDING';
              const isReturnedHub = item.dispatchStatus === 'RETURNED_TO_HUB';
              const isCurrent = focusedStop?.itemCode === item.itemCode;
              const statusShort = done
                ? '✓ Đã POD'
                : isReturnedHub
                  ? '✓ Đã trả kho'
                  : isReturnPending
                    ? '⚠️ Chờ hoàn'
                    : isNdr
                      ? `⏸ Hẹn lại${item.deliveryAttemptCount > 1 ? ` (${item.deliveryAttemptCount}/${item.maxDeliveryAttempts || 3})` : ''}`
                      : item.dispatchStatus === 'OUT_FOR_DELIVERY'
                        ? `Đang giao • ${legDistanceKm}km`
                        : `Chờ lấy Hub • ${legDistanceKm}km`;
              const urgency = getSlaUrgency(item.slaWindow);
              return (
                <button
                  key={item.itemCode}
                  type="button"
                  className={`spx-stop-chip${done ? ' is-done' : ''}${isNdr ? ' is-ndr' : ''}${isCurrent ? ' is-current' : ''}`}
                  style={!done && !isNdr && urgency !== 'green' ? { borderColor: slaUrgencyColor[urgency], borderWidth: '1.5px' } : undefined}
                  onClick={() => {
                    setSelectedStopCode(item.itemCode);
                    setShowNdr(false);
                  }}
                >
                  <span>#{index}</span>
                  <span>{item.itemCode}</span>
                  <span>{statusShort}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Strict GrabExpress / SPX Next-Stop Execution Card */}
        {focusedStop && (
          <div className="spx-next-stop-card" data-testid="spx-next-stop-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="spx-next-badge">
                <Navigation size={12} />
                {focusedStop.dispatchStatus === 'DELIVERED_POD'
                  ? `CHẶNG #${focusedStopEntry?.index || 1} • ĐÃ HOÀN TẤT BÀN GIAO`
                  : focusedStop.dispatchStatus === 'RETURNED_TO_HUB'
                    ? `CHẶNG #${focusedStopEntry?.index || 1} • ĐÃ BÀN GIAO TRẢ KHO BƯU CỤC`
                    : focusedStop.dispatchStatus === 'RETURN_PENDING'
                      ? `CHẶNG #${focusedStopEntry?.index || 1} • CHỜ HOÀN BƯU CỤC`
                      : focusedStop.dispatchStatus === 'NDR_RESCHEDULED'
                        ? `CHẶNG #${focusedStopEntry?.index || 1} • HÀNG GIỮ ON-HOLD (HẸN LẠI)`
                        : focusedStop.dispatchStatus === 'ASSIGNED_TO_SHIPPER'
                          ? `CHẶNG #${focusedStopEntry?.index || 1} • CHỜ NHẬN TẠI TRỤ SỞ HUB`
                          : `CHẶNG #${focusedStopEntry?.index || 1} • ĐANG TRÊN ĐƯỜNG GIAO`}
              </span>
              <span className="spx-sla-badge">
                <Clock size={12} /> {focusedStop.slaWindow || 'SLA 90 phút trong ca'}
              </span>
            </div>

            {/* 3-Step Real-World Logistics SOP Stepper */}
            <div className="spx-sop-stepper" aria-label="Quy trình tác nghiệp 3 bước chuẩn thực tế">
              <div
                className={`spx-sop-step ${
                  focusedStop.dispatchStatus !== 'ASSIGNED_TO_SHIPPER' ? 'is-done' : 'is-active'
                }`}
              >
                <span>1.</span>
                <span>
                  {focusedStop.dispatchStatus !== 'ASSIGNED_TO_SHIPPER'
                    ? '✓ Đã quét xuất trạm'
                    : 'Quét nhận tại Hub'}
                </span>
              </div>
              <div
                className={`spx-sop-step ${
                  focusedStop.dispatchStatus === 'DELIVERED_POD' || hasArrivedAtFocusedStop
                    ? 'is-done'
                    : focusedStop.dispatchStatus === 'OUT_FOR_DELIVERY'
                      ? 'is-active'
                      : ''
                }`}
              >
                <span>2.</span>
                <span>
                  {focusedStop.dispatchStatus === 'DELIVERED_POD' || hasArrivedAtFocusedStop
                    ? '✓ Đã tới điểm giao'
                    : 'Check-in GPS tới nơi'}
                </span>
              </div>
              <div
                className={`spx-sop-step ${
                  focusedStop.dispatchStatus === 'DELIVERED_POD'
                    ? 'is-done'
                    : focusedStop.dispatchStatus === 'OUT_FOR_DELIVERY' && hasArrivedAtFocusedStop
                      ? 'is-active'
                      : ''
                }`}
              >
                <span>3.</span>
                <span>
                  {focusedStop.dispatchStatus === 'DELIVERED_POD'
                    ? '✓ Đã ký & Ảnh POD'
                    : 'Bàn giao & Ảnh POD'}
                </span>
              </div>
            </div>

            {/* COD & Cargo Information Card */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1.05rem', fontWeight: 850 }}>{focusedStop.itemCode}</strong>
                {focusedStop.requiresColdChain && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(2, 132, 199, 0.14)',
                      color: '#0284c7'
                    }}
                  >
                    <Snowflake size={12} /> Chuỗi lạnh {focusedStop.requiredTempC}°C
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, marginTop: 3 }}>{focusedStop.cargoName}</div>
            </div>

            {/* COD Banner (Cash / Dynamic QR / Paid 0đ) */}
            <div
              data-testid="stop-cod-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 10,
                background:
                  Number(focusedStop.codAmountVnd || 0) > 0
                    ? focusedStop.codStatus === 'COLLECTED_QR'
                      ? 'rgba(2, 132, 199, 0.12)'
                      : focusedStop.codStatus === 'COLLECTED_CASH'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(148, 163, 184, 0.14)',
                border:
                  Number(focusedStop.codAmountVnd || 0) > 0
                    ? focusedStop.codStatus === 'COLLECTED_QR'
                      ? '1px solid rgba(2, 132, 199, 0.3)'
                      : focusedStop.codStatus === 'COLLECTED_CASH'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.35)'
                    : '1px solid rgba(148, 163, 184, 0.25)',
                fontSize: '0.76rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Banknote
                  size={15}
                  color={
                    Number(focusedStop.codAmountVnd || 0) > 0
                      ? focusedStop.codStatus === 'COLLECTED_QR'
                        ? '#0284c7'
                        : focusedStop.codStatus === 'COLLECTED_CASH'
                          ? '#059669'
                          : '#d97706'
                      : '#64748b'
                  }
                />
                <span style={{ fontWeight: 800 }}>
                  {Number(focusedStop.codAmountVnd || 0) > 0
                    ? `Thu hộ COD: ${formatVnd(focusedStop.codAmountVnd)}`
                    : 'Đơn 0 ₫ (Đã thanh toán trước)'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background:
                    focusedStop.codStatus === 'COLLECTED_QR'
                      ? '#0284c7'
                      : focusedStop.codStatus === 'COLLECTED_CASH'
                        ? '#059669'
                        : Number(focusedStop.codAmountVnd || 0) > 0
                          ? '#d97706'
                          : '#64748b',
                  color: '#ffffff'
                }}
              >
                {focusedStop.codStatus === 'COLLECTED_QR'
                  ? 'Đã thu QR Trực tuyến'
                  : focusedStop.codStatus === 'COLLECTED_CASH'
                    ? 'Đã thu Tiền mặt'
                    : Number(focusedStop.codAmountVnd || 0) > 0
                      ? 'Chưa thu tiền'
                      : 'Không thu COD'}
              </span>
            </div>

            {/* Consignee Address Box + 3-Call Direct Action Button */}
            <div className="spx-address-box">
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669' }}>
                <MapPin size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                NGƯỜI NHẬN: {focusedStop.consigneeName}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{focusedStop.deliveryAddress}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <PhoneCall size={12} color="#0284c7" />
                  <strong>{focusedStop.consigneePhone || '0222 3833 555'}</strong>
                </span>

                {/* Direct Call Button (SPX 3-Call SOP) */}
                {canAct && (
                  <button
                    type="button"
                    data-testid="btn-call-recipient"
                    onClick={() => onLogCall?.(focusedStop)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid #0284c7',
                      background: 'rgba(2, 132, 199, 0.1)',
                      color: '#0284c7',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Gọi điện cho người nhận (quy định gọi tối thiểu 3 cuộc cách quãng)"
                  >
                    <PhoneCall size={13} />
                    Gọi người nhận (Đã gọi {currentCallAttempts}/3 cuộc)
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: '0.73rem', opacity: 0.9, marginTop: 4 }}>
                <span>
                  {focusedStop.parcelCount} kiện · {focusedStop.weightKg} kg · Cự ly {liveLegMetrics.distanceKm} km (~{liveLegMetrics.etaMin} phút)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(5, 150, 105, 0.12)', color: '#059669', fontWeight: 800, fontSize: '0.68rem' }}>
                    Ngoại quan: {focusedStop.packageCondition === 'INTACT' || !focusedStop.packageCondition ? 'Nguyên vẹn' : 'Cảnh báo'}
                  </span>
                  <span style={{ padding: '2px 7px', borderRadius: 6, background: (focusedStop.deliveryAttemptCount || 1) >= 3 ? 'rgba(220, 38, 38, 0.15)' : 'rgba(2, 132, 199, 0.12)', color: (focusedStop.deliveryAttemptCount || 1) >= 3 ? '#dc2626' : '#0284c7', fontWeight: 800, fontSize: '0.68rem' }}>
                    Lần phát {focusedStop.deliveryAttemptCount || 1}/{focusedStop.maxDeliveryAttempts || 3}
                  </span>
                </span>
              </div>
              {currentCallAttempts > 0 && (
                <div style={{ fontSize: '0.69rem', color: '#0284c7', fontWeight: 700, marginTop: 2 }}>
                  📞 Lịch sử gọi: Đã thực hiện {currentCallAttempts} cuộc {focusedStop.lastCalledAt ? `(gần nhất: ${new Date(focusedStop.lastCalledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})` : ''}
                </div>
              )}
            </div>

            {/* Mandatory Hub Pickup Guard Notice when item is still ASSIGNED_TO_SHIPPER */}
            {focusedStop.dispatchStatus === 'ASSIGNED_TO_SHIPPER' && (
              <div
                data-testid="hub-pickup-required-guard"
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.38)',
                  color: '#b45309',
                  fontSize: '0.74rem',
                  fontWeight: 750,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <Lock size={15} style={{ flexShrink: 0 }} />
                <span>
                  Kiện hàng đang lưu tại lồng phân tuyến <strong>{activeHub?.hubCode}</strong>. Bắt buộc quét nhận kiện xuất trạm lên xe trước khi mở khóa tính năng Chụp Ảnh POD hoặc Báo cáo Sự cố.
                </span>
              </div>
            )}

            {/* Non-Delivery Report (NDR) & RTS Drawer */}
            {showNdr && focusedStop.dispatchStatus === 'OUT_FOR_DELIVERY' && (
              <div className="spx-ndr-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626' }}>
                    LẬP BIÊN BẢN SỰ CỐ GIAO NHẬN &amp; HẸN GIAO LẠI
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNdr(false)}
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Sub-tabs: On-Hold (hẹn giao lại) vs RTS (Khách từ chối / Chờ hoàn) */}
                <div style={{ display: 'flex', gap: 6, padding: 3, borderRadius: 8, background: 'rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNdrMode('ON_HOLD');
                      setNdrReason(ON_HOLD_REASONS[0]);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: 0,
                      background: ndrMode === 'ON_HOLD' ? '#ea580c' : 'transparent',
                      color: ndrMode === 'ON_HOLD' ? '#fff' : 'inherit',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    1. Hẹn giao lại (On-Hold)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNdrMode('RTS');
                      setNdrReason(RTS_REASONS[0]);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 6,
                      border: 0,
                      background: ndrMode === 'RTS' ? '#dc2626' : 'transparent',
                      color: ndrMode === 'RTS' ? '#fff' : 'inherit',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    2. Chờ hoàn Hub (RTS)
                  </button>
                </div>

                {/* Reason Selection Chips */}
                <div className="spx-ndr-reasons">
                  {(ndrMode === 'ON_HOLD' ? ON_HOLD_REASONS : RTS_REASONS).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="spx-ndr-chip"
                      aria-pressed={ndrReason === r}
                      onClick={() => setNdrReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* SPX 3-Call Rule Warning */}
                {is3CallRuleViolated && (
                  <div
                    data-testid="spx-3call-rule-warning"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(220, 38, 38, 0.15)',
                      border: '1.5px solid #dc2626',
                      color: '#b91c1c',
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                      <span>
                        CẢNH BÁO QUY ĐỊNH GIAO HÀNG: Bắt buộc gọi tối thiểu 3 cuộc cách quãng cho người nhận trước khi chọn lý do Không liên lạc được! (Hiện tại: {currentCallAttempts}/3 cuộc).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLogCall?.(focusedStop)}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '4px 9px',
                        borderRadius: 6,
                        border: 0,
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <PhoneCall size={12} /> Bấm để thực hiện cuộc gọi #{currentCallAttempts + 1}
                    </button>
                  </div>
                )}

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: '0.73rem',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={contactConfirmed}
                    onChange={(e) => setContactConfirmed(e.target.checked)}
                  />
                  Xác nhận đã gọi điện liên hệ người nhận / thủ kho tại hiện trường
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowNdr(false)}
                    style={{ fontSize: '0.74rem', padding: '6px 10px' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    data-testid="btn-submit-ndr"
                    disabled={!contactConfirmed || is3CallRuleViolated}
                    title={
                      is3CallRuleViolated
                        ? 'Chưa đủ tối thiểu 3 cuộc gọi theo quy định giao hàng'
                        : 'Ghi nhận sự cố & Chuyển điểm kế tiếp'
                    }
                    onClick={submitNdr}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      padding: '6px 12px',
                      background:
                        contactConfirmed && !is3CallRuleViolated
                          ? ndrMode === 'RTS'
                            ? '#dc2626'
                            : '#ea580c'
                          : '#94a3b8',
                      color: '#fff',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: contactConfirmed && !is3CallRuleViolated ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {ndrMode === 'RTS' ? 'Xác nhận Chờ hoàn Bưu cục (RTS)' : 'Ghi nhận On-Hold & Chuyển điểm'}
                  </button>
                </div>
              </div>
            )}

            {/* Strict Operational Action Row by State */}
            {canAct && (
              <div className="spx-cta-row">
                {/* STATE 1: ASSIGNED_TO_SHIPPER -> Must scan/pickup from Hub first */}
                {focusedStop.dispatchStatus === 'ASSIGNED_TO_SHIPPER' && (
                  <button
                    type="button"
                    data-testid="btn-pickup-single-stop"
                    onClick={() => onStartItemDelivery?.(focusedStop)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: 0,
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7
                    }}
                  >
                    <Truck size={15} /> Bước 1: Quét nhận kiện tại Trụ sở &amp; Bắt đầu đi giao
                  </button>
                )}

                {/* STATE 2: OUT_FOR_DELIVERY -> Step 2 (Check-in Arrival) + Step 3 (Photo POD or NDR) */}
                {focusedStop.dispatchStatus === 'OUT_FOR_DELIVERY' && (
                  <>
                    {!hasArrivedAtFocusedStop && (
                      <button
                        type="button"
                        data-testid="btn-checkin-arrival"
                        onClick={() => onCheckInStopArrival?.(focusedStop)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: '1.5px solid #0284c7',
                          background: 'rgba(2, 132, 199, 0.1)',
                          color: '#0284c7',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <CheckCircle2 size={15} /> Đã tới điểm giao (Check-in GPS)
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid="cockpit-open-pod"
                      onClick={() => {
                        if (!hasArrivedAtFocusedStop) {
                          onCheckInStopArrival?.(focusedStop);
                        }
                        onOpenPhotoPod?.(focusedStop);
                      }}
                      style={{
                        flex: 1.25,
                        padding: '9px 14px',
                        borderRadius: 10,
                        border: 0,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Camera size={15} /> Chụp Ảnh POD &amp; Giao xong
                    </button>

                    <button
                      type="button"
                      data-testid="btn-toggle-ndr"
                      onClick={() => setShowNdr((v) => !v)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <AlertTriangle size={14} /> Sự cố / Hẹn lại
                    </button>
                  </>
                )}

                {/* STATE 3: ON-HOLD or RETURN_PENDING -> Re-attempt delivery OR Scan return to Hub */}
                {(focusedStop.dispatchStatus === 'NDR_RESCHEDULED' ||
                  focusedStop.dispatchStatus === 'RETURN_PENDING') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        data-testid="btn-retry-ndr"
                        onClick={() => onRetryNdrDelivery?.(focusedStop)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: '1.5px solid #0284c7',
                          background: 'rgba(2, 132, 199, 0.12)',
                          color: '#0284c7',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <RotateCcw size={15} /> Giao lại (Khách hẹn nhận)
                      </button>

                      <button
                        type="button"
                        data-testid="btn-scan-hub-return"
                        onClick={() => onScanHubReturn?.(focusedStop)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: '1.5px solid #475569',
                          background: 'rgba(71, 85, 105, 0.14)',
                          color: '#334155',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <Undo2 size={15} /> Quét trả kho Bưu cục
                      </button>
                    </div>
                  </div>
                )}

                {/* STATE 4: RETURNED_TO_HUB */}
                {focusedStop.dispatchStatus === 'RETURNED_TO_HUB' && (
                  <div
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: 'rgba(71, 85, 105, 0.12)',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7
                    }}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    Đã quét trả kho Bưu cục thành công (Thủ kho nhận: {focusedStop.hubReturnReceivedBy || 'Thủ kho Hub'})
                  </div>
                )}

                {/* STATE 5: DELIVERED_POD */}
                {focusedStop.dispatchStatus === 'DELIVERED_POD' && (
                  <div
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7
                    }}
                  >
                    <PackageCheck size={16} /> Đã hoàn tất bàn giao &amp; xác thực Photo POD ({focusedStop.recipientPodName || 'Đã ký nhận'})
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Modal 3-Gate Shift Checkout Checklist */}
      {showEndShiftModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Khóa kiểm tra 3 điều kiện Kết thúc ca làm việc Bưu cục"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3300,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
              borderRadius: 18,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 20px 45px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', letterSpacing: '0.05em' }}>
                  3 ĐIỀU KIỆN NGHIỆM THU HOÀN TẤT CA LÀM VIỆC
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 850 }}>
                  Đối soát 3 Điều kiện Kết ca Bưu cục
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEndShiftModal(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Gate 1 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: gate1Pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: gate1Pass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gate1Pass ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#dc2626" />}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>Gate 1: Không còn kiện trên xe</div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                      {gate1Pass
                        ? 'Đạt: 0 kiện OUT_FOR_DELIVERY'
                        : `Chưa đạt: Còn ${inTransitItems.length} kiện đang đi giao chưa xử lý`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gate1Pass ? '#059669' : '#dc2626' }}>
                  {gate1Pass ? 'HỢP LỆ' : 'CHẶN'}
                </span>
              </div>

              {/* Gate 2 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: gate2Pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: gate2Pass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gate2Pass ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#dc2626" />}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>Gate 2: Đã quét trả kho toàn bộ hàng tồn</div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                      {gate2Pass
                        ? 'Đạt: 100% hàng On-Hold/Hoàn đã bàn giao Thủ kho'
                        : `Chưa đạt: Còn ${unreturnedItems.length} kiện On-Hold/Chờ hoàn chưa quét trả kho Bưu cục`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gate2Pass ? '#059669' : '#dc2626' }}>
                  {gate2Pass ? 'HỢP LỆ' : 'CHẶN'}
                </span>
              </div>

              {/* Gate 3 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: gate3Pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: gate3Pass ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gate3Pass ? <CheckCircle2 size={16} color="#059669" /> : <XCircle size={16} color="#dc2626" />}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>Gate 3: Tiền mặt COD cầm tay = 0 ₫</div>
                    <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                      {gate3Pass
                        ? 'Đạt: Đã nộp 100% tiền mặt COD cho Thủ quỹ Bưu cục'
                        : `Chưa đạt: Đang cầm ${formatVnd(codHoldingCash)} tiền mặt COD chưa nộp`}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: gate3Pass ? '#059669' : '#dc2626' }}>
                  {gate3Pass ? 'HỢP LỆ' : 'CHẶN'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEndShiftModal(false)}
                style={{ fontSize: '0.75rem', padding: '7px 12px' }}
              >
                Đóng
              </button>
              <button
                type="button"
                data-testid="btn-confirm-end-shift"
                disabled={!all3GatesPass}
                onClick={() => {
                  onEndShift?.(activeShipper.shipperCode);
                  setShowEndShiftModal(false);
                }}
                style={{
                  border: 0,
                  borderRadius: 8,
                  padding: '7px 15px',
                  background: all3GatesPass ? '#059669' : '#94a3b8',
                  color: '#fff',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: all3GatesPass ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <LogOut size={14} /> Xác nhận Kết ca Bưu cục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
