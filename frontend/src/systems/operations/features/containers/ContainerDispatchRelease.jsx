import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, Route, Send } from 'lucide-react';
import { api } from '../../../../services/api';

export default function ContainerDispatchRelease({ container, onSelectTab, onRefresh }) {
  const [state, setState] = useState({ loading: true, order: null, route: null, error: '' });
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState('');
  const dispatchCode = useRef('DSP-' + crypto.randomUUID().slice(0, 18));
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const results = await Promise.allSettled([
      api.getShipmentDispatchOrder(container.assignedShipmentId),
      api.getActiveRouteVersion(container.assignedShipmentId)
    ]);
    const missing = (result) => result.status === 'rejected' && result.reason?.status === 404;
    const problems = results.filter((result) => result.status === 'rejected' && !missing(result));
    setState({
      loading: false,
      order: results[0].status === 'fulfilled' ? results[0].value?.result : null,
      route: results[1].status === 'fulfilled' ? results[1].value?.result : null,
      error: problems.length
        ? 'Chưa xác minh được lệnh điều phối hoặc tuyến. Tải lại trước khi phát hành.'
        : ''
    });
  }, [container.assignedShipmentId]);
  useEffect(() => {
    if (container.assignedShipmentId) load();
  }, [container.assignedShipmentId, load]);
  const hasOrder = state.order?.tripId && !['FAILED', 'CANCELLED'].includes(state.order.status);
  const disabled =
    busy || state.loading || Boolean(state.error) || !state.route?.id || Boolean(hasOrder);
  return (
    <section className="dispatch-release" aria-label="Phát hành lệnh điều phối">
      <div>
        <span className="container-overline">LỆNH THỰC HIỆN CHUYẾN</span>
        <h4>{hasOrder ? 'Đã giao chuyến cho tài xế' : 'Phát hành lệnh điều phối'}</h4>
        <p>
          {hasOrder
            ? `${state.order.dispatchCode} · ${state.order.status === 'ASSIGNED' ? 'Đã phân công' : state.order.status}`
            : 'Dùng đúng xe, tài xế và vận đơn đã phân công. Tài xế xác nhận khởi hành sau Pre-trip.'}
        </p>
      </div>
      {state.loading && <p role="status">Đang kiểm tra lệnh và tuyến…</p>}
      {state.error && (
        <p className="container-notice container-notice-error" role="alert">
          {state.error}
        </p>
      )}
      {writeError && (
        <p className="container-notice container-notice-error" role="alert">
          {writeError}
        </p>
      )}
      <div className="dispatch-release-actions">
        {hasOrder ? (
          <span className="dispatch-save-success">
            <CheckCircle2 size={16} /> Chuyến đã sẵn trong khoang lái
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled}
            onClick={async () => {
              if (disabled) return;
              setBusy(true);
              setWriteError('');
              try {
                const response = await api.createDispatchOrder({
                  dispatchCode: dispatchCode.current,
                  shipmentId: container.assignedShipmentId,
                  vehicleId: container.assignedVehicleId,
                  driverId: container.assignedDriverId
                });
                if (!response?.result?.tripId)
                  throw new Error(
                    'Chưa nhận được xác nhận tạo chuyến. Tải lại trạng thái lệnh trước khi thử tiếp.'
                  );
                await load();
                await onRefresh?.();
              } catch (failure) {
                setWriteError(
                  failure.message ||
                    'Chưa xác nhận được phát hành lệnh. Kiểm tra trạng thái trước khi thử lại.'
                );
                await load();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send size={14} />
            {busy ? 'Đang phát hành…' : 'Phát hành lệnh cho tài xế'}
          </button>
        )}
        {!state.route?.id && !state.loading && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onSelectTab?.('route')}
          >
            <Route size={14} /> Lập và chốt tuyến
          </button>
        )}
        <button
          type="button"
          className="container-text-button"
          disabled={state.loading || busy}
          onClick={load}
        >
          <RefreshCw size={13} /> Kiểm tra lệnh
        </button>
      </div>
    </section>
  );
}
