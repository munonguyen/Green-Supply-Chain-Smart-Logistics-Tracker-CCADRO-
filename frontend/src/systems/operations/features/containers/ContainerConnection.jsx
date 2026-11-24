import React from 'react';
import ContainerDeviceConnection from './ContainerDeviceConnection';
import ContainerWirelessGuide from './ContainerWirelessGuide';
import { Radio, MapPin } from 'lucide-react';
import { formatDate, formatNumber } from './containerPresentation';

// Operational defaults, not an industry connectivity standard. Tune for device reporting cadence.
export const SIGNAL_POLICY = { freshMs: 120000, missingMs: 600000 };
export function signalFreshness(timestamp, now = Date.now()) {
  if (!timestamp) return { key: 'unknown', label: 'Chưa có tín hiệu', tone: 'muted' };
  const age = now - new Date(timestamp).getTime();
  if (!Number.isFinite(age) || age < -30000)
    return { key: 'unknown', label: 'Thời điểm chưa hợp lệ', tone: 'muted' };
  if (age <= SIGNAL_POLICY.freshMs) return { key: 'fresh', label: 'Tín hiệu mới', tone: 'green' };
  if (age <= SIGNAL_POLICY.missingMs)
    return { key: 'delayed', label: 'Chậm tín hiệu', tone: 'amber' };
  return { key: 'missing', label: 'Mất cập nhật', tone: 'amber' };
}

export function formatSignalAge(timestamp, now = Date.now()) {
  if (!timestamp) return 'Chưa có thời điểm nhận';
  const ageMs = now - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < -30000) return 'Thời điểm chưa hợp lệ';
  if (ageMs < 60000) return 'Vừa nhận';
  if (ageMs < 3600000) return Math.floor(ageMs / 60000) + ' phút trước';
  if (ageMs < 86400000) return Math.floor(ageMs / 3600000) + ' giờ trước';
  return Math.floor(ageMs / 86400000) + ' ngày trước';
}

export function containerOperationalIssues(container, now = Date.now()) {
  const issues = [];
  const activeTrip = ['ASSIGNED', 'IN_TRANSIT'].includes(container.status);
  if (activeTrip) {
    if (!container.responsibleCompanyName) {
      issues.push({ key: 'company', label: 'Chưa có đơn vị phụ trách' });
    }
    if (!container.vehicleLicensePlate) issues.push({ key: 'vehicle', label: 'Chưa có xe' });
    else if (!container.assignedVehicleId)
      issues.push({ key: 'vehicle-link', label: 'Xe chưa liên kết hồ sơ' });
    if (!container.driverName) issues.push({ key: 'driver', label: 'Chưa có tài xế' });
    else if (!container.assignedDriverId)
      issues.push({ key: 'driver-link', label: 'Tài xế chưa liên kết hồ sơ' });
    if (!container.assignedShipmentCode) issues.push({ key: 'shipment', label: 'Chưa có vận đơn' });
    else if (!container.assignedShipmentId)
      issues.push({ key: 'shipment-link', label: 'Vận đơn chưa liên kết hồ sơ' });
    if (!container.originName) issues.push({ key: 'origin', label: 'Chưa có điểm đi' });
    if (!container.destinationName) issues.push({ key: 'destination', label: 'Chưa có điểm đến' });
    if (
      !container.cscApprovalCountry ||
      !container.cscApprovalReference ||
      !container.cscInspectionScheme
    ) {
      issues.push({ key: 'csc-record', label: 'Thiếu thông tin biển CSC' });
    }
  }

  if (container.status === 'IN_TRANSIT') {
    const telemetry = signalFreshness(container.lastTelemetryReceivedAt, now);
    if (telemetry.key !== 'fresh') {
      issues.push({
        key: 'telemetry',
        label:
          telemetry.key === 'unknown' ? 'Chưa có tín hiệu thiết bị' : `Thiết bị: ${telemetry.label}`
      });
    }
    const position = signalFreshness(container.lastPositionReceivedAt, now);
    if (position.key !== 'fresh') {
      issues.push({
        key: 'position',
        label: position.key === 'unknown' ? 'Chưa có GPS' : `GPS: ${position.label}`
      });
    }
    const eta = signalFreshness(container.lastEtaAt, now);
    if (eta.key !== 'fresh') {
      issues.push({
        key: 'eta',
        label:
          eta.key === 'unknown'
            ? 'Chưa có ETA cập nhật'
            : `ETA: ${eta.label.toLocaleLowerCase('vi')}`
      });
    }
    if (container.isReefer) {
      if (container.supplyAirTempC == null || container.returnAirTempC == null) {
        issues.push({ key: 'temperature', label: 'Thiếu dữ liệu nhiệt' });
      } else {
        const supply = signalFreshness(container.lastSupplyAirTempAt, now);
        const returnAir = signalFreshness(container.lastReturnAirTempAt, now);
        if (supply.key !== 'fresh' || returnAir.key !== 'fresh') {
          issues.push({
            key: 'temperature-age',
            label:
              supply.key === 'unknown' || returnAir.key === 'unknown'
                ? 'Nhiệt độ chưa có mốc cập nhật'
                : 'Nhiệt độ: cập nhật chậm'
          });
        }
      }
      if (container.reeferSetPointTempC == null) {
        issues.push({ key: 'temperature-setpoint', label: 'Chưa có nhiệt độ cài đặt reefer' });
      } else if (signalFreshness(container.lastReeferSetPointAt, now).key !== 'fresh') {
        issues.push({ key: 'temperature-setpoint-age', label: 'Nhiệt độ cài đặt chưa có mốc mới' });
      }
      const alarmStatus = String(container.reeferTemperatureAlarmStatus || '')
        .trim()
        .toUpperCase();
      if (!alarmStatus) {
        issues.push({ key: 'temperature-alarm', label: 'Chưa có trạng thái cảnh báo nhiệt' });
      } else if (signalFreshness(container.lastReeferAlarmAt, now).key !== 'fresh') {
        issues.push({ key: 'temperature-alarm-age', label: 'Cảnh báo nhiệt chưa có mốc mới' });
      } else if (!['NORMAL', 'OK', 'CLEAR', 'NO_ALARM'].includes(alarmStatus)) {
        issues.push({
          key: 'temperature-alarm-review',
          label: 'Trạng thái cảnh báo nhiệt cần kiểm tra'
        });
      }
    }
  }

  const sealStatus = String(container.eSealStatus ?? container.esealStatus ?? '').toUpperCase();
  if (['TAMPERED', 'BROKEN'].includes(sealStatus)) {
    issues.push({ key: 'seal', label: 'Niêm phong bất thường' });
  }

  if (container.cscInspectionScheme === 'PERIODIC') {
    if (!container.cscNextExaminationDate) {
      issues.push({ key: 'csc-exam', label: 'Thiếu ngày kiểm tra CSC' });
    } else {
      const current = new Date(now);
      const today = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      if (String(container.cscNextExaminationDate).slice(0, 10) < today) {
        issues.push({ key: 'csc-expired', label: 'CSC đã quá hạn kiểm tra' });
      }
    }
  } else if (container.cscInspectionScheme === 'ACEP' && !container.cscAcepProgramNumber) {
    issues.push({ key: 'acep-number', label: 'Thiếu mã chương trình ACEP' });
  }
  return issues;
}

export function ContainerConnectionBadge({ container, now = Date.now() }) {
  const signal = signalFreshness(container.lastTelemetryReceivedAt, now);
  return (
    <span
      className={'container-status container-tone-' + signal.tone}
      title={'Tín hiệu theo dõi nhận lúc: ' + formatDate(container.lastTelemetryReceivedAt)}
    >
      <span aria-hidden="true" />
      {signal.label}
    </span>
  );
}

export default function ContainerConnection({
  container,
  now,
  synchronization = {},
  canManage,
  onRefresh,
  onSelectTab,
  actionRequest
}) {
  const position = signalFreshness(container.lastPositionReceivedAt, now);
  const unsynced = ['error', 'offline'].includes(synchronization.state);
  return (
    <section className="container-connection" aria-label="Kết nối và giám sát">
      <div className="dispatch-connection-intro">
        <span className="dispatch-connection-icon">
          <Radio size={23} />
        </span>
        <div>
          <span className="container-overline">GIÁM SÁT THIẾT BỊ</span>
          <h3>Kết nối & tín hiệu</h3>
          <p>Kiểm tra riêng mốc nhận thiết bị và vị trí GPS trước khi xử lý.</p>
        </div>
      </div>
      {canManage && <ContainerDeviceConnection {...{ container, now, onRefresh, onSelectTab, actionRequest }} />}
      <ContainerWirelessGuide />
      {actionRequest?.target === 'cold' && (
        <p className="container-notice" data-container-focus="cold" tabIndex={-1}>
          Nhiệt độ thực tế được nhận từ thiết bị. Kiểm tra tín hiệu bên dưới; nhiệt độ yêu cầu của hàng được khai báo trong tab Hàng hóa.
        </p>
      )}
      <div className="container-connection-grid">
        <article>
          <h3>
            <Radio size={18} /> Tín hiệu theo dõi
          </h3>
          <ContainerConnectionBadge container={container} now={now} />
          <dl className="container-data-grid">
            <div>
              <dt>Thiết bị giám sát</dt>
              <dd>{container.telematicsModel || 'Chưa khai báo'}</dd>
            </div>
            <div>
              <dt>Lần nhận tín hiệu gần nhất</dt>
              <dd>{formatDate(container.lastTelemetryReceivedAt)}</dd>
            </div>
            <div>
              <dt>Pin thiết bị</dt>
              <dd>
                {container.batteryPct == null
                  ? 'Chưa có dữ liệu'
                  : formatNumber(container.batteryPct, '%') +
                    ' · ' +
                    formatSignalAge(container.lastBatteryAt, now)}
              </dd>
            </div>
            <div>
              <dt>Niêm phong điện tử</dt>
              <dd>{container.esealNumber || container.eSealNumber || 'Chưa khai báo'}</dd>
            </div>
            <div>
              <dt>Lần nhận trạng thái niêm phong</dt>
              <dd>{formatDate(container.lastSealAt)}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h3>
            <MapPin size={18} /> Cập nhật vị trí GPS
          </h3>
          <span className={'container-status container-tone-' + position.tone}>
            <span />
            {position.label}
          </span>
          <dl className="container-data-grid">
            <div>
              <dt>Vị trí ghi nhận</dt>
              <dd>{container.lastLocationName || 'Chưa ghi nhận'}</dd>
            </div>
            <div>
              <dt>Lần nhận tọa độ gần nhất</dt>
              <dd>{formatDate(container.lastPositionReceivedAt)}</dd>
            </div>
            <div>
              <dt>Lần cập nhật ETA</dt>
              <dd>{formatDate(container.lastEtaAt)}</dd>
            </div>
            <div>
              <dt>Tọa độ ghi nhận</dt>
              <dd>
                {container.lastLatitude != null && container.lastLongitude != null
                  ? `${container.lastLatitude}, ${container.lastLongitude}`
                  : 'Chưa ghi nhận'}
              </dd>
            </div>
            <div>
              <dt>Tốc độ ghi nhận</dt>
              <dd>{formatNumber(container.speedKmh, ' km/h')}</dd>
            </div>
          </dl>
        </article>
      </div>
      {unsynced && (
        <p className="container-notice" role="status">
          {synchronization.state === 'offline'
            ? 'Trình duyệt đang ngoại tuyến.'
            : 'Chưa đồng bộ được dữ liệu mới.'}{' '}
          Đang hiển thị dữ liệu đã tải; chưa thể xác nhận tình trạng thiết bị hiện tại.
        </p>
      )}
      <details className="dispatch-device-instructions">
        <summary>Cách đọc trạng thái tín hiệu</summary>
        <p className="container-field-hint">
          Tự kiểm tra cập nhật mỗi 30 giây khi trang đang mở. Tín hiệu mới: tối đa 2 phút; chậm tín
          hiệu: trên 2 đến 10 phút; mất cập nhật: trên 10 phút. Đây là ngưỡng vận hành mặc định, cần
          điều chỉnh theo chu kỳ gửi của thiết bị. Không nhận tín hiệu chưa đủ để kết luận thiết bị
          đã mất kết nối mạng.
        </p>
        <p className="container-field-hint">
          Thời điểm trên là lúc hệ thống nhận dữ liệu từ luồng telemetry. Môi trường mô phỏng có thể
          gửi tín hiệu từ cổng tài xế. Tín hiệu cảm biến mới không đồng nghĩa có vị trí GPS mới; dữ
          liệu cũ và dữ liệu chưa có thời điểm nhận được giữ nguyên để tra cứu.
        </p>
        {container.isReefer && (
          <p className="container-field-hint">
            Thời điểm cấp, hồi và độ ẩm được lưu riêng theo từng gói cảm biến; dữ liệu hiện có chưa
            khai báo nhiệt độ cài đặt hoặc lịch sử cảnh báo nhiệt.
          </p>
        )}
      </details>
    </section>
  );
}
