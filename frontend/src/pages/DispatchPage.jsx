import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Truck, UserCheck, ShieldCheck, Activity, Route, CheckCircle2 } from 'lucide-react';
import MapView from '../components/map/MapView';
import RoutePolyline from '../components/map/RoutePolyline';
import OriginMarker from '../components/map/OriginMarker';
import DestinationMarker from '../components/map/DestinationMarker';
import VehicleMarker from '../components/map/VehicleMarker';
import { getRealRoadRoute } from '../services/roadRoutingService';

const DISPATCH_CORRIDOR = getRealRoadRoute('catlai', 'vsip').points;

export default function DispatchPage() {
  const { shipmentId } = useParams();
  const demoTripId = 'f0000000-0000-0000-0000-000000000001';

  return (
    <div className="page-body">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#10b981',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4
            }}
          >
            PHÊ DUYỆT XUẤT BẾN &amp; GÁN TÀI SẢN ĐỘI XE XANH
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
            Điều Phối Phương Tiện &amp; Khóa Phiên Bản Lộ Trình 3D
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Gán xe đầu kéo đạt chuẩn kiểm định Pre-trip và tài xế đủ điều kiện vào lộ trình xanh đã
            tối ưu (Mã vận đơn:{' '}
            <code style={{ color: '#34d399' }}>{(shipmentId || 'SH-2026-081').slice(0, 12)}</code>)
          </p>
        </div>

        <Link
          to={`/planning/${shipmentId || 'e0000000-0000-0000-0000-000000000001'}`}
          className="btn btn-secondary"
        >
          <Route size={15} /> Quay Lại Lập Tuyến 3D (UC05)
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(330px, 1fr) minmax(420px, 1.4fr)',
          gap: 20,
          alignItems: 'start'
        }}
      >
        {/* Left: Assigned Fleet Assets & Pre-Trip Verification */}
        <div className="card">
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 16 }}>
            Hồ Sơ Phương Tiện &amp; Tài Xế Được Phân Công
          </h3>

          <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(56, 189, 248, 0.28)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Truck size={20} color="#38bdf8" />
                <b style={{ fontSize: '0.95rem' }}>Phương tiện V001 • 51C-888.99</b>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                • Loại phương tiện: <strong>Xe đầu kéo điện (EV) / Euro 5</strong>
                <br />• Tải trọng tối đa: <strong>20.0 tấn</strong> (Đạt chuẩn GLEC v3)
                <br />• Kiểm định Pre-trip (UC01):{' '}
                <strong style={{ color: '#34d399' }}>ĐẠT 6/6 HẠNG MỤC AN TOÀN</strong>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.28)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <UserCheck size={20} color="#10b981" />
                <b style={{ fontSize: '0.95rem' }}>Tài xế chính D001 • Nguyễn Văn Tài</b>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                • Hạng bằng lái: <strong>FC (Container &amp; Chuỗi lạnh)</strong>
                <br />• Điện thoại liên lạc NOC: <strong>0901 234 567</strong>
                <br />• Điểm lái xe sinh thái (Eco-Driving):{' '}
                <strong style={{ color: '#34d399' }}>98/100 điểm</strong>
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
              <strong style={{ color: '#34d399', display: 'block', marginBottom: 2 }}>
                Đã khóa Phiên bản Lộ trình Xanh v1 (PostGIS Buffer 50m / 200m)
              </strong>
              Thiết bị định vị GPS trên xe V001 đã đồng bộ tọa độ với trung tâm chỉ huy NOC. Sẵn
              sàng kích hoạt luồng giám sát thời gian thực.
            </div>
          </div>

          <Link
            to={`/trips/${demoTripId}`}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
          >
            <Activity size={17} />
            <span>Kích Hoạt Giám Sát Hành Trình 3D Trực Tuyến (UC09)</span>
          </Link>
        </div>

        {/* Right: 3D Locked Corridor Map Preview */}
        <div className="card" style={{ padding: 16 }}>
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
                Bản Đồ 3D Hành Lang Xuất Bến Đã Khóa (Cát Lái → VSIP 1)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cự ly: 27.3 km • Dự toán phát thải: 21.84 kg CO2e (-14.7%)
              </span>
            </div>
            <span className="badge badge-green">
              <CheckCircle2 size={13} /> SẴN SÀNG XUẤT BẾN
            </span>
          </div>

          <MapView
            center={[10.843, 106.755]}
            zoom={11}
            height="430px"
            defaultTile="google_hybrid"
            default3D={true}
            defaultPitch={38}
            overlayTitle="Phiên bản tuyến v1 • Xe V001 sẵn sàng tại Cảng Cát Lái"
          >
            <RoutePolyline
              positions={DISPATCH_CORRIDOR}
              color="#10b981"
              weight={5}
              showCorridorBuffer={true}
            />
            <OriginMarker position={DISPATCH_CORRIDOR[0]} label="Điểm xuất bến: Cảng Cát Lái" />
            <DestinationMarker
              position={DISPATCH_CORRIDOR[DISPATCH_CORRIDOR.length - 1]}
              label="Điểm giao hàng: KCN VSIP 1 Bình Dương"
            />
            <VehicleMarker
              position={DISPATCH_CORRIDOR[0]}
              vehicleCode="V001"
              speedKmh={0}
              status="ON_ROUTE"
              label="Xe V001 (51C-888.99) đang chờ lệnh xuất bến tại cổng cảng"
            />
          </MapView>
        </div>
      </div>
    </div>
  );
}
