import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Route, Navigation, Search, Package, Truck, Leaf, Radar } from 'lucide-react';
import { loadStoredUserShipments } from './CustomerPortalPage';

const FALLBACK_INTERNAL_SHIPMENTS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    shipmentCode: 'SH-2026-081',
    customerId: 'VINAMILK',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'KCN VSIP 1, Bình Dương',
    cargoWeightTons: 14.5,
    vehicleCode: 'V001 • 51C-888.99 (EV)',
    co2SavedKg: 20.7,
    status: 'IN_TRANSIT'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    shipmentCode: 'SH-2026-082',
    customerId: 'SAMSUNG_VN',
    originName: 'Cảng Cái Mép, Bà Rịa – Vũng Tàu',
    destinationName: 'KCN Nhơn Trạch, Đồng Nai',
    cargoWeightTons: 21.0,
    vehicleCode: 'V003 • 60C-912.45 (EV)',
    co2SavedKg: 35.5,
    status: 'IN_TRANSIT'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    shipmentCode: 'SH-2026-083',
    customerId: 'UNILEVER_VN',
    originName: 'KCN Sóng Thần, Dĩ An',
    destinationName: 'Cảng Cát Lái, TP. Thủ Đức',
    cargoWeightTons: 18.2,
    vehicleCode: 'V002 • 51D-662.18 (Euro 5)',
    co2SavedKg: 18.4,
    status: 'DEVIATION_ALERT'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    shipmentCode: 'SH-2026-084',
    customerId: 'TH_TRUE_MILK',
    originName: 'Cảng Hiệp Phước, Nhà Bè',
    destinationName: 'KCN Tân Bình, TP. HCM',
    cargoWeightTons: 12.0,
    vehicleCode: 'V004 • 50E-123.45 (EV)',
    co2SavedKg: 14.8,
    status: 'PLANNED'
  }
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const storedCustomerOrders = loadStoredUserShipments();
    api
      .getShipments()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShipments(data);
        } else {
          setShipments(FALLBACK_INTERNAL_SHIPMENTS);
        }
        setLoading(false);
      })
      .catch(() => {
        const merged = [...FALLBACK_INTERNAL_SHIPMENTS];
        storedCustomerOrders.forEach((order) => {
          if (!merged.some((m) => m.shipmentCode === order.shipmentCode)) {
            merged.unshift({
              id: order.id || `cust-${order.shipmentCode}`,
              shipmentCode: order.shipmentCode,
              customerId: order.customerId || 'VINAMILK',
              originName: order.originName,
              destinationName: order.destinationName,
              cargoWeightTons: order.cargoWeightTons,
              vehicleCode: `${order.licensePlate || '51C-888.99'} (${order.vehicleType || 'EV'})`,
              co2SavedKg: order.co2SavedKg || 19.5,
              status: order.status || 'IN_TRANSIT'
            });
          }
        });
        setShipments(merged);
        setLoading(false);
      });
  }, []);

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.shipmentCode || '').toLowerCase().includes(q) ||
        (s.customerId || '').toLowerCase().includes(q) ||
        (s.originName || '').toLowerCase().includes(q) ||
        (s.destinationName || '').toLowerCase().includes(q)
      );
    });
  }, [shipments, searchQuery, statusFilter]);

  const renderStatusBadge = (status) => {
    if (status === 'DEVIATION_ALERT') {
      return <span className="badge badge-red">● Cảnh Báo Lệch Tuyến</span>;
    }
    if (status === 'IN_TRANSIT') {
      return <span className="badge badge-green">● Đang Lưu Thông 3D</span>;
    }
    if (status === 'COMPLETED') {
      return <span className="badge badge-blue">✓ Hoàn Tất ePOD</span>;
    }
    return <span className="badge badge-yellow">◐ Chờ Điều Phối</span>;
  };

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
            QUẢN LÝ VẬN ĐƠN &amp; ĐIỀU PHỐI HÀNH LANG XANH
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>
            Danh Sách Vận Đơn Toàn Hệ Thống
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Quản lý lô hàng B2B, tối ưu lộ trình 3D Pareto (UC05), phân công xe và giám sát GPS thời
            gian thực (UC09)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/trips/f0000000-0000-0000-0000-000000000001" className="btn btn-secondary">
            <Radar size={16} />
            <span>Mở Radar 3D Live</span>
          </Link>
          <Link to="/shipments/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Tạo Vận Đơn Mới</span>
          </Link>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat-card" style={{ padding: '16px 18px' }}>
          <div>
            <div className="stat-label">Tổng Vận Đơn</div>
            <div className="stat-value" style={{ fontSize: '1.55rem' }}>
              {shipments.length}
            </div>
          </div>
          <Package size={28} color="#10b981" />
        </div>
        <div className="card stat-card" style={{ padding: '16px 18px' }}>
          <div>
            <div className="stat-label">Đang Lưu Thông</div>
            <div
              className="stat-value"
              style={{ fontSize: '1.55rem', color: 'var(--accent-blue)' }}
            >
              {
                shipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'DEVIATION_ALERT')
                  .length
              }
            </div>
          </div>
          <Truck size={28} color="var(--accent-blue)" />
        </div>
        <div className="card stat-card" style={{ padding: '16px 18px' }}>
          <div>
            <div className="stat-label">Cảnh Báo Lệch Tuyến</div>
            <div
              className="stat-value"
              style={{ fontSize: '1.55rem', color: 'var(--accent-amber)' }}
            >
              {shipments.filter((s) => s.status === 'DEVIATION_ALERT').length}
            </div>
          </div>
          <Radar size={28} color="var(--accent-amber)" />
        </div>
        <div className="card stat-card" style={{ padding: '16px 18px' }}>
          <div>
            <div className="stat-label">CO2e Đã Tiết Kiệm</div>
            <div
              className="stat-value"
              style={{ fontSize: '1.55rem', color: 'var(--accent-green-light)' }}
            >
              -89.4 kg
            </div>
          </div>
          <Leaf size={28} color="var(--accent-green)" />
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 420 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã vận đơn, mã đối tác (VINAMILK, SAMSUNG...), cảng đi/đến..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.45)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tất cả vận đơn' },
            { id: 'IN_TRANSIT', label: 'Đang lưu thông' },
            { id: 'DEVIATION_ALERT', label: 'Lệch hành lang' },
            { id: 'PLANNED', label: 'Chờ điều phối' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '7px 13px',
                borderRadius: 8,
                border:
                  statusFilter === tab.id
                    ? '1px solid #10b981'
                    : '1px solid rgba(148, 163, 184, 0.22)',
                background:
                  statusFilter === tab.id ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 42, 0.4)',
                color: statusFilter === tab.id ? '#34d399' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="card table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã Vận Đơn</th>
              <th>Chủ Hàng B2B</th>
              <th>Điểm Đi (Origin)</th>
              <th>Điểm Đến (Destination)</th>
              <th>Tải Trọng</th>
              <th>Trạng Thái</th>
              <th>Thao Tác Điều Hành 3D</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                  Đang tải dữ liệu vận đơn...
                </td>
              </tr>
            ) : filteredShipments.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                  Không tìm thấy vận đơn phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredShipments.map((s) => (
                <tr key={s.id || s.shipmentCode}>
                  <td>
                    <b style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                      {s.shipmentCode}
                    </b>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {s.customerId}
                    </span>
                  </td>
                  <td>{s.originName}</td>
                  <td>{s.destinationName}</td>
                  <td>
                    <strong>{s.cargoWeightTons} tấn</strong>
                  </td>
                  <td>{renderStatusBadge(s.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/planning/${s.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 11px', fontSize: '0.78rem' }}
                      >
                        <Route size={14} /> Lập Tuyến 3D
                      </Link>
                      <Link
                        to={`/dispatch/${s.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 11px', fontSize: '0.78rem' }}
                      >
                        <Navigation size={14} /> Điều Phối
                      </Link>
                      <Link
                        to="/trips/f0000000-0000-0000-0000-000000000001"
                        className="btn btn-primary"
                        style={{ padding: '6px 11px', fontSize: '0.78rem' }}
                      >
                        <Radar size={14} /> Giám Sát GPS
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
