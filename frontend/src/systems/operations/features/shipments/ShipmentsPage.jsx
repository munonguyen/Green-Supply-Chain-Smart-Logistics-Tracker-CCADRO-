import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../../../services/api';
import { Link } from 'react-router-dom';
import { Plus, Route, Navigation, Package, Truck, Leaf, Radar, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import ElasticSearchBar from '../../../../shared/components/ElasticSearchBar';
import { loadStoredUserShipments } from '../../../customer/features/portal/CustomerPortalPage';

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
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [tripByShipmentId, setTripByShipmentId] = useState({});
  const [firstActiveTripId, setFirstActiveTripId] = useState('f0000000-0000-0000-0000-000000000001');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDeleted, setShowDeleted] = useState(false);
  const [softDeletedCodes, setSoftDeletedCodes] = useState(() => {
    try {
      const raw = window.localStorage.getItem('ccadro_soft_deleted_shipments_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const storedCustomerOrders = loadStoredUserShipments();
    api
      .getTrips()
      .then((tData) => {
        const tList = Array.isArray(tData?.result) ? tData.result : Array.isArray(tData) ? tData : [];
        if (tList.length > 0) {
          const map = {};
          tList.forEach((t) => {
            if (t?.shipmentId && t?.id) map[t.shipmentId] = t.id;
          });
          setTripByShipmentId(map);
          const enRoute = tList.find((t) => t.status === 'EN_ROUTE') || tList[0];
          if (enRoute?.id) setFirstActiveTripId(enRoute.id);
        }
      })
      .catch(() => {});

    api
      .getShipments({ includeDeleted: true })
      .then((data) => {
        const list = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setShipments(list);
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
              status: order.status || 'IN_TRANSIT',
              isDeleted: Boolean(order.isDeleted)
            });
          }
        });
        setShipments(merged);
        setLoading(false);
      });
  }, []);

  const isItemSoftDeleted = useCallback(
    (s) => Boolean(s?.isDeleted) || softDeletedCodes.includes(s?.shipmentCode),
    [softDeletedCodes]
  );

  const deletedCount = useMemo(
    () => shipments.filter((s) => isItemSoftDeleted(s)).length,
    [shipments, isItemSoftDeleted]
  );

  const scopedShipments = useMemo(() => {
    return shipments.filter((s) => {
      const deleted = isItemSoftDeleted(s);
      if (showDeleted ? !deleted : deleted) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      return true;
    });
  }, [shipments, isItemSoftDeleted, showDeleted, statusFilter]);

  const elasticResult = useMemo(
    () =>
      elasticSearchMatch(scopedShipments, searchQuery, [
        'shipmentCode',
        'customerId',
        'originName',
        'destinationName',
        'vehicleCode',
        'status'
      ]),
    [scopedShipments, searchQuery]
  );
  const filteredShipments = elasticResult.items;

  const handleSoftDeleteShipment = useCallback(
    (shipment) => {
      const code = shipment?.shipmentCode;
      if (!code) return;
      if (shipment?.id && !String(shipment.id).startsWith('cust-') && !String(shipment.id).startsWith('e0000000')) {
        api.softDeleteShipment(shipment.id, user?.username || 'dispatcher').catch(() => { });
      }
      setShipments((prev) =>
        prev.map((s) =>
          s.shipmentCode === code ? { ...s, isDeleted: true, deletedBy: user?.username || 'dispatcher' } : s
        )
      );
      setSoftDeletedCodes((prev) => {
        const next = prev.includes(code) ? prev : [...prev, code];
        try {
          window.localStorage.setItem('ccadro_soft_deleted_shipments_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [user?.username]
  );

  const handleRestoreShipment = useCallback((shipment) => {
    const code = shipment?.shipmentCode;
    if (!code) return;
    if (shipment?.id && !String(shipment.id).startsWith('cust-') && !String(shipment.id).startsWith('e0000000')) {
      api.restoreShipment(shipment.id).catch(() => { });
    }
    setShipments((prev) =>
      prev.map((s) => (s.shipmentCode === code ? { ...s, isDeleted: false, deletedBy: null } : s))
    );
    setSoftDeletedCodes((prev) => {
      const next = prev.filter((c) => c !== code);
      try {
        window.localStorage.setItem('ccadro_soft_deleted_shipments_v1', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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
          <Link to={`/trips/${firstActiveTripId}`} className="btn btn-secondary">
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
        <ElasticSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Elastic search: mã vận đơn, đối tác VINAMILK/SAMSUNG, cảng đi/đến không dấu..."
          totalCount={scopedShipments.length}
          matchedCount={filteredShipments.length}
          tookMs={elasticResult.tookMs}
          showDeleted={showDeleted}
          onToggleDeleted={() => setShowDeleted((prev) => !prev)}
          deletedCount={deletedCount}
          minWidth={320}
          rounded={10}
          style={{ flex: 1, maxWidth: 560 }}
        />

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
                        to={`/trips/${tripByShipmentId[s.id] || s.tripId || firstActiveTripId}`}
                        className="btn btn-primary"
                        style={{ padding: '6px 11px', fontSize: '0.78rem' }}
                      >
                        <Radar size={14} /> Giám Sát GPS
                      </Link>
                      {isItemSoftDeleted(s) ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreShipment(s)}
                          title="Khôi phục vận đơn đã xóa mềm"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.14)',
                            color: '#34d399',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <RotateCcw size={13} /> Khôi phục
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSoftDeleteShipment(s)}
                          title="Xóa mềm vận đơn (chuyển vào Thùng rác)"
                          style={{
                            padding: '6px 9px',
                            borderRadius: 8,
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
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
