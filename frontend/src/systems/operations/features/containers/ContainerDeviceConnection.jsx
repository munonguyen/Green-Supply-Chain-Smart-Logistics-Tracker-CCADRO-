import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cable, Check, Copy, Link2, RefreshCw, Settings2, Unplug } from 'lucide-react';
import { api, gatewayUrl } from '../../../../services/api';
import { formatDate } from './containerPresentation';
import ContainerEditorDialog from './ContainerEditorDialog';

const forwardingLabels = {
  PENDING: 'Đang chờ chuyển GPS sang Tracking',
  RETRYING: 'Đang thử gửi lại sang Tracking',
  SENT: 'Đã chuyển GPS vào chuyến và tuyến',
  CONTAINER_ONLY: 'Đã nhận GPS container; chưa có chuyến phù hợp',
  FAILED: 'Chưa gửi được sang Tracking sau nhiều lần thử',
  OUTDATED: 'Gói tin đã cũ hoặc phân công chuyến đã thay đổi'
};

export default function ContainerDeviceConnection({ container, now, onRefresh, onSelectTab, actionRequest }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [draft, setDraft] = useState({ deviceId: '', label: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [linking, setLinking] = useState(false);
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('');
  const [linkReason, setLinkReason] = useState('');
  const load = useCallback(async () => {
    if (typeof api.getContainerDeviceConnection !== 'function') return;
    try {
      const response = await api.getContainerDeviceConnection(container.containerCode);
      setState(response?.result || null);
      setError('');
    } catch (failure) {
      setError(failure.message || 'Chưa tải được liên kết thiết bị.');
    }
  }, [container.containerCode]);
  useEffect(() => {
    load();
  }, [load, now]);
  const connection = state?.connection;
  const route = state?.route;
  const endpoint = connection
    ? gatewayUrl('/api/v1/assets/device-ingest/' + encodeURIComponent(connection.deviceId))
    : null;
  const openEditor = useCallback(() => {
    setDraft({
      deviceId: connection?.deviceId || '',
      label: connection?.label || container.telematicsModel || '',
      reason: ''
    });
    setEditing(true);
    setEditorError('');
    setError('');
    setMessage('');
    setSecret(null);
  }, [connection, container.telematicsModel]);
  const openedRequest = useRef(null);
  useEffect(() => {
    if (actionRequest?.target !== 'device' || !state || openedRequest.current === actionRequest.id) return;
    openedRequest.current = actionRequest.id;
    openEditor();
  }, [actionRequest, state, openEditor]);
  const openTripLink = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await api.getTrips({ driverId: container.assignedDriverId });
      const list = Array.isArray(response?.result) ? response.result : [];
      setTrips(list.filter((trip) =>
        ['EN_ROUTE', 'DELAYED'].includes(trip.status) && trip.activeRouteVersionId &&
        (!container.assignedShipmentId || trip.shipmentId === container.assignedShipmentId) &&
        (!container.assignedVehicleId || trip.vehicleId === container.assignedVehicleId) &&
        (!container.assignedDriverId || trip.driverId === container.assignedDriverId)));
      setLinking(true);
    } catch (failure) {
      setError(failure.message || 'Chưa tải được chuyến đang chạy.');
    } finally {
      setBusy(false);
    }
  }, [container.assignedDriverId, container.assignedShipmentId, container.assignedVehicleId]);
  const linkedRequest = useRef(null);
  useEffect(() => {
    if (actionRequest?.target !== 'trip-link' || !state || linkedRequest.current === actionRequest.id) return;
    linkedRequest.current = actionRequest.id;
    if (!route && container.status === 'IN_TRANSIT') openTripLink();
  }, [actionRequest, state, route, container.status, openTripLink]);
  return (
    <section className="dispatch-device-binding" aria-label="Liên kết thiết bị GPS và định tuyến"
      data-container-focus={actionRequest?.target === 'trip-link' && (route || error) ? 'trip-link' : undefined}>
      <div className="dispatch-section-heading">
        <div>
          <span className="container-overline">THIẾT BỊ → CONTAINER → CHUYẾN → TUYẾN</span>
          <h3>
            <Cable size={17} /> Cổng kết nối GPS
          </h3>
        </div>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={openEditor}>
          <Settings2 size={15} /> Cấu hình kết nối
        </button>
      </div>
      {error && (
        <p role="alert" className="container-notice container-notice-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="container-notice">
          {message}
        </p>
      )}
      <div className="dispatch-device-summary">
        <div>
          <span>Thiết bị đã liên kết</span>
          <strong>{connection?.deviceId || 'Chưa cấu hình'}</strong>
          <small>{connection?.label || 'Nhập mã thiết bị / IMEI / serial thực tế.'}</small>
        </div>
        <div>
          <span>Cổng nhận HTTP JSON</span>
          <strong>
            {connection
              ? connection.enabled
                ? connection.lastReceivedAt
                  ? 'Đã nhận GPS thiết bị'
                  : 'Đã bật · chờ dữ liệu thiết bị'
                : 'Đã thu hồi khóa'
              : 'Chưa được mở'}
          </strong>
          <small>
            {connection?.lastReceivedAt
              ? 'Lần nhận ' + formatDate(connection.lastReceivedAt)
              : 'Chưa nhận gói tin từ liên kết này.'}
          </small>
        </div>
        <div>
          <span>Liên kết với định tuyến</span>
          <strong>{route ? 'Đã xác định chuyến và tuyến' : 'Chưa đủ liên kết chuyến'}</strong>
          <small>
            {state?.linkageIssue || (route ? 'Chuyến ' + route.tripId : 'Đang kiểm tra…')}
          </small>
        </div>
      </div>
      {state?.latestPacket && (
        <p className="dispatch-device-receipt">
          <Link2 size={15} />
          {forwardingLabels[state.latestPacket.status] || state.latestPacket.status}
        </p>
      )}
      {!route && state && (
        <p className="container-field-hint">
          Thiết bị vẫn có thể gửi GPS vào container. Định tuyến nhận GPS khi có chuyến đang chạy,
          cùng vận đơn, xe và tài xế, với tuyến hiệu lực.
          <button
            className="container-text-button"
            type="button"
            onClick={() => onSelectTab?.('control')}
          >
            Kiểm tra phân công chuyến
          </button>
          <button
            className="container-text-button"
            type="button"
            onClick={() => onSelectTab?.('route')}
          >
            Kiểm tra tuyến
          </button>
        </p>
      )}
      {!route && state && container.status === 'IN_TRANSIT' && (
        <div className="dispatch-device-reconcile">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy}
            onClick={openTripLink}
          >
            <Link2 size={14} /> Liên kết hồ sơ chuyến đang chạy
          </button>
          {linking && (
            <form
              className="container-stage-form"
              data-container-focus="trip-link"
              aria-label="Đối soát liên kết chuyến"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
                setBusy(true);
                setError('');
                try {
                  const response = await api.linkContainerDeviceTrip(container.containerCode, {
                    tripId,
                    reason: linkReason.trim()
                  });
                  setState(response.result);
                  setLinking(false);
                  setMessage(
                    'Đã đối soát chuyến. Gói GPS tiếp theo sẽ được chuyển vào tuyến phù hợp.'
                  );
                  await onRefresh?.();
                } catch (failure) {
                  setError(failure.message || 'Chưa liên kết được chuyến.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="container-field-hint">
                Chuyến phải khớp với tài xế, xe và vận đơn đã ghi trong hồ sơ container.
              </p>
              <label className="container-field">
                <span>Chuyến đang chạy</span>
                <select
                  required
                  value={tripId}
                  disabled={busy}
                  onChange={(event) => setTripId(event.target.value)}
                >
                  <option value="">Chọn chuyến đã có tuyến hiệu lực</option>
                  {trips.map((trip) => (
                    <option value={trip.id} key={trip.id}>
                      {trip.tripCode || trip.id}
                    </option>
                  ))}
                </select>
              </label>
              {!trips.length && (
                <p>Không tìm thấy chuyến đang chạy có tuyến khớp với phân công hiện có.</p>
              )}
              <label className="container-field">
                <span>Lý do đối soát *</span>
                <input
                  required
                  maxLength={500}
                  value={linkReason}
                  disabled={busy}
                  onChange={(event) => setLinkReason(event.target.value)}
                />
              </label>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={busy || !tripId || !linkReason.trim()}
              >
                Lưu liên kết chuyến
              </button>
              <button
                className="container-text-button"
                type="button"
                onClick={() => setLinking(false)}
                disabled={busy}
              >
                Đóng
              </button>
            </form>
          )}
        </div>
      )}
      {editing && (
        <ContainerEditorDialog
          title="Cấu hình kết nối GPS"
          code={container.containerCode}
          busy={busy}
          onClose={() => setEditing(false)}
        >
          <form
            className="container-editor-form"
            data-container-focus="device"
            aria-label="Cấu hình liên kết GPS"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setEditorError('');
              setMessage('');
              try {
                const response = await api.configureContainerDevice(container.containerCode, {
                  deviceId: draft.deviceId.trim(),
                  label: draft.label.trim(),
                  reason: draft.reason.trim()
                });
                if (!response?.result?.deviceKey)
                  throw new Error('Chưa nhận được khóa cấu hình. Tải lại và kiểm tra kết nối.');
                setState(response.result.state);
                setSecret(response.result);
                setReveal(false);
                setEditing(false);
                setMessage(
                  'Đã lưu liên kết. Thiết bị cần gửi gói tin hợp lệ để xác nhận nhận dữ liệu.'
                );
              } catch (failure) {
                setEditorError(failure.message || 'Chưa lưu được cấu hình.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="container-editor-body">
              <fieldset className="container-editor-gps-fields" disabled={busy}>
                <label className="container-field">
                  <span>Mã thiết bị / IMEI / serial *</span>
                  <input
                    required
                    maxLength={100}
                    pattern="[a-zA-Z0-9_.:\-]+"
                    value={draft.deviceId}
                    disabled={busy}
                    onChange={(event) => setDraft({ ...draft, deviceId: event.target.value })}
                  />
                </label>
                <label className="container-field">
                  <span>Tên thiết bị *</span>
                  <input
                    required
                    maxLength={100}
                    value={draft.label}
                    disabled={busy}
                    onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  />
                </label>
                <label className="container-field container-editor-wide">
                  <span>Lý do cấu hình *</span>
                  <textarea
                    required
                    maxLength={500}
                    rows={3}
                    value={draft.reason}
                    disabled={busy}
                    onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                  />
                </label>
              </fieldset>
              {connection && (
                <p className="container-notice">
                  Lưu sẽ cấp khóa mới và vô hiệu khóa trước. Cập nhật khóa tại thiết bị hoặc phần
                  mềm tích hợp sau khi lưu.
                </p>
              )}
              {editorError && (
                <p role="alert" className="container-notice container-notice-error">
                  {editorError}
                </p>
              )}
            </div>
            <footer className="container-editor-footer">
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={
                  busy || !draft.deviceId.trim() || !draft.label.trim() || !draft.reason.trim()
                }
              >
                <Cable size={15} />
                {busy ? 'Đang lưu…' : 'Lưu liên kết và cấp khóa'}
              </button>
            </footer>
          </form>
        </ContainerEditorDialog>
      )}
      {secret && (
        <section className="dispatch-device-secret" aria-label="Khóa kết nối vừa cấp">
          <strong>
            <Check size={15} /> Khóa chỉ hiển thị trong lần cấp này
          </strong>
          <label className="container-field">
            <span>X-Device-Key</span>
            <input type={reveal ? 'text' : 'password'} readOnly value={secret.deviceKey} />
          </label>
          <div className="container-form-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setReveal(!reveal)}>
              {reveal ? 'Ẩn khóa' : 'Hiện khóa'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret.deviceKey);
                  setMessage('Đã sao chép khóa kết nối.');
                } catch {
                  setReveal(true);
                  setMessage('Hãy sao chép khóa trong ô phía trên.');
                }
              }}
            >
              <Copy size={14} /> Sao chép khóa
            </button>
            <button
              className="container-text-button"
              type="button"
              onClick={() => {
                setSecret(null);
                setReveal(false);
              }}
            >
              Đóng khóa
            </button>
          </div>
        </section>
      )}
      {endpoint && (
        <details className="dispatch-device-instructions">
          <summary>Thông số tích hợp thiết bị / nhà cung cấp</summary>
          <p>
            Phương thức <strong>POST</strong>, Content-Type <strong>application/json</strong>,
            header <strong>X-Device-Key</strong> dùng khóa đã cấp.
          </p>
          <code>{endpoint}</code>
          <pre>
            {JSON.stringify(
              {
                eventId: 'UUID-mới-cho-mỗi-gói-tin',
                observedAt: '2026-11-20T10:00:00Z',
                latitude: 10.8492,
                longitude: 106.7725,
                speedKmh: 35
              },
              null,
              2
            )}
          </pre>
          <p>
            observedAt là giờ UTC thiết bị ghi nhận trong 10 phút gần nhất. Thay bằng thời điểm thực
            tế. Gửi lại giữ nguyên eventId và nội dung để tránh ghi trùng.
          </p>
          <p>
            Địa chỉ localhost chỉ truy cập được từ máy này. Thiết bị bên ngoài cần địa chỉ HTTPS có
            thể truy cập và adapter gửi đúng JSON. Giao thức riêng của nhà cung cấp cần được chuyển
            đổi trước khi gửi.
          </p>
        </details>
      )}
      <div className="container-form-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={busy}
          onClick={async () => {
            await load();
            await onRefresh?.();
          }}
        >
          <RefreshCw size={14} /> Kiểm tra nhận dữ liệu
        </button>
        {connection?.enabled && (
          <button
            className="container-text-button"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const response = await api.disableContainerDevice(container.containerCode);
                setState(response.result);
                setSecret(null);
                setMessage('Đã thu hồi khóa thiết bị.');
              } catch (failure) {
                setError(failure.message || 'Chưa thu hồi được khóa.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Unplug size={14} /> Thu hồi khóa thiết bị
          </button>
        )}
      </div>
    </section>
  );
}
