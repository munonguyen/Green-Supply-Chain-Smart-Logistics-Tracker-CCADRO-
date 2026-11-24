import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  MapPin,
  Package,
  Route,
  Send,
  ShieldCheck,
  Truck,
  UserCheck
} from 'lucide-react';
import { api } from '../../../../services/api';
import { DriverHistoryButton, DriverTransportHistory } from '../../../../shared/components/history/TransportHistory';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import RouteEvidence from '../../../../shared/map/RouteEvidence';
import { formatDate, formatNumber } from '../containers/containerPresentation';
import './dispatch.css';

const unwrap = (response) => response?.result ?? response;
const list = (response) => (Array.isArray(unwrap(response)) ? unwrap(response) : []);

export default function DispatchPage() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [routeVersion, setRouteVersion] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [pinned, setPinned] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [historyDriver, setHistoryDriver] = useState(null);
  const [historyDriverId, setHistoryDriverId] = useState('');
  const [loadErrors, setLoadErrors] = useState([]);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.getShipmentById(shipmentId),
      api.getActiveRouteVersion(shipmentId),
      api.getVehicles(),
      api.getDispatchDrivers(),
      api.getContainers()
    ]).then((results) => {
      if (!active) return;
      const failures = [];
      const value = (index, label) => {
        const result = results[index];
        if (result.status === 'fulfilled') return unwrap(result.value);
        failures.push(`${label}: ${result.reason?.message || 'chưa tải được'}`);
        return null;
      };
      setShipment(value(0, 'Vận đơn'));
      setRouteVersion(value(1, 'Lộ trình hiệu lực'));
      const vehicleList = list({ result: value(2, 'Danh sách xe') });
      const driverList = list({ result: value(3, 'Danh sách tài xế') });
      const matched = list({ result: value(4, 'Container') }).find(
        (container) => container.assignedShipmentId === shipmentId && container.status === 'ASSIGNED'
      );
      setPinned(matched || null);
      setVehicles(vehicleList);
      setDrivers(driverList);
      setSelectedVehicleId(matched?.assignedVehicleId || '');
      setSelectedDriverId(matched?.assignedDriverId || '');
      setLoadErrors(failures);
    });
    return () => {
      active = false;
    };
  }, [shipmentId]);

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
  const activeDriver = drivers.find((driver) => driver.id === selectedDriverId);
  const driverCheck = activeDriver
    ? {
        eligible: pinned
          ? activeDriver.status === 'ASSIGNED' && !activeDriver.qualificationIssue
          : activeDriver.eligible,
        reasons: pinned && !activeDriver.qualificationIssue ? [] : activeDriver.reasons
      }
    : { eligible: false, reasons: ['Chưa chọn tài xế'] };
  const vehicleBlocked =
    !activeVehicle ||
    activeVehicle.status !== (pinned ? 'ASSIGNED' : 'AVAILABLE') ||
    activeVehicle.isDeleted;

  const geometry = useMemo(() => {
    if (!routeVersion?.routeGeoJson) return [];
    try {
      const parsed =
        typeof routeVersion.routeGeoJson === 'string'
          ? JSON.parse(routeVersion.routeGeoJson)
          : routeVersion.routeGeoJson;
      return (parsed.coordinates || []).map(([longitude, latitude]) => [latitude, longitude]);
    } catch {
      return [];
    }
  }, [routeVersion]);

  const routeReady = Boolean(routeVersion?.id);
  const vehicleReady = Boolean(activeVehicle) && !vehicleBlocked;
  const driverReady = Boolean(activeDriver) && Boolean(driverCheck.eligible);
  const gatesPassedCount = [routeReady, vehicleReady, driverReady].filter(Boolean).length;

  const createDispatch = async () => {
    if (vehicleBlocked || !driverCheck.eligible || !routeVersion?.id) {
      setDispatchError(
        !routeVersion?.id
          ? 'Chưa có RouteVersion hiệu lực.'
          : vehicleBlocked
            ? 'Xe không còn ở trạng thái sẵn sàng.'
            : `Tài xế chưa đủ điều kiện: ${driverCheck.reasons.join(', ')}.`
      );
      return;
    }
    setDispatchError('');
    setDispatching(true);
    try {
      const response = await api.createDispatchOrder({
        dispatchCode: `DSP-${Date.now().toString().slice(-8)}`,
        shipmentId,
        vehicleId: activeVehicle.id,
        driverId: activeDriver.id
      });
      const dispatchOrder = unwrap(response);
      if (!dispatchOrder?.tripId) throw new Error('Lệnh điều phối chưa tạo được chuyến thực tế.');
      navigate(`/trips/${dispatchOrder.tripId}`);
    } catch (failure) {
      setDispatchError(failure.message || 'Backend từ chối hoặc không hoàn tất điều phối.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="page-body dispatch-workspace">
      {/* Header & Workflow Progress */}
      <section className="dispatch-header-card">
        <header className="dispatch-page-heading">
          <div className="dispatch-heading-copy">
            <div className="dispatch-eyebrow">ĐIỀU HÀNH VẬN TẢI / KIỂM TRA TRƯỚC ĐIỀU PHỐI</div>
            <h2>Phân công xe và tài xế</h2>
            <div className="dispatch-shipment-meta">
              <span>Vận đơn</span>
              <code className="dispatch-ref-pill">{shipment?.shipmentCode || shipmentId}</code>
              <span
                className={`dispatch-status-chip ${
                  shipment?.status ? 'dispatch-status-chip--ok' : 'dispatch-status-chip--neutral'
                }`}
              >
                {shipment?.status || 'Chưa xác định'}
              </span>
            </div>
          </div>

          <div className="dispatch-heading-actions">
            <Link to={`/planning/${shipmentId}`} className="btn btn-secondary">
              <Route size={15} /> Mở lập tuyến
            </Link>
          </div>
        </header>

        <nav className="dispatch-step-strip" aria-label="Tiến trình điều phối">
          <div className={`dispatch-step ${routeReady ? 'done' : ''}`}>
            <span>1</span>
            <b>Lập &amp; chốt lộ trình</b>
          </div>
          <i aria-hidden="true" />
          <div className="dispatch-step active">
            <span>2</span>
            <b>Phân công xe &amp; tài xế</b>
          </div>
          <i aria-hidden="true" />
          <div className="dispatch-step">
            <span>3</span>
            <b>Pre-trip &amp; giám sát chuyến</b>
          </div>
        </nav>
      </section>

      {loadErrors.length > 0 && (
        <div className="dispatch-alert dispatch-alert--error" role="alert">
          <AlertTriangle size={17} />
          <div>Thiếu dữ liệu để xét điều kiện: {loadErrors.join(' · ')}</div>
        </div>
      )}

      {dispatchError && (
        <div className="dispatch-alert dispatch-alert--error" role="alert">
          <AlertTriangle size={17} />
          <div>{dispatchError}</div>
        </div>
      )}

      {/* 3 Readiness Summary Cards */}
      <section className="dispatch-readiness-grid" aria-label="Tóm tắt sẵn sàng điều phối">
        <article className="dispatch-stat-card">
          <div className="dispatch-stat-card__top">
            <span className="dispatch-stat-card__label">Vận đơn</span>
            <span className="dispatch-stat-card__icon">
              <Package size={16} />
            </span>
          </div>
          <strong className="dispatch-stat-card__value">
            {shipment?.shipmentCode || 'Chưa tải được'}
          </strong>
          <small className="dispatch-stat-card__sub">
            Trạng thái: {shipment?.status || 'Chưa xác định'}
          </small>
        </article>

        <article className="dispatch-stat-card">
          <div className="dispatch-stat-card__top">
            <span className="dispatch-stat-card__label">Lộ trình hiệu lực</span>
            <span
              className={`dispatch-stat-card__icon ${
                routeReady ? '' : 'dispatch-stat-card__icon--amber'
              }`}
            >
              <Route size={16} />
            </span>
          </div>
          <strong className="dispatch-stat-card__value">
            {routeVersion?.id ? `Phiên bản ${routeVersion.versionNumber}` : 'Chưa chốt'}
          </strong>
          <small className="dispatch-stat-card__sub">
            {routeVersion
              ? `${formatNumber(Number(routeVersion.totalDistanceMeters || 0) / 1000, ' km')} · ${formatDate(routeVersion.createdAt)}`
              : 'Bắt buộc trước khi dispatch'}
          </small>
        </article>

        <article className="dispatch-stat-card">
          <div className="dispatch-stat-card__top">
            <span className="dispatch-stat-card__label">Giờ giao cam kết</span>
            <span className="dispatch-stat-card__icon dispatch-stat-card__icon--blue">
              <Clock size={16} />
            </span>
          </div>
          <strong className="dispatch-stat-card__value">
            {shipment?.deliveryDeadline ? formatDate(shipment.deliveryDeadline) : 'Chưa khai báo'}
          </strong>
          <small className="dispatch-stat-card__sub">
            Đối chiếu ETA tại trang theo dõi sau khi tạo chuyến
          </small>
        </article>
      </section>

      {/* Main 2-Column Workspace */}
      <div className="dispatch-main-grid">
        {/* Left Column: Vehicle & Driver Assignment */}
        <div className="dispatch-config-col">
          {/* Vehicle Selection */}
          <section className="dispatch-section-card">
            <div className="dispatch-section-head">
              <h3 className="dispatch-section-title">
                <span className="dispatch-section-icon">
                  <Truck size={18} />
                </span>
                <span>Chọn phương tiện</span>
              </h3>
              <span
                className={`dispatch-status-chip ${
                  vehicleReady
                    ? 'dispatch-status-chip--ok'
                    : activeVehicle
                      ? 'dispatch-status-chip--danger'
                      : 'dispatch-status-chip--neutral'
                }`}
              >
                {vehicleReady ? 'Sẵn sàng' : activeVehicle ? 'Không khả dụng' : 'Chưa chọn'}
              </span>
            </div>

            <label className="dispatch-field">
              <span className="dispatch-field__label">Xe đang sẵn sàng</span>
              <div className="dispatch-select-wrap">
                <select
                  className="dispatch-select"
                  disabled={Boolean(pinned)}
                  value={selectedVehicleId}
                  onChange={(event) => setSelectedVehicleId(event.target.value)}
                >
                  <option value="">Chọn xe</option>
                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                      disabled={
                        vehicle.status !== (pinned ? 'ASSIGNED' : 'AVAILABLE') || vehicle.isDeleted
                      }
                    >
                      {vehicle.vehicleCode} · {vehicle.plateNumber} · {vehicle.status} · tải{' '}
                      {vehicle.maxPayloadTons ?? '—'} tấn
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="dispatch-select-chevron" />
              </div>
            </label>

            {activeVehicle ? (
              <>
                <div className="dispatch-spec-row">
                  <div className="dispatch-spec-item">
                    <span>Nhiên liệu</span>
                    <strong>{activeVehicle.fuelType || '—'}</strong>
                    <Link
                      to={'/vehicle-fuels?vehicle=' + encodeURIComponent(activeVehicle.id)}
                      style={{ fontSize: 11, color: '#059669', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Chọn nhiên liệu &amp; dự toán CO₂ →
                    </Link>
                  </div>
                  <div className="dispatch-spec-item">
                    <span>Chuẩn khí thải</span>
                    <strong>Euro {activeVehicle.euroStandard || '—'}</strong>
                  </div>
                  <div className="dispatch-spec-item">
                    <span>Tải trọng tối đa</span>
                    <strong>{formatNumber(activeVehicle.maxPayloadTons, ' tấn')}</strong>
                  </div>
                </div>
                <p className="dispatch-confirm-note">
                  <Info size={15} />
                  <span>Hệ thống kiểm tra tải trọng trước khi phân công.</span>
                </p>
              </>
            ) : (
              !vehicles.length && (
                <div className="dispatch-empty-note">
                  <Info size={15} />
                  <span>Danh sách phương tiện trống hoặc chưa kết nối được dữ liệu đội xe.</span>
                </div>
              )
            )}
          </section>

          {/* Driver Qualification & Selection */}
          <section className="dispatch-section-card">
            <div className="dispatch-section-head">
              <h3 className="dispatch-section-title">
                <span className="dispatch-section-icon">
                  <UserCheck size={18} />
                </span>
                <span>Hồ sơ tài xế và điều kiện phân công</span>
              </h3>
              <span
                className={`dispatch-status-chip ${
                  driverReady
                    ? 'dispatch-status-chip--ok'
                    : activeDriver
                      ? 'dispatch-status-chip--danger'
                      : 'dispatch-status-chip--neutral'
                }`}
              >
                {driverReady ? 'Đủ điều kiện' : activeDriver ? 'Chưa đạt' : 'Chưa chọn'}
              </span>
            </div>

            {pinned && (
              <div className="dispatch-alert dispatch-alert--info">
                <Info size={16} />
                <span>Xe và tài xế đã giữ chỗ cho container {pinned.containerCode}.</span>
              </div>
            )}

            <label className="dispatch-field">
              <span className="dispatch-field__label">Tài xế thực hiện chuyến</span>
              <div className="dispatch-select-wrap">
                <select
                  className="dispatch-select"
                  disabled={Boolean(pinned)}
                  value={selectedDriverId}
                  onChange={(event) => setSelectedDriverId(event.target.value)}
                >
                  <option value="">Chọn tài xế đủ điều kiện</option>
                  {drivers.map((driver) => (
                    <option
                      key={driver.id}
                      value={driver.id}
                      disabled={!pinned && !driver.eligible}
                    >
                      {driver.driverCode} · {driver.fullName} ·{' '}
                      {driver.eligible ? 'Đủ điều kiện' : driver.reasons.join(', ')}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="dispatch-select-chevron" />
              </div>
            </label>

            {activeDriver && (
              <>
                <dl className="driver-qualification-grid">
                  <div>
                    <dt>Nhân viên</dt>
                    <dd>
                      {activeDriver.employeeCode || activeDriver.driverCode} ·{' '}
                      {activeDriver.fullName}
                    </dd>
                  </div>
                  <div>
                    <dt>Vai trò / duyệt</dt>
                    <dd>
                      {activeDriver.employeeCode ? 'Tài xế' : 'Chưa liên kết'} ·{' '}
                      {activeDriver.verificationStatus || 'Chưa duyệt'}
                    </dd>
                  </div>
                  <div>
                    <dt>GPLX</dt>
                    <dd>
                      {activeDriver.licenseClass || 'Thiếu hạng'} ·{' '}
                      {activeDriver.maskedLicense || 'Thiếu số'}
                    </dd>
                  </div>
                  <div>
                    <dt>Ngày hết hạn</dt>
                    <dd>{activeDriver.licenseExpiryDate || 'Chưa khai báo'}</dd>
                  </div>
                  <div>
                    <dt>Hồ sơ sức khỏe</dt>
                    <dd>{activeDriver.healthCheckPassed ? 'Đạt' : 'Chưa đạt/chưa có'}</dd>
                  </div>
                  <div>
                    <dt>Tập huấn</dt>
                    <dd>
                      {activeDriver.safetyTrainingCertified ? 'Đã xác nhận' : 'Chưa xác nhận'}
                    </dd>
                  </div>
                  <div>
                    <dt>HOS liên tục / ngày</dt>
                    <dd>
                      {activeDriver.hosContinuousMin ?? '—'} / {activeDriver.hosDailyMin ?? '—'}{' '}
                      phút
                    </dd>
                  </div>
                  <div>
                    <dt>Ngày cấp GPLX</dt>
                    <dd>{activeDriver.licenseIssueDate || 'Chưa khai báo'}</dd>
                  </div>
                </dl>

                {driverCheck.eligible ? (
                  <p className="driver-qualification-ok">
                    <ShieldCheck size={16} />
                    <span>
                      Các trường kiểm tra trên hồ sơ hiện đạt. Backend vẫn kiểm tra lại khi tạo
                      lệnh.
                    </span>
                  </p>
                ) : (
                  <p className="driver-qualification-block">
                    <AlertTriangle size={16} />
                    <span>Chưa thể phân công: {driverCheck.reasons.join(' · ')}</span>
                  </p>
                )}
              </>
            )}

            {!drivers.length && (
              <div className="dispatch-empty-note">
                <Info size={15} />
                <span>
                  Danh sách tài xế rỗng hoặc dịch vụ không truy cập được; không dùng dữ liệu giả.
                </span>
              </div>
            )}

            {drivers.length > 0 && (
              <div className="dispatch-history-bar">
                <label className="dispatch-field">
                  <span className="dispatch-field__label">Tra lịch sử tài xế</span>
                  <div className="dispatch-select-wrap">
                    <select
                      className="dispatch-select"
                      value={historyDriverId}
                      onChange={(event) => setHistoryDriverId(event.target.value)}
                    >
                      <option value="">Chọn tài xế để tra cứu</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.fullName} · {driver.driverCode}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="dispatch-select-chevron" />
                  </div>
                </label>
                {(historyDriverId || activeDriver) && (
                  <DriverHistoryButton
                    onClick={() =>
                      setHistoryDriver(
                        drivers.find((driver) => driver.id === historyDriverId) || activeDriver
                      )
                    }
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Readiness Checklist, Route Preview & Confirm */}
        <aside className="dispatch-summary-col" aria-label="Cổng kiểm tra và xác nhận điều phối">
          <section className="dispatch-section-card">
            <div className="dispatch-section-head">
              <h3 className="dispatch-section-title">
                <span className="dispatch-section-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>Điều kiện xuất bến</span>
              </h3>
              <span
                className={`dispatch-status-chip ${
                  gatesPassedCount === 3
                    ? 'dispatch-status-chip--ok'
                    : 'dispatch-status-chip--warn'
                }`}
              >
                {gatesPassedCount}/3 đạt
              </span>
            </div>

            <div className="dispatch-gate-list">
              <div className={`dispatch-gate-item ${routeReady ? 'is-ready' : ''}`}>
                <span className="dispatch-gate-item__icon">
                  {routeReady ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                </span>
                <div className="dispatch-gate-item__body">
                  <strong>1. Lộ trình hiệu lực</strong>
                  <span>
                    {routeReady
                      ? `Phiên bản ${routeVersion.versionNumber} đã khóa`
                      : 'Chưa chốt lộ trình tại bước lập tuyến'}
                  </span>
                </div>
              </div>

              <div className={`dispatch-gate-item ${vehicleReady ? 'is-ready' : ''}`}>
                <span className="dispatch-gate-item__icon">
                  {vehicleReady ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                </span>
                <div className="dispatch-gate-item__body">
                  <strong>2. Phương tiện vận tải</strong>
                  <span>
                    {vehicleReady
                      ? `${activeVehicle.vehicleCode} · ${activeVehicle.plateNumber}`
                      : activeVehicle
                        ? 'Phương tiện không ở trạng thái sẵn sàng'
                        : 'Chưa chọn xe thực hiện chuyến'}
                  </span>
                </div>
              </div>

              <div className={`dispatch-gate-item ${driverReady ? 'is-ready' : ''}`}>
                <span className="dispatch-gate-item__icon">
                  {driverReady ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                </span>
                <div className="dispatch-gate-item__body">
                  <strong>3. Tài xế đủ điều kiện</strong>
                  <span>
                    {driverReady
                      ? `${activeDriver.fullName} · ${activeDriver.driverCode}`
                      : activeDriver
                        ? driverCheck.reasons.join(', ')
                        : 'Chưa chọn tài xế đủ điều kiện'}
                  </span>
                </div>
              </div>
            </div>

            {geometry.length >= 2 && (
              <div className="dispatch-map-box">
                <MapView
                  center={geometry[Math.floor(geometry.length / 2)]}
                  zoom={10}
                  height={250}
                  defaultLayer="google_hybrid"
                >
                  <OriginMarker position={geometry[0]} title="Điểm đầu theo RouteVersion" />
                  <DestinationMarker
                    position={geometry[geometry.length - 1]}
                    title="Điểm cuối theo RouteVersion"
                  />
                  <RoutePolyline
                    positions={geometry}
                    routingMetadataJson={routeVersion?.routingMetadataJson}
                    color="#10b981"
                    weight={5}
                  />
                </MapView>
              </div>
            )}

            {routeVersion?.routingMetadataJson && <RouteEvidence candidate={routeVersion} />}

            {routeVersion && geometry.length < 2 && (
              <div className="dispatch-empty-note">
                <MapPin size={15} />
                <span>
                  Có RouteVersion nhưng API chưa cung cấp hình học để vẽ. Bản đồ không thay bằng
                  tuyến mẫu.
                </span>
              </div>
            )}

            <div className="dispatch-confirm-bar">
              <p className="dispatch-confirm-note">
                <Clock size={15} />
                <span>
                  Tài xế nhận chuyến và thực hiện Pre-trip trong khoang lái trước khi khởi hành.
                </span>
              </p>
              <button
                className="btn btn-primary dispatch-submit-btn"
                type="button"
                onClick={createDispatch}
                disabled={
                  dispatching ||
                  vehicleBlocked ||
                  !driverCheck.eligible ||
                  !routeVersion?.id ||
                  loadErrors.length > 0
                }
              >
                <Send size={16} />
                <span>{dispatching ? 'Đang xác minh & tạo chuyến…' : 'Phân công chuyến'}</span>
              </button>
            </div>
          </section>

          <div className="dispatch-disclaimer">
            <Info size={15} />
            <span>
              Hồ sơ giấy tờ trong app chỉ chứng minh dữ liệu đã khai báo/được kiểm duyệt nội bộ;
              chưa có kết nối tra cứu GPLX với cơ quan cấp phép hoặc HOS từ tachograph, nên các
              nguồn này cần được kết nối trước khi vận hành production.
            </span>
          </div>
        </aside>
      </div>

      <DriverTransportHistory driver={historyDriver} onClose={() => setHistoryDriver(null)} />
    </div>
  );
}
