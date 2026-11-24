import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../../../../services/api';
import { Link } from 'react-router-dom';
import {
  Plus,
  Route,
  Navigation,
  Package,
  Truck,
  Leaf,
  Radar,
  Trash2,
  RotateCcw,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import SearchToolbar from '../../../../shared/components/search/SearchToolbar';
import { loadStoredUserShipments } from '../../../customer/features/portal/CustomerPortalPage';
import './shipments.css';

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

  // Tab filter counts based on current soft-delete view mode
  const filterCounts = useMemo(() => {
    const pool = shipments.filter((s) => (showDeleted ? isItemSoftDeleted(s) : !isItemSoftDeleted(s)));
    return {
      ALL: pool.length,
      IN_TRANSIT: pool.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'EN_ROUTE').length,
      DEVIATION_ALERT: pool.filter((s) => s.status === 'DEVIATION_ALERT').length,
      PLANNED: pool.filter((s) => s.status === 'PLANNED').length
    };
  }, [shipments, isItemSoftDeleted, showDeleted]);

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
        api.softDeleteShipment(shipment.id, user?.username || 'dispatcher').catch(() => {});
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
      api.restoreShipment(shipment.id).catch(() => {});
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
      return (
        <span className="shipment-status-pill status-alert">
          <AlertTriangle size={13} />
          <span>Lệch Hành Lang</span>
        </span>
      );
    }
    if (status === 'IN_TRANSIT' || status === 'EN_ROUTE') {
      return (
        <span className="shipment-status-pill status-transit">
          <span className="live-pulse-dot" />
          <span>Đang Lưu Thông 3D</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="shipment-status-pill status-completed">
          <CheckCircle2 size={13} />
          <span>Hoàn Tất ePOD</span>
        </span>
      );
    }
    return (
      <span className="shipment-status-pill status-planned">
        <Clock size={13} />
        <span>Chờ Điều Phối</span>
      </span>
    );
  };

  const activeShipmentsCount = useMemo(
    () => shipments.filter((s) => !isItemSoftDeleted(s)).length,
    [shipments, isItemSoftDeleted]
  );
  const inTransitCount = useMemo(
    () => shipments.filter((s) => !isItemSoftDeleted(s) && (s.status === 'IN_TRANSIT' || s.status === 'DEVIATION_ALERT')).length,
    [shipments, isItemSoftDeleted]
  );
  const deviationCount = useMemo(
    () => shipments.filter((s) => !isItemSoftDeleted(s) && s.status === 'DEVIATION_ALERT').length,
    [shipments, isItemSoftDeleted]
  );

  return (
    <div className="page-body shipments-workspace">
      {/* Header & Top Actions */}
      <header className="shipments-header">
        <div className="shipments-header-title-group">
          <div className="shipments-overline">
            <span className="shipments-overline-dot" />
            <span>Quản Lý Vận Đơn &amp; Điều Phối Hành Lang Xanh</span>
          </div>
          <h2 className="shipments-main-title">
            Danh Sách Vận Đơn Toàn Hệ Thống
          </h2>
          <p className="shipments-subtitle">
            Quản lý lô hàng B2B, tối ưu lộ trình đa mục tiêu, phân công xe và giám sát định vị thời gian thực
          </p>
        </div>

        <div className="shipments-header-actions">
          <Link to={`/trips/${firstActiveTripId}`} className="shipment-btn-radar">
            <Radar size={16} />
            <span>Mở Radar 3D Live</span>
          </Link>
          <Link to="/shipments/new" className="shipment-btn-create">
            <Plus size={16} />
            <span>Tạo Vận Đơn Mới</span>
          </Link>
        </div>
      </header>

      {/* KPI Summary Grid */}
      <section className="shipments-kpi-grid" aria-label="Thống kê vận đơn">
        <div className="shipment-kpi-card kpi-total">
          <div className="shipment-kpi-info">
            <span className="shipment-kpi-label">Tổng Vận Đơn</span>
            <span className="shipment-kpi-value">{shipments.length}</span>
            <span className="shipment-kpi-subtext">{activeShipmentsCount} đơn đang hoạt động</span>
          </div>
          <div className="shipment-kpi-icon-box">
            <Package size={24} />
          </div>
        </div>

        <div className="shipment-kpi-card kpi-transit">
          <div className="shipment-kpi-info">
            <span className="shipment-kpi-label">Đang Lưu Thông</span>
            <span className="shipment-kpi-value">{inTransitCount}</span>
            <span className="shipment-kpi-subtext">Giám sát GPS &amp; cảm biến</span>
          </div>
          <div className="shipment-kpi-icon-box">
            <Truck size={24} />
          </div>
        </div>

        <div className="shipment-kpi-card kpi-alert">
          <div className="shipment-kpi-info">
            <span className="shipment-kpi-label">Cảnh Báo Lệch Tuyến</span>
            <span className="shipment-kpi-value">{deviationCount}</span>
            <span className="shipment-kpi-subtext">{deviationCount > 0 ? 'Cần điều phối viên can thiệp' : 'Lộ trình an toàn 100%'}</span>
          </div>
          <div className="shipment-kpi-icon-box">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="shipment-kpi-card kpi-carbon">
          <div className="shipment-kpi-info">
            <span className="shipment-kpi-label">CO2e Đã Tiết Kiệm</span>
            <span className="shipment-kpi-value">-89.4 kg</span>
            <span className="shipment-kpi-subtext">Định mức GLEC v3 &amp; ESG</span>
          </div>
          <div className="shipment-kpi-icon-box">
            <Leaf size={24} />
          </div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="shipments-toolbar-card" aria-label="Bộ lọc và tìm kiếm">
        <div className="shipments-search-box">
          <SearchToolbar
            value={searchQuery}
            onChange={setSearchQuery}
            label="Tìm vận đơn"
            loading={loading}
            placeholder="Mã vận đơn, công ty hoặc điểm đi / đến…"
            totalCount={scopedShipments.length}
            matchedCount={filteredShipments.length}
            showDeleted={showDeleted}
            onToggleDeleted={() => setShowDeleted((prev) => !prev)}
            deletedCount={deletedCount}
          />
        </div>

        {/* High-Contrast Segmented Filter Pills */}
        <div className="shipments-filter-pills" role="tablist" aria-label="Lọc theo trạng thái">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'ALL'}
            className={`shipment-filter-pill pill-all ${statusFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <Layers size={14} />
            <span>Tất cả vận đơn</span>
            <span className="shipment-pill-count">{filterCounts.ALL}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'IN_TRANSIT'}
            className={`shipment-filter-pill pill-transit ${statusFilter === 'IN_TRANSIT' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('IN_TRANSIT')}
          >
            <Truck size={14} />
            <span>Đang lưu thông</span>
            <span className="shipment-pill-count">{filterCounts.IN_TRANSIT}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'DEVIATION_ALERT'}
            className={`shipment-filter-pill pill-alert ${statusFilter === 'DEVIATION_ALERT' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('DEVIATION_ALERT')}
          >
            <AlertTriangle size={14} />
            <span>Lệch hành lang</span>
            <span className="shipment-pill-count">{filterCounts.DEVIATION_ALERT}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'PLANNED'}
            className={`shipment-filter-pill pill-planned ${statusFilter === 'PLANNED' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('PLANNED')}
          >
            <Clock size={14} />
            <span>Chờ điều phối</span>
            <span className="shipment-pill-count">{filterCounts.PLANNED}</span>
          </button>
        </div>
      </section>

      {/* Shipments Fleet Table */}
      <div className="shipments-table-card">
        <table className="shipments-table">
          <thead>
            <tr>
              <th scope="col">Mã Vận Đơn</th>
              <th scope="col">Chủ Hàng B2B</th>
              <th scope="col">Hành Trình (Origin → Destination)</th>
              <th scope="col">Tải Trọng</th>
              <th scope="col">Trạng Thái</th>
              <th scope="col">Thao Tác Điều Hành 3D</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  Đang tải dữ liệu vận đơn…
                </td>
              </tr>
            ) : filteredShipments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  Không tìm thấy vận đơn phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredShipments.map((s) => (
                <tr key={s.id || s.shipmentCode}>
                  <td>
                    <span className="shipment-code-chip">
                      <Package size={13} />
                      {s.shipmentCode}
                    </span>
                  </td>
                  <td>
                    <span className="shipment-customer-badge">
                      <Building2 size={12} />
                      {s.customerId}
                    </span>
                  </td>
                  <td>
                    <div className="shipment-route-cell">
                      <div className="shipment-route-origin" title={s.originName}>
                        <span className="route-dot-origin" />
                        <span>{s.originName}</span>
                      </div>
                      <div className="shipment-route-destination" title={s.destinationName}>
                        <span className="route-dot-dest" />
                        <span>{s.destinationName}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="shipment-weight-stack">
                      <span className="shipment-weight-val">{s.cargoWeightTons} tấn</span>
                      {s.vehicleCode && (
                        <span className="shipment-vehicle-sub" title={s.vehicleCode}>
                          <Truck size={11} />
                          {s.vehicleCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{renderStatusBadge(s.status)}</td>
                  <td>
                    <div className="shipment-row-actions">
                      <Link
                        to={`/planning/${s.id}`}
                        className="action-btn-route"
                        title="Lập tuyến vận tải đa tiêu chí"
                      >
                        <Route size={14} />
                        <span>Lập Tuyến 3D</span>
                      </Link>
                      <Link
                        to={`/dispatch/${s.id}`}
                        className="action-btn-dispatch"
                        title="Điều phối phương tiện & tài xế"
                      >
                        <Navigation size={14} />
                        <span>Điều Phối</span>
                      </Link>
                      <Link
                        to={`/trips/${tripByShipmentId[s.id] || s.tripId || firstActiveTripId}`}
                        className="action-btn-gps"
                        title="Theo dõi hành trình GPS & cảm biến"
                      >
                        <Radar size={14} />
                        <span>Giám Sát GPS</span>
                      </Link>
                      {isItemSoftDeleted(s) ? (
                        <button
                          type="button"
                          className="action-btn-restore"
                          onClick={() => handleRestoreShipment(s)}
                          title="Khôi phục vận đơn đã xóa mềm"
                        >
                          <RotateCcw size={13} />
                          <span>Khôi phục</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="action-btn-delete"
                          onClick={() => handleSoftDeleteShipment(s)}
                          title="Xóa mềm vận đơn (chuyển vào Thùng rác)"
                          aria-label={`Xóa vận đơn ${s.shipmentCode}`}
                        >
                          <Trash2 size={14} />
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
