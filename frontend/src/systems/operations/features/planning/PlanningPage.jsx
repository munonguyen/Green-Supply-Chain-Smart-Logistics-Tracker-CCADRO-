import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, Clock, Leaf, MapPin, Navigation, RefreshCw, Route, Truck } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../services/api';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import RouteEvidence from '../../../../shared/map/RouteEvidence';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import { extractGeoJsonLineStringPoints } from '../../../../services/roadRoutingService';
import { formatDate, formatNumber } from '../containers/containerPresentation';

const unwrap = (response) => response?.result ?? response;
const asList = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : [];
};
const validPoint = (latitude, longitude) =>
  latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
const durationLabel = (seconds) => {
  const minutes = Math.round(Number(seconds || 0) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
};

export default function PlanningPage() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [shipmentError, setShipmentError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [carbonWeight, setCarbonWeight] = useState(50);
  const [timeWeight, setTimeWeight] = useState(30);
  const [distanceWeight, setDistanceWeight] = useState(20);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getShipmentById(shipmentId),
      api.getRouteCandidates(shipmentId).catch(() => ({ result: [] }))
    ]).then(([shipmentResponse, routeResponse]) => {
      if (!active) return;
      setShipment(unwrap(shipmentResponse));
      const list = asList(routeResponse);
      setCandidates(list);
      setSelectedId(list.find((item) => item.isSelected)?.id || '');
      setShipmentError('');
    }).catch((failure) => {
      if (active) setShipmentError(failure.message || 'Không tải được vận đơn.');
    });
    return () => { active = false; };
  }, [shipmentId]);

  const weights = useMemo(() => {
    const sum = carbonWeight + timeWeight + distanceWeight || 1;
    return {
      weightEmission: Number((carbonWeight / sum).toFixed(4)),
      weightDuration: Number((timeWeight / sum).toFixed(4)),
      weightDistance: Number((distanceWeight / sum).toFixed(4))
    };
  }, [carbonWeight, timeWeight, distanceWeight]);
  const selected = candidates.find((candidate) => (candidate.candidateId || candidate.id) === selectedId);
  const originReady = validPoint(shipment?.originLatitude, shipment?.originLongitude);
  const destinationReady = validPoint(shipment?.destinationLatitude, shipment?.destinationLongitude);
  const provider = String(selected?.providerName || '').toUpperCase();
  const isMock = provider === 'MOCK';
  const canConfirmInitialRoute = ['PENDING', 'PLANNED'].includes(shipment?.status);
  const coordinates = useMemo(() => {
    return extractGeoJsonLineStringPoints(selected?.geometryGeoJson);
  }, [selected]);

  const calculate = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.calculateRoutes(shipmentId, {
        weightEmission: String(weights.weightEmission),
        weightDuration: String(weights.weightDuration),
        weightDistance: String(weights.weightDistance)
      });
      const list = asList(response);
      setCandidates(list);
      setSelectedId(list[0]?.candidateId || '');
      if (!list.length) setNotice('Nhà cung cấp chưa trả phương án tuyến.');
    } catch (failure) {
      setError(failure.message || 'Không tính được tuyến. Kiểm tra dữ liệu vận đơn và kết nối routing.');
    } finally {
      setLoading(false);
    }
  };

  const confirmRoute = async () => {
    if (!(selected?.candidateId || selected?.id) || isMock || !canConfirmInitialRoute) return;
    setConfirming(true);
    setError('');
    try {
      await api.selectRoute({
        shipmentId,
        selectedCandidateId: selected.candidateId || selected.id,
        decisionType: 'DISPATCHER_SELECTED',
        dispatcherNotes: null,
        decidedBy: user?.username || 'DISPATCHER'
      });
      setNotice('Đã chốt tuyến và tạo phiên bản hiệu lực. Chỉ sau bước này mới chuyển sang phân công.');
      navigate(`/dispatch/${shipmentId}`);
    } catch (failure) {
      setError(failure.message || 'Không chốt được tuyến.');
    } finally {
      setConfirming(false);
    }
  };

  if (!shipmentId) return <div className="page-body"><h2>Thiếu mã vận đơn</h2></div>;

  return (
    <div className="page-body">
      <header className="dispatch-page-heading">
        <div className="dispatch-heading-copy">
          <div className="dispatch-eyebrow">ĐIỀU HÀNH VẬN TẢI / LỘ TRÌNH</div>
          <h2>Lập và chốt lộ trình</h2>
          <div className="dispatch-shipment-ref">Vận đơn <code>{shipment?.shipmentCode || shipmentId}</code></div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={calculate} disabled={loading || !originReady || !destinationReady}>
          <RefreshCw size={16} /> {loading ? 'Đang kiểm tra provider…' : 'Tính phương án thật'}
        </button>
      </header>

      {shipmentError && <p role="alert" className="container-notice container-notice-error">{shipmentError}</p>}
      {error && <p role="alert" className="container-notice container-notice-error">{error}</p>}
      {notice && <p role="status" className="container-notice">{notice}</p>}

      <section className="card" aria-label="Vận đơn và điểm tuyến">
        <div className="container-data-grid">
          <div><dt>Điểm lấy</dt><dd>{shipment?.originName || shipment?.originAddress || 'Chưa có dữ liệu'}</dd><small>{originReady ? `${shipment.originLatitude}, ${shipment.originLongitude}` : 'Thiếu tọa độ hợp lệ'}</small></div>
          <div><dt>Điểm giao</dt><dd>{shipment?.destinationName || shipment?.destinationAddress || 'Chưa có dữ liệu'}</dd><small>{destinationReady ? `${shipment.destinationLatitude}, ${shipment.destinationLongitude}` : 'Thiếu tọa độ hợp lệ'}</small></div>
          <div><dt>Khối lượng khai báo</dt><dd>{formatNumber(shipment?.cargoWeightTons, ' tấn')}</dd></div>
          <div><dt>Hạn giao</dt><dd>{formatDate(shipment?.deliveryDeadline)}</dd></div>
        </div>
      </section>

      {!originReady || !destinationReady ? (
        <p className="container-notice"><MapPin size={17} /> Bổ sung tọa độ điểm lấy và giao trong hồ sơ vận đơn trước khi lập tuyến.</p>
      ) : null}

      <section className="card" aria-label="Trọng số xếp hạng">
        <h3>Ưu tiên xếp hạng</h3>
        <div className="planning-weight-grid">
          {[
            ['Phát thải CO₂', carbonWeight, setCarbonWeight],
            ['Thời gian', timeWeight, setTimeWeight],
            ['Khoảng cách', distanceWeight, setDistanceWeight]
          ].map(([label, value, setter]) => (
            <label key={label}>
              <span>{label}: {value}%</span>
              <input type="range" min="0" max="100" value={value} onChange={(event) => setter(Number(event.target.value))} />
            </label>
          ))}
        </div>
        <p className="container-field-hint">Trọng số được gửi lên backend và chuẩn hóa trước khi xếp hạng. Điểm số chỉ so sánh các phương án vừa tính.</p>
      </section>

      {selected && coordinates.length >= 2 && (
        <section className="card" aria-label="Hình học tuyến từ provider">
          <MapView center={coordinates[Math.floor(coordinates.length / 2)]} zoom={10} height={420} defaultLayer="google_hybrid">
            <OriginMarker position={coordinates[0]} title="Điểm đi từ dữ liệu tuyến" />
            <DestinationMarker position={coordinates[coordinates.length - 1]} title="Điểm đến từ dữ liệu tuyến" />
            <RoutePolyline routingMetadataJson={selected.routingMetadataJson} positions={coordinates} color="#10b981" weight={5} />
          </MapView>
        </section>
      )}
      {selected && <RouteEvidence candidate={selected} />}

      <section className="planning-candidate-section">
        <div className="container-route-section-title"><h3><Route size={18} /> Phương án từ routing service</h3><span>{candidates.length} phương án</span></div>
        {!candidates.length && <p className="container-empty">Chưa có phương án đã tính. Không tự thay dữ liệu demo khi API lỗi.</p>}
        <div className="planning-candidate-grid">
          {candidates.map((candidate, index) => {
            const active = selectedId === (candidate.candidateId || candidate.id);
            const mock = String(candidate.providerName || '').toUpperCase() === 'MOCK';
            return (
              <button type="button" className={`planning-candidate ${active ? 'is-selected' : ''}`} key={candidate.candidateId || candidate.id || `${candidate.candidateName}-${index}`} onClick={() => setSelectedId(candidate.candidateId || candidate.id)}>
                <div><strong>{candidate.candidateName}</strong><span className={mock ? 'provider-mock' : 'provider-live'}>{mock ? 'MÔ PHỎNG' : candidate.providerName || 'Không rõ nguồn'}</span></div>
                <dl>
                  <div><dt><MapPin size={13} /> Quãng đường</dt><dd>{formatNumber(Number(candidate.distanceMeters || 0) / 1000, ' km')}</dd></div>
                  <div><dt><Clock size={13} /> Thời gian</dt><dd>{durationLabel(candidate.durationSeconds)}</dd></div>
                  <div><dt><Truck size={13} /> Nhiên liệu ước tính</dt><dd>{formatNumber(candidate.estimatedFuelLiters, ' lít')}</dd></div>
                  <div><dt><Leaf size={13} /> CO₂ ước tính</dt><dd>{formatNumber(candidate.estimatedCo2Kg, ' kg')}</dd></div>
                  <div><dt><Award size={13} /> Điểm tổng hợp thấp hơn là tốt hơn</dt><dd>{formatNumber(candidate.compositeScore)}</dd></div>
                </dl>
                {mock && <small>Không thể chốt tuyến mô phỏng thành tuyến vận hành.</small>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="planning-confirm-row">
        <p><Truck size={16} /> {canConfirmInitialRoute ? 'Chốt tuyến trước; dispatcher tiếp tục kiểm tra tài xế, GPLX, HOS và Pre-trip ở bước phân công.' : 'Vận đơn đã qua bước lập kế hoạch. Chuyến đang chạy phải dùng quy trình đổi tuyến để đồng bộ phiên bản tới tài xế.'}</p>
        <button className="btn btn-primary" type="button" onClick={confirmRoute} disabled={confirming || !(selected?.candidateId || selected?.id) || isMock || !canConfirmInitialRoute || coordinates.length < 2}>
          <Navigation size={16} /> {confirming ? 'Đang lưu quyết định…' : 'Chốt tuyến & sang phân công'}
        </button>
      </div>
    </div>
  );
}
