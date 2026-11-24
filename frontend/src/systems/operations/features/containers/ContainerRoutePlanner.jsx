import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Leaf,
  MapPin,
  RefreshCw,
  Route,
  Truck
} from 'lucide-react';
import { api } from '../../../../services/api';
import RouteEvidence from '../../../../shared/map/RouteEvidence';
import { formatDate, formatNumber } from './containerPresentation';

const resultOf = (response) => response?.result ?? response;
const listOf = (response) => {
  const result = resultOf(response);
  return Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
};
const validCoordinate = (value, min, max) =>
  value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
const isUsablePoint = (lat, lon) => validCoordinate(lat, -90, 90) && validCoordinate(lon, -180, 180);

function durationLabel(seconds) {
  const totalMinutes = Math.round(Number(seconds || 0) / 60);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return 'Chưa có dữ liệu';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours ? `${hours} giờ` : '', minutes ? `${minutes} phút` : '']
    .filter(Boolean)
    .join(' ') || 'Dưới 1 phút';
}

function providerInfo(providerName) {
  const provider = String(providerName || '').toUpperCase();
  if (provider === 'MOCK') {
    return { label: 'Mô phỏng', tone: 'container-route-provider-demo' };
  }
  if (provider === 'OSRM') {
    return { label: 'Bản đồ định tuyến đường bộ', tone: 'container-route-provider-live' };
  }
  if (provider === 'TOMTOM') {
    return { label: 'TomTom · tuyến xe tải & giao thông', tone: 'container-route-provider-live' };
  }
  if (provider === 'GRAPHHOPPER') {
    return { label: 'GraphHopper', tone: 'container-route-provider-demo' };
  }
  return { label: providerName || 'Không rõ nguồn', tone: 'container-route-provider-demo' };
}

function RouteMetrics({ candidate }) {
  return (
    <dl className="container-route-metrics">
      <div>
        <dt>Quãng đường</dt>
        <dd>{candidate.distanceMeters == null ? 'Chưa có dữ liệu' : formatNumber(Number(candidate.distanceMeters) / 1000, ' km')}</dd>
      </div>
      <div>
        <dt>Thời gian ước tính</dt>
        <dd>{durationLabel(candidate.durationSeconds)}</dd>
      </div>
      <div>
        <dt>Nhiên liệu ước tính</dt>
        <dd>{formatNumber(candidate.estimatedFuelLiters, ' lít')}</dd>
      </div>
      <div>
        <dt>CO₂ ước tính</dt>
        <dd>{formatNumber(candidate.estimatedCo2Kg, ' kg')}</dd>
      </div>
      <div>
        <dt>Điểm xếp hạng</dt>
        <dd>{formatNumber(candidate.compositeScore)}</dd>
      </div>
      <div>
        <dt>Tính lúc</dt>
        <dd>{formatDate(candidate.createdAt)}</dd>
      </div>
    </dl>
  );
}

function Point({ label, name, address, latitude, longitude }) {
  return (
    <div className="container-route-point">
      <span>{label}</span>
      <strong>{name || 'Chưa có tên điểm'}</strong>
      <small>{address || 'Chưa có địa chỉ'}</small>
      <small>
        {isUsablePoint(latitude, longitude)
          ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
          : 'Thiếu tọa độ GPS hợp lệ'}
      </small>
    </div>
  );
}

export default function ContainerRoutePlanner({ container, shipment, shipmentState, canManage, actorName }) {
  const shipmentId = container.assignedShipmentId;
  const [candidates, setCandidates] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeVersionError, setActiveVersionError] = useState('');
  const [versionHistoryError, setVersionHistoryError] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const originReady = isUsablePoint(shipment?.originLatitude, shipment?.originLongitude);
  const destinationReady = isUsablePoint(shipment?.destinationLatitude, shipment?.destinationLongitude);
  const payloadReady = Number(shipment?.cargoWeightTons) > 0;
  const inTransit = container.status === 'IN_TRANSIT';
  const terminalOrUnavailable = ['DELIVERED', 'MAINTENANCE'].includes(container.status);
  const canCalculate = Boolean(canManage && shipmentId && shipment && originReady && destinationReady && payloadReady && !terminalOrUnavailable);
  const canSelect = Boolean(canManage && !inTransit && !terminalOrUnavailable);

  const refreshRoutes = useCallback(async () => {
    if (!shipmentId) {
      setCandidates([]);
      setActiveVersion(null);
      setVersions([]);
      return;
    }
    setLoading(true);
    setError('');
    setActiveVersionError('');
    setVersionHistoryError('');
    const [candidateResult, activeResult, versionResult] = await Promise.allSettled([
      api.getRouteCandidates(shipmentId),
      api.getActiveRouteVersion(shipmentId),
      api.getRouteVersions(shipmentId)
    ]);
    if (candidateResult.status === 'fulfilled') {
      setCandidates(listOf(candidateResult.value));
    } else {
      setCandidates([]);
      setError(candidateResult.reason?.message || 'Không tải được các phương án tuyến đã lưu.');
    }
    setActiveVersion(activeResult.status === 'fulfilled' ? resultOf(activeResult.value) : null);
    if (activeResult.status === 'rejected' && activeResult.reason?.status !== 404) {
      setActiveVersionError(activeResult.reason?.message || 'Không kiểm tra được tuyến hiệu lực.');
    }
    setVersions(versionResult.status === 'fulfilled' ? listOf(versionResult.value) : []);
    if (versionResult.status === 'rejected') {
      setVersionHistoryError(versionResult.reason?.message || 'Không tải được lịch sử phiên bản tuyến.');
    }
    setLoading(false);
  }, [shipmentId]);

  useEffect(() => {
    refreshRoutes();
  }, [refreshRoutes]);

  const sortedCandidates = useMemo(
    () => [...candidates].sort((left, right) => {
      if (Boolean(left.isSelected) !== Boolean(right.isSelected)) return left.isSelected ? -1 : 1;
      return Number(left.compositeScore ?? Number.MAX_SAFE_INTEGER) - Number(right.compositeScore ?? Number.MAX_SAFE_INTEGER);
    }),
    [candidates]
  );

  const calculate = async () => {
    setCalculating(true);
    setError('');
    setNotice('');
    try {
      await api.calculateRoutes(shipmentId);
      await refreshRoutes();
      setNotice('Đã tính xong phương án. Kiểm tra nguồn dữ liệu và điều kiện xe trước khi chốt tuyến.');
    } catch (failure) {
      setError(failure.message || 'Không tính được lộ trình. Kiểm tra kết nối dịch vụ và dữ liệu vận đơn.');
    } finally {
      setCalculating(false);
    }
  };

  const selectCandidate = async (candidate) => {
    if (!candidate.id || candidate.shipmentId !== shipmentId) {
      setError('Không thể chốt tuyến: phương án không khớp vận đơn đang gắn với container.');
      return;
    }
    if (String(candidate.providerName || '').toUpperCase() === 'MOCK') {
      setError('Đây là tuyến mô phỏng; cần có kết quả từ nhà cung cấp bản đồ thật trước khi chốt chính thức.');
      return;
    }
    setSavingId(candidate.id);
    setError('');
    setNotice('');
    try {
      await api.selectRoute({
        shipmentId,
        selectedCandidateId: candidate.id,
        decisionType: 'DISPATCHER_SELECTED',
        dispatcherNotes: notes.trim() || null,
        decidedBy: actorName || 'DISPATCHER'
      });
      setSelectedId('');
      setNotice('Đã chốt phương án và tạo phiên bản lộ trình hiệu lực cho vận đơn.');
      await refreshRoutes();
    } catch (failure) {
      setError(failure.message || 'Không lưu được quyết định lộ trình.');
    } finally {
      setSavingId('');
    }
  };

  if (!shipmentId) {
    return (
      <section className="container-route-planner" aria-label="Lộ trình vận chuyển">
        <h3><Route size={18} /> Lộ trình & kết nối định tuyến</h3>
        <p className="container-notice">Container chưa liên kết vận đơn. Hãy liên kết đúng vận đơn trước khi tính tuyến.</p>
      </section>
    );
  }

  return (
    <section className="container-route-planner" aria-label="Lộ trình vận chuyển">
      <div className="container-route-heading">
        <div>
          <h3><Route size={18} /> Lộ trình & kết nối định tuyến</h3>
          <p>Vận đơn {shipment?.shipmentCode || container.assignedShipmentCode || shipmentId}</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={refreshRoutes} disabled={loading || calculating}>
          <RefreshCw size={15} /> {loading ? 'Đang tải…' : 'Làm mới dữ liệu tuyến'}
        </button>
      </div>

      {shipmentState === 'loading' && <p className="container-field-hint" role="status">Đang tải điểm đi và điểm đến của vận đơn…</p>}
      {shipmentState === 'error' && <p className="container-notice container-notice-error" role="alert">Chưa tải được vận đơn; chưa thể kết nối định tuyến an toàn.</p>}
      {shipment && (
        <div className="container-route-points">
          <Point label="ĐIỂM LẤY HÀNG" name={shipment.originName || container.originName} address={shipment.originAddress} latitude={shipment.originLatitude} longitude={shipment.originLongitude} />
          <div className="container-route-direction" aria-hidden="true">→</div>
          <Point label="ĐIỂM GIAO HÀNG" name={shipment.destinationName || container.destinationName} address={shipment.destinationAddress} latitude={shipment.destinationLatitude} longitude={shipment.destinationLongitude} />
        </div>
      )}

      <div className="container-route-readiness" aria-label="Điều kiện tính tuyến">
        <span className={shipmentId ? 'is-ready' : ''}><CheckCircle2 size={14} /> Vận đơn {shipmentId ? 'đã liên kết' : 'chưa liên kết'}</span>
        <span className={originReady ? 'is-ready' : 'is-missing'}><MapPin size={14} /> Tọa độ điểm đi {originReady ? 'đã có' : 'cần bổ sung'}</span>
        <span className={destinationReady ? 'is-ready' : 'is-missing'}><MapPin size={14} /> Tọa độ điểm đến {destinationReady ? 'đã có' : 'cần bổ sung'}</span>
        <span className={payloadReady ? 'is-ready' : 'is-missing'}><Truck size={14} /> Khối lượng {payloadReady ? 'đã khai báo' : 'cần bổ sung'}</span>
      </div>

      {canManage && (
        <div className="container-route-actions">
          <button className="btn btn-primary" type="button" onClick={calculate} disabled={!canCalculate || calculating || loading}>
            <Route size={16} /> {calculating ? 'Đang kết nối và tính tuyến…' : 'Kiểm tra kết nối & tính phương án'}
          </button>
          {!canCalculate && shipmentState !== 'loading' && (
            <span className="container-field-hint">
              Cần vận đơn đã tải, tọa độ hợp lệ cho cả hai điểm, khối lượng hàng lớn hơn 0 và container chưa bàn giao/bảo trì.
            </span>
          )}
        </div>
      )}

      {inTransit && <p className="container-notice"><AlertTriangle size={16} /> Container đang chạy. Có thể tra cứu tuyến hiệu lực; đổi tuyến cần luồng phê duyệt tái định tuyến.</p>}
      {error && <p className="container-notice container-notice-error" role="alert">{error}</p>}
      {notice && <p className="container-notice" role="status">{notice}</p>}

      <div className="container-route-provider-note">
        <strong>Nguồn tính tuyến:</strong> OSRM cung cấp hình học đường ô tô, chưa xét kích thước/tải trọng xe tải và chưa có giao thông trực tiếp. TomTom cần khóa API và kích thước/tổng trọng lượng xe để tính tuyến xe tải theo giờ khởi hành. Hệ thống so sánh các phương án nhận được; CO₂ là ước tính. Tín hiệu GPS/reefer/e-seal được quản lý riêng ở tab Kết nối.
      </div>

      <section className="container-route-active" aria-label="Lộ trình hiệu lực">
        <div className="container-route-section-title"><h4>Lộ trình đang áp dụng</h4>{activeVersion && <span>Phiên bản {activeVersion.versionNumber}</span>}</div>
        {activeVersionError ? (
          <p className="container-notice container-notice-error" role="status">{activeVersionError}</p>
        ) : activeVersion ? (
          <>
            <dl className="container-route-metrics">
              <div><dt>Khoảng cách</dt><dd>{formatNumber(Number(activeVersion.totalDistanceMeters || 0) / 1000, ' km')}</dd></div>
              <div><dt>Thời gian dự kiến</dt><dd>{durationLabel(activeVersion.totalDurationSeconds)}</dd></div>
              <div><dt>Ngày chốt</dt><dd>{formatDate(activeVersion.createdAt)}</dd></div>
              <div><dt>Lý do phiên bản</dt><dd>{activeVersion.reason || 'Không ghi nhận'}</dd></div>
            </dl>
            {activeVersion.routingMetadataJson && <RouteEvidence candidate={activeVersion} />}
          </>
        ) : (
          <p className="container-field-hint">Chưa có tuyến hiệu lực được dispatcher chốt.</p>
        )}
      </section>

      <section className="container-route-candidates" aria-label="Các phương án lộ trình">
        <div className="container-route-section-title"><h4>Phương án so sánh</h4><span>{sortedCandidates.length} phương án</span></div>
        {loading && <p className="container-field-hint" role="status">Đang tải các phương án đã lưu…</p>}
        {!loading && sortedCandidates.length === 0 && <p className="container-empty">Chưa có phương án. Kiểm tra dữ liệu điểm đi/đến rồi tính tuyến để bắt đầu.</p>}
        <div className="container-route-list">
          {sortedCandidates.map((candidate, index) => {
            const source = providerInfo(candidate.providerName);
            const isMock = String(candidate.providerName || '').toUpperCase() === 'MOCK';
            return (
              <article className={'container-route-option' + (candidate.isSelected ? ' is-recommended' : '')} key={candidate.id || candidate.candidateName}>
                <div className="container-route-option-heading">
                  <div>
                    <span className="container-route-option-index">Phương án {index + 1}</span>
                    <h5>{candidate.candidateName || 'Lộ trình'}</h5>
                  </div>
                  <span className={'container-route-provider ' + source.tone}>{source.label}</span>
                </div>
                {candidate.isSelected ? (
                  <p className="container-route-recommended"><CheckCircle2 size={14} /> Tuyến đang được áp dụng chính thức</p>
                ) : index === 0 && (
                  <p className="container-route-recommended"><CheckCircle2 size={14} /> Điểm tổng hợp thấp nhất trong các phương án hiện có</p>
                )}
                {isMock && <p className="container-field-hint">Kết quả mô phỏng để thử giao diện; không chốt làm tuyến vận hành.</p>}
                <RouteMetrics candidate={candidate} />
                <RouteEvidence candidate={candidate} />
                {canManage && (
                  <div className="container-route-select-row">
                    {selectedId === candidate.id && !isMock && canSelect ? (
                      <>
                        <label className="container-field container-route-notes">
                          <span>Ghi chú quyết định của dispatcher (không bắt buộc)</span>
                          <textarea maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ví dụ: đã kiểm tra điều kiện đường cho xe và khung giờ giao." disabled={Boolean(savingId)} />
                        </label>
                        <button className="btn btn-primary" type="button" onClick={() => selectCandidate(candidate)} disabled={Boolean(savingId)}>
                          {savingId === candidate.id ? 'Đang chốt…' : 'Xác nhận chốt tuyến'}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => setSelectedId('')} disabled={Boolean(savingId)}>Hủy</button>
                      </>
                    ) : (
                      <button className="btn btn-secondary" type="button" onClick={() => { setSelectedId(candidate.id); setError(''); }} disabled={!canSelect || isMock || Boolean(candidate.isSelected) || !candidate.id}>
                        {candidate.isSelected ? 'Đang áp dụng' : isMock ? 'Không thể chốt mô phỏng' : inTransit ? 'Đổi tuyến cần phê duyệt' : 'Chọn phương án này'}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="container-route-history" aria-label="Lịch sử phiên bản lộ trình">
        <div className="container-route-section-title"><h4><Clock3 size={16} /> Lịch sử chốt tuyến</h4><span>{versions.length} phiên bản</span></div>
        {versionHistoryError ? (
          <p className="container-notice container-notice-error" role="status">{versionHistoryError}</p>
        ) : versions.length ? (
          <ol>
            {versions.map((version) => (
              <li key={version.id || `${version.shipmentId}-${version.versionNumber}`}>
                <span>V{version.versionNumber}{version.active ? ' · Hiệu lực' : ''}</span>
                <strong>{formatNumber(Number(version.totalDistanceMeters || 0) / 1000, ' km')} · {durationLabel(version.totalDurationSeconds)}</strong>
                <small>{version.reason || 'Không ghi nhận lý do'} · {formatDate(version.createdAt)}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="container-field-hint">Chưa có lịch sử phiên bản.</p>
        )}
      </section>
      <p className="container-field-hint"><Leaf size={14} /> Tuyến chính thức chỉ được tạo sau khi dispatcher xác nhận phương án; chọn lại tạo phiên bản mới và giữ lịch sử các phiên bản trước.</p>
    </section>
  );
}
