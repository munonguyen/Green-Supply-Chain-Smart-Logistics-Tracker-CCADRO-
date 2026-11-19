import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Truck, UserCheck, ShieldCheck, Activity, Route, CheckCircle2, AlertTriangle } from 'lucide-react';
import MapView from '../../../../shared/map/MapView';
import RoutePolyline from '../../../../shared/map/RoutePolyline';
import OriginMarker from '../../../../shared/map/OriginMarker';
import DestinationMarker from '../../../../shared/map/DestinationMarker';
import VehicleMarker from '../../../../shared/map/VehicleMarker';
import { api } from '../../../../services/api';
import { getRealRoadRoute } from '../../../../services/roadRoutingService';

const DISPATCH_CORRIDOR = getRealRoadRoute('catlai', 'vsip').points;

const FALLBACK_VEHICLES = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    vehicleCode: 'V001',
    licensePlate: '51C-888.99',
    fuelType: 'Xe đầu kéo điện (EV) / Euro 5',
    payloadCapacityTons: 20.0,
    status: 'AVAILABLE',
    preTripPassed: true
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    vehicleCode: 'V002',
    licensePlate: '51D-777.55',
    fuelType: 'Diesel Sinh Học B5 + SCR Euro 5',
    payloadCapacityTons: 25.0,
    status: 'AVAILABLE',
    preTripPassed: true
  }
];

const FALLBACK_DRIVERS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    driverCode: 'D001',
    fullName: 'Nguyễn Văn Tài',
    licenseType: 'FC (Container & Chuỗi lạnh)',
    phone: '0901 234 567',
    ecoScore: 98,
    status: 'AVAILABLE'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    driverCode: 'D002',
    fullName: 'Trần Minh Quân',
    licenseType: 'FC (Chuyên tuyến Cát Lái – VSIP)',
    phone: '0903 456 789',
    ecoScore: 95,
    status: 'AVAILABLE'
  }
];

export default function DispatchPage() {
  const { shipmentId } = useParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState(FALLBACK_VEHICLES);
  const [drivers, setDrivers] = useState(FALLBACK_DRIVERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState(FALLBACK_VEHICLES[0].id);
  const [selectedDriverId, setSelectedDriverId] = useState(FALLBACK_DRIVERS[0].id);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState(null);

  const selectedPlan = (() => {
    try {
      const raw = window.sessionStorage?.getItem('ccadro_selected_plan');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const corridorPoints =
    Array.isArray(selectedPlan?.waypoints) && selectedPlan.waypoints.length >= 2
      ? selectedPlan.waypoints
      : DISPATCH_CORRIDOR;

  useEffect(() => {
    Promise.allSettled([api.getVehicles(), api.getDrivers()]).then(([vRes, dRes]) => {
      const vList = vRes.status === 'fulfilled' ? vRes.value?.result ?? vRes.value : null;
      const dList = dRes.status === 'fulfilled' ? dRes.value?.result ?? dRes.value : null;
      if (Array.isArray(vList) && vList.length > 0) {
        setVehicles(vList);
        const ready = vList.find((v) => v.status === 'AVAILABLE') || vList[0];
        if (ready?.id) setSelectedVehicleId(ready.id);
      }
      if (Array.isArray(dList) && dList.length > 0) {
        setDrivers(dList);
        if (dList[0]?.id) setSelectedDriverId(dList[0].id);
      }
    });
  }, []);

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const isVehicleBlocked = activeVehicle?.status !== 'AVAILABLE';
  const isDriverBlocked = activeDriver?.status !== 'AVAILABLE';

  const handleDispatchAndStart = async () => {
    if (isVehicleBlocked || isDriverBlocked) {
      setDispatchError(
        isVehicleBlocked
          ? `Xe ${activeVehicle.vehicleCode} hiện không ở trạng thái sẵn sàng.`
          : `Tài xế ${activeDriver.driverCode} hiện không ở trạng thái sẵn sàng.`
      );
      return;
    }
    setDispatchError(null);
    setDispatching(true);
    try {
      const dispatchRes = await api.createDispatchOrder({
        dispatchCode: `DSP-${Date.now().toString().slice(-6)}`,
        shipmentId: shipmentId || 'e0000000-0000-0000-0000-000000000001',
        vehicleId: activeVehicle.id,
        driverId: activeDriver.id
      });
      const dispatchOrder = dispatchRes?.result ?? dispatchRes;
      if (!dispatchOrder?.tripId) {
        throw new Error('Lệnh điều phối không trả về mã chuyến đã khởi tạo.');
      }
      await api.startTrip(dispatchOrder.tripId);
      navigate(`/trips/${dispatchOrder.tripId}`);
    } catch (err) {
      setDispatchError(
        err?.message ||
          'Không thể kích hoạt chuyến xe thực tế vì Backend / Tracking Service (:8888) chưa kết nối. Hệ thống không tự tạo chuyến đi giả lập.'
      );
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="page-body dispatch-workspace">
      <div
        className="dispatch-page-heading"
      >
        <div className="dispatch-heading-copy">
          <div className="dispatch-eyebrow">ĐIỀU HÀNH VẬN TẢI / XUẤT BẾN</div>
          <h2>Điều phối chuyến</h2>
          <div className="dispatch-shipment-ref">
            Vận đơn <code>{(shipmentId || 'SH-2026-081').slice(0, 12)}</code>
          </div>
        </div>
        <div className="dispatch-heading-actions">
          <span className="dispatch-stage"><span /> CHỜ XUẤT BẾN</span>
          <Link to={`/planning/${shipmentId || 'e0000000-0000-0000-0000-000000000001'}`} className="btn btn-secondary">
            <Route size={15} /> Lập tuyến
          </Link>
        </div>
      </div>

      <div className="dispatch-step-strip" aria-label="Các bước điều phối">
        <div className="dispatch-step done"><span>1</span><b>Vận đơn & tuyến</b></div>
        <i />
        <div className="dispatch-step active"><span>2</span><b>Xe & tài xế</b></div>
        <i />
        <div className="dispatch-step"><span>3</span><b>Xuất bến</b></div>
        <i />
        <div className="dispatch-step"><span>4</span><b>Giám sát chuyến</b></div>
      </div>

      <div className="split-dispatch-grid">
        {/* Left: Assigned Fleet Assets & Pre-Trip Verification */}
        <div className="card">
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 14 }}>
            Phân Công Phương Tiện &amp; Tài Xế Đủ Điều Kiện
          </h3>

          {dispatchError && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <AlertTriangle size={16} />
              <span>{dispatchError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.06)',
                padding: 16,
                borderRadius: 12,
                    border: `1px solid ${isVehicleBlocked ? '#ef4444' : 'var(--border-color)'}`
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 10,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={20} color="#0ea5e9" />
                  <b style={{ fontSize: '0.95rem' }}>
                    {activeVehicle.vehicleCode || 'V001'} • {activeVehicle.licensePlate || '51C-888.99'}
                  </b>
                </div>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem'
                  }}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.status !== 'AVAILABLE'}>
                      {v.vehicleCode} ({v.licensePlate}) — {v.status}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                • Loại phương tiện:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  {activeVehicle.fuelType || activeVehicle.vehicleType || 'Xe đầu kéo điện (EV) / Euro 5'}
                </strong>
                <br />• Tải trọng tối đa:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  {activeVehicle.payloadCapacityTons || 20.0} tấn
                </strong>{' '}
                (Đạt chuẩn GLEC v3)
                <br />• Kiểm định Pre-trip (UC01):{' '}
                <strong style={{ color: isVehicleBlocked || activeVehicle.preTripPassed === false ? '#ef4444' : 'var(--accent-green)' }}>
                  {isVehicleBlocked ? `KHÔNG SẴN SÀNG (${activeVehicle.status})` : activeVehicle.preTripPassed === false ? 'PRE-TRIP CHƯA ĐẠT' : 'SẴN SÀNG'}
                </strong>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.35)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 10,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={20} color="#10b981" />
                  <b style={{ fontSize: '0.95rem' }}>
                    Tài xế {activeDriver.driverCode || 'D001'} • {activeDriver.fullName}
                  </b>
                </div>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem'
                  }}
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id} disabled={d.status !== 'AVAILABLE'}>
                      {d.driverCode} — {d.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                • Hạng bằng lái:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  {activeDriver.licenseType || 'FC (Container & Chuỗi lạnh)'}
                </strong>
                <br />• Điện thoại liên lạc NOC:{' '}
                <strong style={{ color: 'var(--text-main)' }}>
                  {activeDriver.phone || '0901 234 567'}
                </strong>
                <br />• Điểm lái xe sinh thái (Eco-Driving):{' '}
                <strong style={{ color: 'var(--accent-green)' }}>
                  {activeDriver.ecoScore || 98}/100 điểm
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '13px 15px',
              background: 'rgba(16, 185, 129, 0.12)',
              borderRadius: 12,
              border: '1px solid rgba(16, 185, 129, 0.35)',
              marginBottom: 20
            }}
          >
            <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.83rem', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: 2 }}>
                Đã khóa Phiên bản Lộ trình Xanh v1 (PostGIS Buffer 50m / 200m)
              </strong>
              Thiết bị định vị GPS trên xe {activeVehicle.vehicleCode || 'V001'} đã đồng bộ tọa độ
              với trung tâm chỉ huy NOC. Sẵn sàng kích hoạt luồng giám sát thời gian thực.
            </div>
          </div>

          <button
            type="button"
            onClick={handleDispatchAndStart}
            disabled={dispatching || isVehicleBlocked || isDriverBlocked}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
          >
            <Activity size={17} />
            <span>
              {dispatching
                ? 'Đang Tạo Lệnh Điều Phối & Khởi Hành...'
                : 'Khóa Lệnh Điều Phối & Kích Hoạt Giám Sát 3D (UC07 → UC09)'}
            </span>
          </button>
        </div>

        {/* Right: 3D Locked Corridor Map Preview */}
        <div className="card dispatch-map-panel" style={{ padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0 }}>
                Bản Đồ 3D Hành Lang Xuất Bến Đã Khóa ({selectedPlan?.candidateName || 'Cát Lái → VSIP 1'})
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cự ly:{' '}
                {selectedPlan ? (selectedPlan.distanceMeters / 1000).toFixed(1) : '27.3'} km • Dự toán
                phát thải: {selectedPlan?.estimatedCo2Kg || '21.84'} kg CO2e (-14.7%)
              </span>
            </div>
            <span className="badge badge-green">
              <CheckCircle2 size={13} /> SẴN SÀNG XUẤT BẾN
            </span>
          </div>

          <MapView
            center={corridorPoints[Math.floor(corridorPoints.length / 2)] || [10.843, 106.755]}
            zoom={11}
            height="430px"
            defaultLayer="google_hybrid"
            default3D={true}
            defaultPitch={38}
            hudTitle={`Phiên bản tuyến v1 • Xe ${activeVehicle.vehicleCode || 'V001'} sẵn sàng xuất bến`}
          >
            <RoutePolyline
              positions={corridorPoints}
              color="#10b981"
              weight={5}
              showCorridorBuffer={true}
            />
            <OriginMarker position={corridorPoints[0]} title="Điểm xuất bến: Cảng Cát Lái" />
            <DestinationMarker
              position={corridorPoints[corridorPoints.length - 1]}
              title="Điểm giao hàng: KCN VSIP 1 Bình Dương"
            />
            <VehicleMarker
              position={corridorPoints[0]}
              vehicleCode={activeVehicle.vehicleCode || 'V001'}
              speedKmh={0}
              status="ON_ROUTE"
              title={`Xe ${activeVehicle.vehicleCode || 'V001'} (${activeVehicle.licensePlate || '51C-888.99'}) đang chờ lệnh xuất bến`}
            />
          </MapView>
        </div>
      </div>
    </div>
  );
}
