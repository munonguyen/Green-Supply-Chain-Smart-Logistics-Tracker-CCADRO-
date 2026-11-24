import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../services/api';
import { TransportHistory } from '../../../../shared/components/history/TransportHistory';
import ContainerDispatchJournal from './ContainerDispatchJournal';
import ContainerActionDesk from './ContainerActionDesk';
import ContainerControlPanel from './ContainerControlPanel';
import ContainerRoutePlanner from './ContainerRoutePlanner';
import ContainerConnection, {
  containerOperationalIssues,
  ContainerConnectionBadge,
  formatSignalAge,
  signalFreshness
} from './ContainerConnection';
import {
  Barcode,
  Box,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock,
  History,
  Info,
  AlertTriangle,
  ArrowUpRight,
  Radio,
  Route,
  MapPin,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  Snowflake,
  Truck,
  UserCheck
} from 'lucide-react';
import {
  buildContainerChecklist,
  CARGO_STATUSES,
  CONTAINER_STATUSES,
  CONTAINER_TYPES,
  formatDate,
  formatDateOnly,
  formatNumber,
  SEAL_LABELS,
  sealData
} from './containerPresentation';
import { CARGO_CATEGORY_META, CARGO_STATUS_META, getManifestProducts } from './cargoProductCatalog';

export function ContainerStatus({ status }) {
  const definition = CONTAINER_STATUSES[status];
  return (
    <span className={'container-status container-tone-' + (definition?.tone || 'muted')}>
      <span aria-hidden="true" />
      {definition?.label || status || 'Chưa có trạng thái'}
    </span>
  );
}

function DataGrid({ entries }) {
  return (
    <dl className="container-data-grid">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value == null || value === '' ? 'Chưa có dữ liệu' : value}</dd>
        </div>
      ))}
    </dl>
  );
}

const SHIPMENT_STATUS_LABELS = {
  CREATED: 'Mới tạo',
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  DISPATCHED: 'Đã điều xe',
  IN_TRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy'
};

function sensorReading(value, unit, timestamp, now) {
  if (value == null) return 'Chưa có dữ liệu';
  const reading = formatNumber(value, unit);
  if (!timestamp) return reading + ' · không rõ thời điểm nhận';
  return reading + ' · nhận ' + formatSignalAge(timestamp, now);
}

function sensorText(value, timestamp, now) {
  if (value == null || value === '') return 'Chưa có dữ liệu';
  return (
    String(value) +
    (timestamp ? ' · nhận ' + formatSignalAge(timestamp, now) : ' · không rõ thời điểm nhận')
  );
}

function cscExaminationSummary(container, now) {
  if (container.cscInspectionScheme === 'PERIODIC') {
    if (!container.cscNextExaminationDate) return 'Thiếu ngày kiểm tra kế tiếp';
    const current = new Date(now);
    const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    return String(container.cscNextExaminationDate).slice(0, 10) < today
      ? 'Ngày kiểm tra đã qua hạn khai báo'
      : 'Ngày kiểm tra kế tiếp theo hồ sơ đã khai báo';
  }
  if (container.cscInspectionScheme === 'ACEP') {
    return container.cscAcepProgramNumber
      ? 'Đã ghi mã ACEP; cần đối chiếu hiệu lực với chủ sở hữu'
      : 'Thiếu mã ACEP';
  }
  return 'Chưa khai báo phương thức kiểm tra CSC';
}

function ShipmentPlan({ container, shipment, state, error, items, manifestState, now }) {
  const sectionTitle = (
    <h3>
      <Package size={17} /> Vận đơn & cam kết giao
    </h3>
  );
  if (!container.assignedShipmentId) {
    return (
      <section className="container-detail-section" aria-label="Kế hoạch vận đơn">
        {sectionTitle}
        <p className="container-field-hint">
          Chưa liên kết ID vận đơn với container; kiểm tra mã vận đơn và liên kết dữ liệu trước khi
          điều phối.
        </p>
      </section>
    );
  }
  if (state === 'loading') {
    return (
      <section className="container-detail-section" aria-label="Kế hoạch vận đơn">
        {sectionTitle}
        <p role="status" className="container-field-hint">
          Đang tải thông tin vận đơn…
        </p>
      </section>
    );
  }
  if (state === 'error' || !shipment) {
    return (
      <section className="container-detail-section" aria-label="Kế hoạch vận đơn">
        {sectionTitle}
        <p role="status" className="container-field-hint">
          {error || 'Không tìm thấy thông tin vận đơn từ mã liên kết.'}
        </p>
      </section>
    );
  }

  const hasFreshPosition = signalFreshness(container.lastPositionReceivedAt, now).key === 'fresh';
  const hasFreshEta = signalFreshness(container.lastEtaAt, now).key === 'fresh';
  const etaMinutes = Number(container.etaMinutes);
  const etaAt =
    container.status === 'IN_TRANSIT' &&
    hasFreshPosition &&
    hasFreshEta &&
    container.etaMinutes != null &&
    Number.isFinite(etaMinutes) &&
    etaMinutes >= 0
      ? now + etaMinutes * 60000
      : null;
  const deadline = shipment.deliveryDeadline ? new Date(shipment.deliveryDeadline).getTime() : null;
  let etaSummary = null;
  if (!hasFreshPosition || !hasFreshEta || etaAt == null) {
    etaSummary = 'Chưa thể so sánh: cần ETA mới và GPS mới.';
  } else if (deadline && Number.isFinite(deadline)) {
    const deltaMinutes = Math.round((etaAt - deadline) / 60000);
    etaSummary =
      deltaMinutes <= 0
        ? 'ETA hiện tại nằm trong hạn giao (' + formatDate(etaAt) + ').'
        : 'ETA hiện tại trễ khoảng ' + deltaMinutes + ' phút (' + formatDate(etaAt) + ').';
  } else {
    etaSummary = 'Có ETA hiện tại (' + formatDate(etaAt) + '), nhưng vận đơn chưa có hạn giao.';
  }
  const etaLate = Boolean(deadline && etaAt && etaAt > deadline);
  const shipmentItems =
    manifestState === 'ready'
      ? items.filter(
          (item) => item.shipmentCode === (shipment.shipmentCode || container.assignedShipmentCode)
        )
      : [];
  const cargoWeightKg = shipmentItems.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);
  const payloadLimitKg = Number(container.maxPayloadTons || 0) * 1000;
  const payloadUsagePct =
    payloadLimitKg > 0 ? Math.round((cargoWeightKg / payloadLimitKg) * 100) : null;
  const coldChainItems = shipmentItems.filter((item) => item.requiresColdChain);
  const coldChainTargets = [
    ...new Set(coldChainItems.map((item) => item.requiredTempC).filter((value) => value != null))
  ];

  return (
    <section className="container-detail-section" aria-label="Kế hoạch vận đơn">
      {sectionTitle}
      <DataGrid
        entries={[
          ['Mã vận đơn', shipment.shipmentCode || container.assignedShipmentCode],
          ['Trạng thái vận đơn', SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status],
          ['Khách hàng / chủ hàng', shipment.customerId],
          ['Loại hàng', shipment.cargoType],
          ['Khối lượng khai báo', formatNumber(shipment.cargoWeightTons, ' tấn')],
          [
            'Khối lượng manifest hiện tại',
            manifestState === 'ready'
              ? formatNumber(cargoWeightKg, ' kg')
              : manifestState === 'error'
                ? 'Chưa tải được manifest'
                : manifestState === 'loading'
                  ? 'Đang tải manifest…'
                  : 'Chưa tải manifest'
          ],
          [
            'Mức sử dụng tải trọng',
            manifestState === 'ready' && payloadUsagePct != null
              ? `${payloadUsagePct}% · ${formatNumber(cargoWeightKg, ' kg')} / ${formatNumber(payloadLimitKg, ' kg')}`
              : 'Chưa đủ dữ liệu để tính'
          ],
          [
            'Chênh lệch manifest - vận đơn',
            manifestState !== 'ready' || shipment.cargoWeightTons == null
              ? 'Chưa đủ dữ liệu để so sánh'
              : formatNumber(cargoWeightKg - Number(shipment.cargoWeightTons) * 1000, ' kg')
          ],
          ['Thể tích khai báo', formatNumber(shipment.cargoVolumeM3, ' m³')],
          [
            'Mã hàng / số kiện',
            manifestState === 'ready'
              ? `${shipmentItems.length} mã · ${formatNumber(
                  shipmentItems.reduce((sum, item) => sum + Number(item.parcelCount || 0), 0),
                  ' kiện'
                )}`
              : manifestState === 'error'
                ? 'Chưa tải được manifest'
                : 'Chưa có dữ liệu manifest'
          ],
          [
            'Yêu cầu chuỗi lạnh',
            manifestState !== 'ready'
              ? 'Chưa xác định'
              : coldChainItems.length === 0
                ? 'Không có hàng yêu cầu chuỗi lạnh'
                : coldChainTargets.length
                  ? coldChainTargets.map((target) => formatNumber(target, ' °C')).join(', ')
                  : 'Có hàng lạnh nhưng thiếu nhiệt độ yêu cầu'
          ],
          [
            'Hàng nguy hiểm',
            shipment.isHazardous == null
              ? null
              : shipment.isHazardous
                ? 'Có · cần đối chiếu khai báo và hướng dẫn xử lý'
                : 'Không'
          ],
          ['Địa chỉ lấy hàng', shipment.originAddress],
          ['Lịch lấy hàng', formatDate(shipment.pickupTimePlanned)],
          ['Địa chỉ giao hàng', shipment.destinationAddress],
          ['Hạn giao vận đơn', formatDate(shipment.deliveryDeadline)],
          ['Ước tính đến nơi', etaSummary]
        ]}
      />
      {manifestState === 'ready' && payloadLimitKg > 0 && cargoWeightKg > payloadLimitKg && (
        <p className="container-notice container-notice-error" role="alert">
          Tổng khối lượng manifest vượt tải trọng cho phép khoảng{' '}
          {formatNumber(cargoWeightKg - payloadLimitKg, ' kg')}; không xuất bến trước khi đối chiếu
          lại số liệu.
        </p>
      )}
      {etaLate && (
        <p className="container-notice container-notice-error" role="status">
          ETA mới và GPS mới cho thấy chuyến đang sau hạn giao trên vận đơn; dispatcher cần kiểm tra
          lộ trình và cập nhật cho các bên liên quan.
        </p>
      )}
      <p className="container-field-hint">
        ETA chỉ được đối chiếu khi cả mốc GPS và mốc ETA đều mới; đây là cảnh báo vận hành, không
        thay thế xác nhận giao hàng.
      </p>
    </section>
  );
}

function CscUpdateForm({ container, onSaved, actionRequest }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lockedInTransit = container.status === 'IN_TRANSIT';
  const openForm = useCallback(() => {
    setForm({
      cscApprovalCountry: container.cscApprovalCountry || '',
      cscApprovalReference: container.cscApprovalReference || '',
      cscManufactureDate: container.cscManufactureDate || '',
      cscInspectionScheme: container.cscInspectionScheme || '',
      cscAcepProgramNumber: container.cscAcepProgramNumber || '',
      cscNextExaminationDate: container.cscNextExaminationDate || ''
    });
    setError('');
    setMessage('');
    setEditing(true);
  }, [container]);
  const openedRequest = useRef(null);
  useEffect(() => {
    if (actionRequest?.target !== 'csc' || openedRequest.current === actionRequest.id) return;
    openedRequest.current = actionRequest.id;
    if (!lockedInTransit) openForm();
  }, [actionRequest, lockedInTransit, openForm]);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.updateContainerCscData(container.containerCode, {
        cscApprovalCountry: form.cscApprovalCountry.trim() || null,
        cscApprovalReference: form.cscApprovalReference.trim() || null,
        cscManufactureDate: form.cscManufactureDate || null,
        cscInspectionScheme: form.cscInspectionScheme || null,
        cscAcepProgramNumber:
          form.cscInspectionScheme === 'ACEP' ? form.cscAcepProgramNumber.trim() || null : null,
        cscNextExaminationDate:
          form.cscInspectionScheme === 'PERIODIC' ? form.cscNextExaminationDate || null : null
      });
      setEditing(false);
      setMessage('Đã cập nhật hồ sơ CSC. Hãy đối chiếu dữ liệu với biển trên thiết bị.');
      await onSaved?.();
    } catch (failure) {
      setError(failure.message || 'Không cập nhật được hồ sơ CSC.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container-csc-editor" data-container-focus={lockedInTransit ? 'csc' : undefined} tabIndex={-1}>
      {message && (
        <p className="container-notice" role="status">
          {message}
        </p>
      )}
      {!editing ? (
        <>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openForm}
            disabled={lockedInTransit}
          >
            Cập nhật thông tin CSC
          </button>
          {lockedInTransit && (
            <p className="container-field-hint">
              Không sửa hồ sơ CSC khi container đang vận chuyển.
            </p>
          )}
        </>
      ) : (
        <form className="container-stage-form" data-container-focus="csc" onSubmit={submit}>
          {error && (
            <p className="container-notice container-notice-error" role="alert">
              {error}
            </p>
          )}
          <div className="container-form-grid">
            {[
              ['cscApprovalCountry', 'Quốc gia / cơ quan phê duyệt', 'text'],
              ['cscApprovalReference', 'Mã tham chiếu phê duyệt', 'text'],
              ['cscManufactureDate', 'Ngày sản xuất', 'date']
            ].map(([name, label, type]) => (
              <label className="container-field" key={name}>
                <span>{label}</span>
                <input
                  type={type}
                  maxLength={type === 'text' ? 100 : undefined}
                  value={form[name]}
                  disabled={busy}
                  onChange={(event) => set(name, event.target.value)}
                />
              </label>
            ))}
            <label className="container-field">
              <span>Chương trình kiểm tra</span>
              <select
                value={form.cscInspectionScheme}
                disabled={busy}
                onChange={(event) => set('cscInspectionScheme', event.target.value)}
              >
                <option value="">Chưa khai báo</option>
                <option value="PERIODIC">Kiểm tra định kỳ (PES)</option>
                <option value="ACEP">Chương trình ACEP</option>
              </select>
            </label>
            {form.cscInspectionScheme === 'PERIODIC' && (
              <label className="container-field">
                <span>Ngày kiểm tra kế tiếp</span>
                <input
                  type="date"
                  value={form.cscNextExaminationDate}
                  disabled={busy}
                  onChange={(event) => set('cscNextExaminationDate', event.target.value)}
                />
              </label>
            )}
            {form.cscInspectionScheme === 'ACEP' && (
              <label className="container-field">
                <span>Mã chương trình ACEP</span>
                <input
                  maxLength={100}
                  value={form.cscAcepProgramNumber}
                  disabled={busy}
                  onChange={(event) => set('cscAcepProgramNumber', event.target.value)}
                />
              </label>
            )}
          </div>
          <div className="container-form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu CSC'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Overview({
  container,
  shipment,
  shipmentState,
  shipmentError,
  items = [],
  manifestState = 'loading',
  now,
  canEditCsc = false,
  actionRequest,
  onRefresh
}) {
  const seal = sealData(container);
  const hasSensorTimestamp = Boolean(
    container.lastSupplyAirTempAt ||
    container.lastReturnAirTempAt ||
    container.lastHumidityAt ||
    container.lastShockAt ||
    container.lastSolarPowerAt ||
    container.lastBatteryAt ||
    container.lastSealAt
  );
  return (
    <div className="container-overview">
      <section className="container-detail-section">
        <h3>
          <Truck size={17} /> Vận hành & đơn vị
        </h3>
        <DataGrid
          entries={[
            ['Công ty phụ trách', container.responsibleCompanyName],
            ['Mã công ty', container.responsibleCompanyCode],
            ['Biển số xe', container.vehicleLicensePlate],
            ['Loại xe', container.vehicleTypeLabel],
            ['Tài xế', container.driverName],
            ['Điện thoại', container.driverPhone],
            ['Giấy phép lái xe', container.driverLicense],
            [
              'Điểm an toàn tài xế',
              container.assignedDriverId ? formatNumber(container.driverSafetyScore, ' / 5') : null
            ],
            ['Vận đơn', container.assignedShipmentCode],
            ['Điểm xuất phát', container.originName],
            ['Cơ sở đích', container.destinationName],
            ['Hồ sơ xe liên kết', container.assignedVehicleId ? 'Đã liên kết' : 'Chưa liên kết'],
            ['Hồ sơ tài xế liên kết', container.assignedDriverId ? 'Đã liên kết' : 'Chưa liên kết']
          ]}
        />
      </section>
      <section className="container-detail-section">
        <h3>
          <Box size={17} /> Thiết bị & tải trọng
        </h3>
        <DataGrid
          entries={[
            ['Loại container', CONTAINER_TYPES[container.containerType] || container.containerType],
            ['Mã ISO', container.isoType],
            ['Chủ sở hữu', container.ownerName],
            ['Thiết bị làm lạnh', container.isReefer ? 'Có' : 'Không'],
            ['Trọng lượng vỏ', formatNumber(container.tareWeightTons, ' tấn')],
            ['Tải trọng hàng tối đa', formatNumber(container.maxPayloadTons, ' tấn')],
            ['Thể tích', formatNumber(container.cubicCapacityM3, ' m³')]
          ]}
        />
      </section>
      <section className="container-detail-section">
        <h3 id="container-csc-section">
          <ShieldCheck size={17} /> An toàn CSC
        </h3>
        <DataGrid
          entries={[
            ['Quốc gia / cơ quan phê duyệt', container.cscApprovalCountry],
            ['Tham chiếu phê duyệt CSC', container.cscApprovalReference],
            ['Ngày sản xuất trên biển', formatDateOnly(container.cscManufactureDate)],
            [
              'Phương thức kiểm tra',
              container.cscInspectionScheme === 'PERIODIC'
                ? 'Kiểm tra định kỳ (PES)'
                : container.cscInspectionScheme === 'ACEP'
                  ? 'Chương trình ACEP'
                  : null
            ],
            ['Mã chương trình ACEP', container.cscAcepProgramNumber],
            ['Ngày kiểm tra kế tiếp', formatDateOnly(container.cscNextExaminationDate)],
            ['Tình trạng hồ sơ CSC', cscExaminationSummary(container, now)]
          ]}
        />
        <p className="container-field-hint">
          Thông tin phải được đối chiếu trực tiếp với biển CSC và hồ sơ chủ sở hữu; ngày hoặc mã
          được nhập không tự chứng minh chứng nhận còn hiệu lực.
        </p>
        {canEditCsc && <CscUpdateForm container={container} onSaved={onRefresh} actionRequest={actionRequest} />}
      </section>
      <section className="container-detail-section">
        <h3>
          <Info size={17} /> Niêm phong, IoT & vị trí
        </h3>
        <DataGrid
          entries={[
            ['Số niêm phong', seal.number],
            ['Trạng thái niêm phong', seal.number ? SEAL_LABELS[seal.status] || seal.status : null],
            ['Độ nguyên vẹn', seal.number ? formatNumber(seal.integrity, '%') : null],
            ['Lần nhận trạng thái niêm phong', formatDate(container.lastSealAt)],
            ['Thiết bị giám sát', container.telematicsModel],
            [
              'Nhiệt độ cấp / hồi',
              container.isReefer
                ? sensorReading(
                    container.supplyAirTempC,
                    ' °C',
                    container.lastSupplyAirTempAt,
                    now
                  ) +
                  ' / ' +
                  sensorReading(container.returnAirTempC, ' °C', container.lastReturnAirTempAt, now)
                : 'Không áp dụng (container khô)'
            ],
            [
              'Nhiệt độ cài đặt reefer',
              container.isReefer
                ? sensorReading(
                    container.reeferSetPointTempC,
                    ' °C',
                    container.lastReeferSetPointAt,
                    now
                  )
                : 'Không áp dụng (container khô)'
            ],
            [
              'Cảnh báo nhiệt từ thiết bị',
              container.isReefer
                ? sensorText(
                    container.reeferTemperatureAlarmStatus,
                    container.lastReeferAlarmAt,
                    now
                  )
                : 'Không áp dụng (container khô)'
            ],
            [
              'Độ ẩm',
              container.isReefer
                ? sensorReading(container.humidityPct, '%', container.lastHumidityAt, now)
                : 'Không áp dụng'
            ],
            ['Độ rung / va đập', sensorReading(container.shockG, ' g', container.lastShockAt, now)],
            [
              'Điện mặt trời',
              sensorReading(container.solarPowerWatts, ' W', container.lastSolarPowerAt, now)
            ],
            [
              'Pin thiết bị',
              sensorReading(container.batteryPct, '%', container.lastBatteryAt, now)
            ],
            [
              'Vị trí ghi nhận',
              container.lastLocationName
                ? container.lastLocationName +
                  ' · nhận ' +
                  formatSignalAge(container.lastLocationNameAt, now)
                : null
            ],
            [
              'Tọa độ GPS',
              container.lastLatitude != null && container.lastLongitude != null
                ? container.lastLatitude + ', ' + container.lastLongitude
                : null
            ],
            [
              'Tiến độ ghi nhận',
              sensorReading(container.progressPct, '%', container.lastProgressAt, now)
            ],
            [
              'Tốc độ ghi nhận',
              sensorReading(container.speedKmh, ' km/h', container.lastSpeedAt, now)
            ],
            ['ETA ghi nhận', sensorReading(container.etaMinutes, ' phút', container.lastEtaAt, now)]
          ]}
        />
        <p className="container-field-hint">
          {hasSensorTimestamp
            ? 'Mỗi số đo có mốc nhận riêng; giá trị không có mốc thời gian không được xem là dữ liệu hiện hành. Gói telemetry tổng hợp gần nhất: ' +
              formatDate(container.lastTelemetryReceivedAt) +
              '.'
            : 'Chưa có mốc nhận riêng cho cảm biến; các số đo đã lưu không được xem là dữ liệu hiện hành. Xem trạng thái kết nối trước khi quyết định.'}
        </p>
      </section>
      <ShipmentPlan
        container={container}
        shipment={shipment}
        state={shipmentState}
        error={shipmentError}
        items={items}
        manifestState={manifestState}
        now={now}
      />
      <section className="container-detail-section">
        <h3>
          <ClipboardCheck size={17} /> Bàn giao & hồ sơ
        </h3>
        <DataGrid
          entries={[
            ['Hoàn tất giao hàng', formatDate(container.completedAt)],
            ['Người nhận ePOD', container.epodRecipient],
            ['Chữ ký ePOD', container.epodSignature ? 'Đã lưu chữ ký' : 'Chưa ghi nhận'],
            ['Ghi chú giao hàng', container.epodNotes],
            ['Ngày tạo hồ sơ', formatDate(container.createdAt)],
            ['Cập nhật hồ sơ', formatDate(container.updatedAt)]
          ]}
        />
      </section>
    </div>
  );
}

function Manifest({ items, state, error, onRetry, onAdd, canAdd, canManage, container, hubs }) {
  const [showOtherShipments, setShowOtherShipments] = useState(false);
  const shipment = container.assignedShipmentCode;
  const visibleItems =
    shipment && !showOtherShipments
      ? items.filter((item) => item.shipmentCode === shipment)
      : items;
  const otherShipmentsCount = shipment
    ? items.filter((item) => item.shipmentCode !== shipment).length
    : 0;
  const parcels = visibleItems.reduce((sum, item) => sum + Number(item.parcelCount || 0), 0);
  const weight = visibleItems.reduce((sum, item) => sum + Number(item.weightKg || 0), 0);

  return (
    <section className="container-manifest" aria-label="Danh sách hàng hóa">
      <div className="container-manifest-heading">
        <div>
          <h3>
            {shipment && !showOtherShipments ? 'Hàng hóa · ' + shipment : 'Manifest container'}
          </h3>
          <p>
            {state === 'ready'
              ? visibleItems.length +
                ' mã hàng · ' +
                formatNumber(parcels, ' kiện') +
                ' · ' +
                formatNumber(weight, ' kg')
              : 'Manifest theo từng mã sản phẩm'}
          </p>
        </div>
        {canManage && (
          <button className="btn btn-secondary" type="button" onClick={onAdd} disabled={!canAdd}>
            <Plus size={16} /> Thêm mặt hàng
          </button>
        )}
      </div>
      {canManage && !canAdd && (
        <p className="container-field-hint">Thêm hàng vào hồ sơ trước khi xác nhận Chuẩn bị.</p>
      )}
      {state === 'ready' && otherShipmentsCount > 0 && (
        <button
          type="button"
          className="container-text-button"
          aria-pressed={showOtherShipments}
          onClick={() => setShowOtherShipments(!showOtherShipments)}
        >
          {showOtherShipments
            ? 'Chỉ xem vận đơn hiện tại'
            : `Xem thêm ${otherShipmentsCount} mã hàng thuộc vận đơn khác`}
        </button>
      )}
      {state === 'loading' ? (
        <p className="container-empty" role="status">
          Đang tải hàng hóa…
        </p>
      ) : state === 'error' ? (
        <div className="container-notice container-notice-error" role="alert">
          {error}
          <button type="button" className="container-text-button" onClick={onRetry}>
            Thử lại manifest
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="container-empty">
          <Package size={28} />
          <h3>Chưa có hàng hóa</h3>
          <p>Thêm mã hàng để xác định container đang vận chuyển gì và giao đến đâu.</p>
        </div>
      ) : (
        <div className="container-cargo-list">
          {visibleItems.map((item) => {
            const products = getManifestProducts(item);
            const categoryMeta = CARGO_CATEGORY_META[item.cargoCategory] || {
              label: item.cargoCategory || 'Hàng tổng hợp',
              shortLabel: item.cargoCategory || 'GENERAL',
              tone: 'neutral'
            };
            const statusMeta = CARGO_STATUS_META[item.dispatchStatus] || {
              label: CARGO_STATUSES[item.dispatchStatus] || item.dispatchStatus || 'Chưa ghi nhận',
              tone: 'neutral'
            };
            const hubInfo = hubs.find((hub) => hub.hubCode === item.hubCode);

            return (
              <article
                key={item.id || item.itemCode}
                className="container-cargo-item container-cargo-card"
              >
                {/* Header ribbon with Waybill badge, Status badge & Cargo Name */}
                <header className="container-cargo-card-header">
                  <div className="container-cargo-title-group">
                    <div className="container-cargo-tag-row">
                      <span
                        className="container-code container-badge-waybill"
                        title="Mã vận đơn bưu kiện (Waybill)"
                      >
                        <Barcode size={13} />
                        {item.itemCode}
                      </span>
                      <span
                        className={
                          'container-cargo-status container-badge-status container-status-' +
                          statusMeta.tone
                        }
                      >
                        <span className="container-status-dot" aria-hidden="true" />
                        {statusMeta.label}
                      </span>
                      {item.requiresColdChain ? (
                        <span className="container-badge-cold">
                          <Snowflake size={12} />
                          Chuỗi lạnh · {formatNumber(item.requiredTempC, ' °C')}
                        </span>
                      ) : (
                        <span className="container-badge-normal">
                          <ShieldCheck size={12} />
                          Hàng thường
                        </span>
                      )}
                    </div>
                    <h4 className="container-cargo-main-title">{item.cargoName}</h4>
                  </div>
                </header>

                {/* Quick Specs HUD Bar */}
                <div className="container-cargo-specs-bar">
                  <div className="container-spec-pill">
                    <span className="spec-label">Phân loại hàng hóa</span>
                    <span className="spec-val">
                      <Package size={13} className="text-emerald-500" />
                      {categoryMeta.label}
                    </span>
                  </div>
                  <div className="container-spec-pill">
                    <span className="spec-label">Quy cách & Tổng kiện</span>
                    <span className="spec-val">
                      <Boxes size={13} className="text-blue-400" />
                      {formatNumber(item.parcelCount, ' kiện')}
                    </span>
                  </div>
                  <div className="container-spec-pill">
                    <span className="spec-label">Tổng khối lượng</span>
                    <span className="spec-val font-semibold">
                      {formatNumber(item.weightKg, ' kg')}
                    </span>
                  </div>
                  <div className="container-spec-pill">
                    <span className="spec-label">Cam kết SLA giao nhận</span>
                    <span className="spec-val">
                      <Clock size={13} className="text-amber-400" />
                      {item.slaWindow || 'Theo thỏa thuận'}
                    </span>
                  </div>
                </div>

                {/* DETAILED PRODUCTS & SKU BREAKDOWN PANEL */}
                <section
                  className="container-sku-panel"
                  aria-label={'Chi tiết mã SKU sản phẩm ' + item.itemCode}
                >
                  <div className="container-sku-header">
                    <div className="container-sku-title">
                      <Boxes size={15} />
                      <h5>Danh mục sản phẩm & mã SKU chi tiết</h5>
                      <span className="container-sku-counter">{products.length} mặt hàng</span>
                    </div>
                    <span className="container-sku-hint">
                      Mã định danh SKU, Barcode & Quy cách đóng gói kiểm soát
                    </span>
                  </div>

                  <div className="container-sku-table-wrap">
                    <table className="container-sku-table">
                      <thead>
                        <tr>
                          <th scope="col">Mã SKU / Barcode</th>
                          <th scope="col">Tên sản phẩm & Quy cách</th>
                          <th scope="col">Phân loại & Lô SX</th>
                          <th scope="col" className="text-right">
                            Số lượng
                          </th>
                          <th scope="col" className="text-right">
                            Khối lượng
                          </th>
                          <th scope="col">Bảo quản</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p, idx) => (
                          <tr key={p.skuCode || idx}>
                            <td>
                              <div className="sku-code-cell">
                                <span className="sku-tag">{p.skuCode}</span>
                                {p.barcode && (
                                  <span className="sku-barcode" title="Mã vạch EAN/Barcode">
                                    <Barcode size={11} /> {p.barcode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="sku-name-cell">
                                <span className="sku-name">{p.name}</span>
                                {p.spec && <span className="sku-spec">{p.spec}</span>}
                              </div>
                            </td>
                            <td>
                              <div className="sku-meta-cell">
                                <span className="sku-category-tag">{p.category}</span>
                                {p.lotNumber && <span className="sku-lot">Lô: {p.lotNumber}</span>}
                              </div>
                            </td>
                            <td className="text-right">
                              <span className="sku-qty-badge">
                                {p.quantity} {p.unit || 'kiện'}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="sku-weight-cell">
                                <span className="font-medium">
                                  {formatNumber(p.weightKg, ' kg')}
                                </span>
                                {p.unitWeight && (
                                  <span className="sku-unit-weight">{p.unitWeight}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={
                                  'sku-storage-tag ' + (item.requiresColdChain ? 'cold' : 'dry')
                                }
                              >
                                {item.requiresColdChain ? (
                                  <Snowflake size={11} />
                                ) : (
                                  <ShieldCheck size={11} />
                                )}
                                {p.storageCondition ||
                                  (item.requiresColdChain ? 'Chuỗi lạnh' : 'Nhiệt độ phòng')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* LOGISTICS & DESTINATION CARDS GRID */}
                <div className="container-cargo-logistics-grid">
                  {/* Subcard 1: Hub & Vận tải */}
                  <div className="container-logistics-subcard">
                    <div className="subcard-title">
                      <Building2 size={14} />
                      <span>Cơ sở tiếp nhận & Vận tải</span>
                    </div>
                    <div className="subcard-content">
                      <div className="subcard-row">
                        <span className="subcard-label">Cơ sở tiếp nhận</span>
                        <span className="subcard-value font-medium">
                          {hubInfo?.hubName || item.hubCode || 'Trụ sở phân phối'}
                        </span>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Mã cơ sở / Vận đơn container</span>
                        <div className="subcard-tags">
                          <span className="subcard-pill hub">{item.hubCode}</span>
                          <span className="subcard-pill shipment">{item.shipmentCode}</span>
                        </div>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Đơn vị vận chuyển container</span>
                        <span className="subcard-value">
                          {container.responsibleCompanyName || 'Chưa có dữ liệu'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subcard 2: Người nhận & Tuyến giao */}
                  <div className="container-logistics-subcard">
                    <div className="subcard-title">
                      <MapPin size={14} />
                      <span>Người nhận & Điểm giao hàng</span>
                    </div>
                    <div className="subcard-content">
                      <div className="subcard-row">
                        <span className="subcard-label">Người nhận hàng</span>
                        <span className="subcard-value font-medium highlight-recipient">
                          {item.consigneeName || 'Chưa ghi nhận'}
                        </span>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Điện thoại liên hệ</span>
                        <span className="subcard-value phone-value">
                          <Phone size={12} /> {item.consigneePhone || 'Chưa ghi nhận'}
                        </span>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Tuyến phụ trách & Địa chỉ</span>
                        <div className="subcard-address-block">
                          {item.deliveryZoneName && (
                            <span className="zone-pill">{item.deliveryZoneName}</span>
                          )}
                          <span className="address-text">
                            {item.deliveryAddress || 'Chưa ghi nhận'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subcard 3: Điều phối Shipper */}
                  <div className="container-logistics-subcard">
                    <div className="subcard-title">
                      <UserCheck size={14} />
                      <span>Điều phối Shipper chặng cuối</span>
                    </div>
                    <div className="subcard-content">
                      <div className="subcard-row">
                        <span className="subcard-label">Shipper phụ trách</span>
                        <span className="subcard-value font-medium">
                          {item.assignedShipperName ? (
                            <span className="shipper-name-tag">
                              {item.assignedShipperName} ({item.assignedShipperCode})
                            </span>
                          ) : (
                            <span className="text-muted">Chưa phân công</span>
                          )}
                        </span>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Tiêu chí phân bổ</span>
                        <span className="subcard-value text-xs text-muted">
                          {item.dispatchReason || 'Tự động tối ưu khoảng cách tới điểm giao'}
                        </span>
                      </div>
                      <div className="subcard-row">
                        <span className="subcard-label">Trạng thái xử lý</span>
                        <span className="subcard-value">
                          <span className={'subcard-status-pill ' + statusMeta.tone}>
                            {statusMeta.label}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible SLA & Pod Details */}
                <details className="container-cargo-advanced-details">
                  <summary>Thông tin giao nhận & SLA</summary>
                  <div className="container-advanced-grid">
                    <DataGrid
                      entries={[
                        [
                          'Tọa độ điểm giao',
                          item.deliveryLat != null && item.deliveryLng != null
                            ? item.deliveryLat + ', ' + item.deliveryLng
                            : null
                        ],
                        ['Cam kết giao (SLA)', item.slaWindow],
                        ['Shipper được giao', item.assignedShipperName],
                        ['Mã shipper', item.assignedShipperCode],
                        ['Thời điểm phân công', formatDate(item.assignedAt)],
                        ['Thời điểm giao', formatDate(item.deliveredAt)],
                        ['Người ký nhận', item.recipientPodName],
                        ['Khoảng cách phân công', formatNumber(item.proximityDistanceKm, ' km')],
                        ['Điểm khớp phân bổ', item.matchScore ? item.matchScore + ' %' : null],
                        ['Lý do phân công', item.dispatchReason]
                      ]}
                    />
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function ContainerDetails({
  container,
  items,
  manifestState,
  manifestError,
  onRetryManifest,
  onAddItem,
  manifestEditor,
  canManage,
  role,
  now,
  synchronization,
  onRefresh,
  hubs = [],
  companies = []
}) {
  const [tab, setTab] = useState('overview');
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState(null);
  const detailRoot = useRef(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [journalVersion, setJournalVersion] = useState(0);
  const [profileLocked, setProfileLocked] = useState(
    !['AVAILABLE', 'MAINTENANCE', 'ASSIGNED'].includes(container.status)
  );
  useEffect(() => {
    let active = true;
    setProfileLocked(!['AVAILABLE', 'MAINTENANCE', 'ASSIGNED'].includes(container.status));
    if (
      ['AVAILABLE', 'MAINTENANCE', 'ASSIGNED'].includes(container.status) &&
      typeof api.getContainerControl === 'function'
    ) {
      Promise.resolve(api.getContainerControl(container.containerCode))
        .then((response) => {
          if (
            active &&
            response?.result?.stages?.some(
              (stage) => stage.stage === 'PREPARATION' && stage.completedAt
            ) &&
            !response.result.completedAt
          )
            setProfileLocked(true);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [container.containerCode, container.status]);
  const changeTab = (id) => {
    setTab(id);
    requestAnimationFrame(() => {
      document.querySelector('.dispatch-content-scroll')?.scrollTo?.({ top: 0 });
      document.querySelector('.dispatch-workbench-layout')?.scrollTo?.({ top: 0 });
    });
  };
  const openAction = (target) => {
    if (target === 'safety') {
      window.location.assign('/container-inspections?container=' + encodeURIComponent(container.containerCode));
      return;
    }
    if (target === 'assignment' && container.status === 'IN_TRANSIT') target = 'trip-link';
    const tabs = { csc: 'overview', assignment: 'control', 'trip-link': 'connection', device: 'connection', seal: 'profile', cold: 'connection', handover: 'control' };
    const destination = tabs[target] || target;
    setNoteOpen(false);
    if (destination === 'profile') setEditorOpen(true);
    else {
      setEditorOpen(false);
      changeTab(destination);
      if (destination === 'manifest' && canManage && ['AVAILABLE', 'ASSIGNED'].includes(container.status))
        onAddItem();
    }
    setActionRequest((current) => ({ target, id: (current?.id || 0) + 1 }));
  };
  useEffect(() => {
    if (!actionRequest) return;
    const root = detailRoot.current;
    let observer;
    const frame = requestAnimationFrame(() => {
      const focusTarget = () => {
        const target = root?.querySelector('[data-container-focus="' + actionRequest.target + '"]');
        if (!target) return false;
        const editable = target.querySelector('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
        const focus = editable || target;
        if (!editable) target.setAttribute('tabindex', '-1');
        target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
        focus.focus({ preventScroll: true });
        observer?.disconnect();
        return true;
      };
      if (!focusTarget() && root) {
        observer = new MutationObserver(focusTarget);
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-container-focus'] });
      }
    });
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [actionRequest]);
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [shipmentState, setShipmentState] = useState('idle');
  const [shipmentError, setShipmentError] = useState('');
  useEffect(() => {
    let active = true;
    if (!container.assignedShipmentId || typeof api.getShipmentById !== 'function') {
      setShipment(null);
      setShipmentState('idle');
      setShipmentError('');
      return undefined;
    }
    setShipment(null);
    setShipmentState('loading');
    setShipmentError('');
    api
      .getShipmentById(container.assignedShipmentId)
      .then((response) => {
        if (!active) return;
        const result = response?.result ?? response;
        setShipment(result || null);
        setShipmentState(result ? 'ready' : 'error');
        if (!result) setShipmentError('Không tìm thấy thông tin vận đơn từ mã liên kết.');
      })
      .catch((failure) => {
        if (!active) return;
        setShipmentState('error');
        setShipmentError(failure.message || 'Không tải được thông tin vận đơn.');
      });
    return () => {
      active = false;
    };
  }, [container.assignedShipmentId]);
  const tabs = [
    ['overview', 'Thông tin'],
    ['manifest', 'Hàng hóa'],
    ['route', 'Lộ trình'],
    ['control', 'Kiểm soát theo đợt'],
    ['connection', 'Kết nối'],
    ['history', 'Lịch sử'],
    ['checklist', 'Checklist hồ sơ']
  ];
  const shipmentItems = container.assignedShipmentCode
    ? items.filter((item) => item.shipmentCode === container.assignedShipmentCode)
    : items;
  const checklist = buildContainerChecklist(container, shipmentItems, manifestState, now);
  const completeCount = checklist.filter((item) => item.state === 'complete').length;
  const requiredCount = checklist.filter((item) => item.state !== 'na').length;
  const demo = container.ownerName?.startsWith('CCADRO DEMO');
  const issues = containerOperationalIssues(container, now);
  const icons = {
    overview: Info,
    manifest: Package,
    route: Route,
    control: ClipboardCheck,
    connection: Radio,
    history: History,
    checklist: ShieldCheck
  };
  const weightKg = shipmentItems.reduce((total, item) => total + Number(item.weightKg || 0), 0);
  const actionForIssue = (issue) =>
    issue.key === 'company'
      ? 'profile'
      : issue.key.startsWith('csc') || issue.key.startsWith('acep')
        ? 'csc'
        : issue.key.includes('driver') ||
            issue.key.includes('vehicle') ||
            issue.key.includes('shipment') ||
            ['origin', 'destination'].includes(issue.key)
          ? 'assignment'
          : issue.key === 'seal' ? 'seal' : issue.key.startsWith('temperature') ? 'cold' : 'device';
  const checklistAction = (label) =>
    /CSC/.test(label)
      ? 'csc'
      : /Hồ sơ thiết bị|Công ty/.test(label)
        ? 'profile'
        : /Xe|Vận đơn/.test(label)
          ? 'assignment'
          : /Niêm/.test(label) ? 'seal'
            : /Chuỗi lạnh/.test(label) ? 'cold'
              : /thiết bị|GPS/.test(label) ? 'device'
                : /bàn giao/.test(label) ? 'handover' : 'manifest';

  return (
    <section ref={detailRoot} className="card container-detail-card" aria-label="Chi tiết container">
      <header className="dispatch-container-heading">
        <div className="dispatch-container-identity">
          <span className="dispatch-container-symbol">
            <Boxes size={27} />
          </span>
          <div>
            <span className="container-overline">
              ĐIỀU HÀNH CONTAINER {demo && <span className="container-demo-tag">DỮ LIỆU MẪU</span>}
            </span>
            <h2>{container.containerCode}</h2>
            <p>
              {CONTAINER_TYPES[container.containerType] || container.containerType} ·{' '}
              {container.isoType || 'Chưa có mã ISO'}
            </p>
          </div>
        </div>
        <div className="container-record-badges">
          <ContainerStatus status={container.status} />
          <ContainerConnectionBadge container={container} now={now} />
          {['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER'].includes(role) && <a
            className="btn btn-primary dispatch-safety-action"
            href={'/container-inspections?container=' + encodeURIComponent(container.containerCode)}
          ><ShieldCheck size={16} /> Kiểm tra an toàn container</a>}
          <button
            className="btn btn-secondary dispatch-summary-toggle"
            type="button"
            aria-expanded={summaryOpen}
            aria-controls="dispatch-container-summary"
            onClick={() => setSummaryOpen(!summaryOpen)}
          >
            Tổng quan <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div
        id="dispatch-container-summary"
        className="dispatch-summary-content"
        hidden={!summaryOpen}
      >
        <div className="dispatch-container-summary">
          <div>
            <span>Vận đơn hiện tại</span>
            <strong>
              <Package size={15} />
              {container.assignedShipmentCode || 'Chưa liên kết'}
            </strong>
          </div>
          <div>
            <span>Phương tiện / tài xế</span>
            <strong>{container.vehicleLicensePlate || 'Chưa phân công'}</strong>
            <small>{container.driverName || 'Chưa có tài xế'}</small>
          </div>
          <div>
            <span>Hàng trên vận đơn</span>
            <strong>
              {manifestState === 'ready' ? formatNumber(weightKg, ' kg') : 'Đang xác minh'}
            </strong>
            <small>
              {manifestState === 'ready'
                ? shipmentItems.length + ' dòng hàng'
                : 'Chờ dữ liệu manifest'}
            </small>
          </div>
          <div>
            <span>Độ đầy đủ hồ sơ</span>
            <strong>
              {completeCount}
              <em> / {requiredCount} mục</em>
            </strong>
            <div className="dispatch-completion-bar">
              <span
                style={{
                  width: requiredCount ? (completeCount / requiredCount) * 100 + '%' : '0%'
                }}
              />
            </div>
          </div>
        </div>
        <div className="dispatch-route-strip">
          <MapPin size={15} />
          <span>{container.originName || 'Chưa có điểm đi'}</span>
          <span aria-hidden="true">→</span>
          <strong>{container.destinationName || 'Chưa có điểm đến'}</strong>
          <span className="dispatch-route-last">
            {container.lastLocationName || 'Chưa có vị trí ghi nhận'}
          </span>
        </div>
      </div>
      <div className="dispatch-workbench-layout">
        <div className="dispatch-main-column">
          <div className="container-tabs" role="tablist" aria-label="Thông tin container">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={'container-tab-' + id}
                aria-label={label}
                aria-selected={tab === id}
                aria-controls={'container-panel-' + id}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => changeTab(id)}
                onKeyDown={(event) => {
                  const ids = tabs.map(([key]) => key);
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? ids.length - 1
                        : (ids.indexOf(id) + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) %
                          ids.length;
                  changeTab(ids[next]);
                  document.getElementById('container-tab-' + ids[next])?.focus();
                }}
              >
                {React.createElement(icons[id], { size: 15 })}
                {label}
                {id === 'manifest' && <span className="dispatch-tab-count">{items.length}</span>}
              </button>
            ))}
          </div>
          <div
            className="container-tab-panel dispatch-content-scroll"
            data-container-focus={['route', 'manifest'].includes(actionRequest?.target) && tab === actionRequest.target ? actionRequest.target : undefined}
            role="tabpanel"
            id={'container-panel-' + tab}
            aria-labelledby={'container-tab-' + tab}
          >
            {tab === 'overview' && (
              <>
                <section className="dispatch-priority-panel" aria-label="Việc cần xử lý">
                  <div className="dispatch-section-heading">
                    <div>
                      <span className="container-overline">ƯU TIÊN VẬN HÀNH</span>
                      <h3>
                        {issues.length
                          ? issues.length + ' điểm cần chú ý'
                          : 'Rà soát trước khi điều phối'}
                      </h3>
                    </div>
                    <span
                      className={'dispatch-priority-count' + (issues.length ? ' has-issues' : '')}
                    >
                      <AlertTriangle size={15} />
                      {issues.length || 'Hồ sơ'}
                    </span>
                  </div>
                  {issues.length > 0 ? (
                    <div className="dispatch-priority-items">
                      {issues.slice(0, 5).map((issue) => (
                        <button
                          type="button"
                          key={issue.key}
                          onClick={() => {
                            openAction(actionForIssue(issue));
                          }}
                        >
                          <span className="dispatch-issue-dot" />
                          <span>{issue.label}</span>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                      {issues.length > 5 && (
                        <button
                          type="button"
                          className="dispatch-priority-more"
                          onClick={() => changeTab('checklist')}
                        >
                          Rà soát các mục hồ sơ <ArrowUpRight size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p>
                      Kiểm tra hồ sơ, hàng hóa và điều kiện phân công trước khi xác nhận các bước
                      kiểm soát.
                    </p>
                  )}
                </section>
                <div className="container-checklist-preview">
                  <ClipboardCheck size={20} />
                  <div>
                    <strong>
                      {completeCount}/{requiredCount} mục hồ sơ đã có thông tin
                    </strong>
                    <p>Xem các mục còn thiếu trước khi điều phối.</p>
                  </div>
                  <button
                    type="button"
                    className="container-text-button"
                    onClick={() => setTab('checklist')}
                  >
                    Xem checklist
                  </button>
                </div>
                <Overview
                  container={container}
                  shipment={shipment}
                  shipmentState={shipmentState}
                  shipmentError={shipmentError}
                  items={items}
                  manifestState={manifestState}
                  now={now}
                  canEditCsc={['ADMIN', 'DISPATCHER', 'SAFETY_MANAGER'].includes(role)}
                  actionRequest={actionRequest}
                  onRefresh={onRefresh}
                />
                <ContainerDispatchJournal
                  code={container.containerCode}
                  version={journalVersion}
                  canManage={canManage}
                  onAdd={() => {
                    setNoteOpen(true);
                    setEditorOpen(false);
                  }}
                />
              </>
            )}
            {tab === 'manifest' && manifestEditor}
            {tab === 'manifest' && !manifestEditor && (
              <Manifest
                items={items}
                state={manifestState}
                error={manifestError}
                onRetry={onRetryManifest}
                onAdd={onAddItem}
                {...{ container, hubs, canManage }}
                canAdd={['AVAILABLE', 'ASSIGNED'].includes(container.status)}
              />
            )}
            {tab === 'route' && (
              <ContainerRoutePlanner
                container={container}
                shipment={shipment}
                shipmentState={shipmentState}
                canManage={['ADMIN', 'DISPATCHER'].includes(role)}
                actorName={user?.username || user?.fullName}
              />
            )}
            {tab === 'control' && (
              <ContainerControlPanel
                actionRequest={actionRequest}
                {...{ container, role, canManage, onRefresh, manifestState, items, onAddItem }}
                onSelectTab={changeTab}
              />
            )}
            {tab === 'connection' && (
              <ContainerConnection
                actionRequest={actionRequest}
                {...{ container, now, synchronization }}
                canManage={canManage}
                onRefresh={onRefresh}
                onSelectTab={changeTab}
              />
            )}
            {tab === 'history' && (
              <TransportHistory resource="containers" subjectId={container.containerCode} />
            )}
            {tab === 'checklist' && (
              <section className="container-checklist">
                <h3>Kiểm tra mức độ đầy đủ của hồ sơ</h3>
                <p className="container-field-hint">
                  Đây là kiểm tra dữ liệu đã nhập, không thay thế biên bản an toàn trước chuyến,
                  duyệt xuất bến hoặc kiểm định chuỗi lạnh.
                </p>
                <ul>
                  {checklist.map((item) => (
                    <li key={item.label} className={'container-check-' + item.state}>
                      {item.state === 'complete' ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Circle size={20} />
                      )}
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.detail}</p>
                      </div>
                      {canManage && item.state !== 'na' && (
                        <button
                          type="button"
                          className="container-text-button"

                          onClick={() => {
                            openAction(checklistAction(item.label));
                          }}
                        >
                          {item.state === 'complete' ? 'Xem / chỉnh sửa' : 'Bổ sung'} <ArrowUpRight size={13} />
                        </button>
                      )}
                      <span>
                        {
                          {
                            complete: 'Đã có thông tin',
                            missing: 'Cần bổ sung',
                            unknown: 'Chưa xác định',
                            na: 'Không áp dụng'
                          }[item.state]
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
        <ContainerActionDesk
          {...{
            container,
            now,
            canManage,
            tab,
            onAddItem,
            onRefresh,
            editorOpen,
            setEditorOpen,
            profileLocked,
            noteOpen,
            setNoteOpen
          }}
          onNoteSaved={() => {
            setJournalVersion((value) => value + 1);
            changeTab('overview');
          }}
          companies={companies}
          actionRequest={actionRequest}
          onAction={openAction}
          setTab={changeTab}
          onSaved={onRefresh}
        />
      </div>
    </section>
  );
}
