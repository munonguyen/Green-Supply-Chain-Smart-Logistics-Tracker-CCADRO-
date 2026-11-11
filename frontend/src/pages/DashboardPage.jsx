import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import CountingNumber from '../components/ui/CountingNumber';
import CarbonBenchmarkChart from '../components/charts/CarbonBenchmarkChart';
import FleetStatusDonutChart from '../components/charts/FleetStatusDonutChart';
import CorridorEfficiencyBarChart from '../components/charts/CorridorEfficiencyBarChart';
import DeviationTrendSparkline from '../components/charts/DeviationTrendSparkline';
import RealTimeFleetMap3D from '../components/map/RealTimeFleetMap3D';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { loadStoredUserShipments } from './CustomerPortalPage';
import {
  Server,
  CheckCircle2,
  ShieldAlert,
  Truck,
  Package,
  Bell,
  Layers,
  ChevronRight,
  ShieldCheck,
  Users
} from 'lucide-react';

const DEMO_SHIPMENTS_FALLBACK = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    shipmentCode: 'SHP-2026-0001',
    customerId: 'VINAMILK',
    originName: 'Cảng Cát Lái, TP.HCM',
    destinationName: 'KCN VSIP 1, Bình Dương',
    cargoWeightTons: 14.2,
    distance: '27.25 KM',
    status: 'IN_TRANSIT'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    shipmentCode: 'SHP-2026-0002',
    customerId: 'SAMSUNG_VN',
    originName: 'KCN Công Nghệ Cao Q9, TP.HCM',
    destinationName: 'Cảng Cái Mép - Thị Vải, BR-VT',
    cargoWeightTons: 18.5,
    distance: '64.80 KM',
    status: 'PENDING'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    shipmentCode: 'SHP-2026-0003',
    customerId: 'UNILEVER_VN',
    originName: 'ICD Sóng Thần, Bình Dương',
    destinationName: 'Cảng Cát Lái, TP.HCM',
    cargoWeightTons: 12.0,
    distance: '22.10 KM',
    status: 'COMPLETED'
  }
];

const DEMO_VEHICLES_FALLBACK = [
  {
    id: 'v1',
    vehicleCode: 'V001',
    licensePlate: '51C-888.99',
    vehicleType: 'HEAVY_TRUCK_EURO5',
    maxPayloadTons: 25.0,
    status: 'IN_TRANSIT'
  },
  {
    id: 'v2',
    vehicleCode: 'V002',
    licensePlate: '51D-797.88',
    vehicleType: 'ELECTRIC_VAN_EV',
    maxPayloadTons: 15.0,
    status: 'AVAILABLE'
  },
  {
    id: 'v3',
    vehicleCode: 'V003',
    licensePlate: '61C-456.12',
    vehicleType: 'CONTAINER_TRACTOR',
    maxPayloadTons: 32.0,
    status: 'AVAILABLE'
  },
  {
    id: 'v4',
    vehicleCode: 'V004',
    licensePlate: '51C-123.45',
    vehicleType: 'HEAVY_TRUCK_EURO5',
    maxPayloadTons: 20.0,
    status: 'MAINTENANCE'
  }
];

const ENTERPRISE_MODULES = [
  {
    code: 'IAM-01',
    name: 'Quản Trị Định Danh & Phân Quyền',
    domain: 'Bảo mật tiêu chuẩn doanh nghiệp, xác thực JWT & phân quyền 6 vai trò',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'FLT-02',
    name: 'Quản Lý Hạm Đội & Kiểm Định Pre-Trip',
    domain: 'Hồ sơ phương tiện tải trọng cao, xe van điện EV & kiểm định an toàn',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'SHP-03',
    name: 'Điều Phối Vận Đơn & Luồng Hàng Hóa',
    domain: 'Quản lý đơn hàng B2B, thẩm định điều kiện xuất bến & chứng từ số',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'OPT-04',
    name: 'Tối Ưu Lộ Trình Xanh Pareto',
    domain: 'Cân bằng phát thải CO2e, thời gian giao hàng, cự ly & chi phí',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'GPS-05',
    name: 'Giám Sát Vệ Tinh GPS & Độ Lệch Tuyến',
    domain: 'Dữ liệu không gian địa lý, cảnh báo đệm 50m/200m & đổi hướng động',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'ESG-06',
    name: 'Kiểm Toán & Hạch Toán Carbon GLEC v3',
    domain: 'Định mức phát thải Well-to-Wheel (WTW) & xuất báo cáo ESG số',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'INC-07',
    name: 'Xử Lý Sự Cố Hiện Trường & Khiếu Nại',
    domain: 'Ghi nhận tai nạn, giải tỏa ùn tắc giao thông & giải quyết sự cố',
    status: 'HOẠT ĐỘNG'
  },
  {
    code: 'EMG-08',
    name: 'Trung Tâm Phát Lệnh Khẩn Cấp Đa Kênh',
    domain: 'Truyền thông tin thời gian thực đến điều phối viên và tài xế',
    status: 'HOẠT ĐỘNG'
  }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, accounts = [] } = useAuth();

  const [health, setHealth] = useState(null);
  const [shipments, setShipments] = useState(() => {
    const customerBooked = loadStoredUserShipments().map((s) => ({
      id: s.id,
      shipmentCode: s.shipmentCode,
      customerId: s.customerId,
      originName: s.originName,
      destinationName: s.destinationName,
      cargoWeightTons: s.cargoWeightTons,
      distance: `${s.distanceKm} KM`,
      status: s.status
    }));
    const existingCodes = new Set(customerBooked.map((c) => c.shipmentCode));
    return [
      ...customerBooked,
      ...DEMO_SHIPMENTS_FALLBACK.filter((d) => !existingCodes.has(d.shipmentCode))
    ];
  });
  const [vehicles, setVehicles] = useState(DEMO_VEHICLES_FALLBACK);
  const [notificationsCount, setNotificationsCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'vehicles' | 'users'

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [healthRes, shipRes, vehRes, notifRes] = await Promise.allSettled([
          api.getHealth(),
          api.getShipments(),
          api.getVehicles(),
          api.getNotifications({ status: 'UNREAD' })
        ]);

        if (!isMounted) return;

        if (healthRes.status === 'fulfilled' && healthRes.value) {
          setHealth(healthRes.value);
        }
        if (shipRes.status === 'fulfilled') {
          const list = shipRes.value?.result || (Array.isArray(shipRes.value) ? shipRes.value : []);
          if (list.length > 0) setShipments(list);
        }
        if (vehRes.status === 'fulfilled') {
          const list = vehRes.value?.result || (Array.isArray(vehRes.value) ? vehRes.value : []);
          if (list.length > 0) setVehicles(list);
        }
        if (notifRes.status === 'fulfilled') {
          const list =
            notifRes.value?.result || (Array.isArray(notifRes.value) ? notifRes.value : []);
          setNotificationsCount(list.length);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleShipments =
    user?.role === 'SHIPPER' && user?.customerId
      ? shipments.filter((s) => s.customerId === user.customerId)
      : shipments;

  return (
    <div className="page-body" style={{ position: 'relative' }}>
      {/* Background Ambient Mesh */}
      <div className="ambient-gradient-mesh" />

      {/* 1. HERO ROLE & SYSTEM BRIEFING */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card glass-card-interactive"
        style={{
          marginBottom: '24px',
          background:
            'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(9, 13, 22, 0.95) 100%)',
          border: `1px solid ${user?.border || 'rgba(16, 185, 129, 0.35)'}`
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '18px'
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
            >
              <span
                style={{
                  background: user?.bgDim || 'rgba(16, 185, 129, 0.15)',
                  color: user?.color || '#34d399',
                  border: `1px solid ${user?.color || '#10b981'}`,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span
                  className="radar-dot"
                  style={{ backgroundColor: user?.color || '#34d399' }}
                ></span>
                {user?.role || 'ADMIN'}
              </span>

              <span
                style={{
                  fontSize: '0.74rem',
                  color: user?.zone === 'INTERNAL_CORE' ? '#38bdf8' : '#f472b6',
                  fontWeight: 600
                }}
              >
                ●{' '}
                {user?.zone === 'INTERNAL_CORE'
                  ? 'Mạng Nội Bộ Vận Hành'
                  : 'Cổng Đối Tác B2B Extranet'}
              </span>

              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                <CheckCircle2 size={12} /> Giám Sát Hành Lang Vệ Tinh 24/7
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '6px'
              }}
            >
              Xin chào, {user?.fullName || 'Administrator'} • Hệ Thống Giám Sát &amp; Điều Hành Nội
              Bộ
            </h2>

            <p
              style={{ fontSize: '0.84rem', color: '#94a3b8', maxWidth: '850px', lineHeight: 1.5 }}
            >
              Trung tâm chỉ huy vận tải đa phương thức dành cho nhân sự nội bộ: tối ưu lộ trình xanh
              đa mục tiêu Pareto (UC05), giám sát cảnh báo lệch hành lang 50m/200m theo thời gian
              thực (UC09), kiểm soát tài khoản đối tác B2B và kiểm toán phát thải GLEC v3.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => navigate('/shipments/new')}
              className="btn btn-primary"
            >
              <Package size={15} />
              <span>Tạo Vận Đơn Mới</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => navigate('/governance')}
              className="btn btn-secondary"
            >
              <ShieldAlert size={15} color="#34d399" />
              <span>Kiểm Định Xe Pre-Trip</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 2. TOP METRICS ROW (4 CARDS) */}
      <div className="grid-4">
        {/* Card 1: Backend System Mesh */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Trạng Thái Trung Tâm NOC</div>
            <div
              className="stat-value"
              style={{
                color:
                  health?.status === 'UP' ? 'var(--accent-green-light)' : 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {health?.status === 'UP' && <span className="radar-dot"></span>}
              <span>{loading ? 'Checking...' : health?.status || 'UP'}</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              9 Phân Hệ Nghiệp Vụ • SLA 99,94%
            </span>
          </div>
          <Server size={32} color="var(--accent-green)" />
        </motion.div>

        {/* Card 2: Shipments */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">
              {user?.role === 'SHIPPER' ? 'Vận Đơn Thuộc Mã' : 'Tổng Vận Đơn Giám Sát'}
            </div>
            <div className="stat-value" style={{ color: 'var(--text-main)' }}>
              <CountingNumber value={visibleShipments.length} />
            </div>
            <span style={{ fontSize: '0.74rem', color: '#34d399' }}>
              Định Tuyến Đa Mục Tiêu Pareto
            </span>
          </div>
          <Package size={32} color="#34d399" />
        </motion.div>

        {/* Card 3: Fleet */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Hạm Đội Trực Ban</div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>
              <CountingNumber value={vehicles.length} />{' '}
              <span style={{ fontSize: '1.1rem' }}>Xe</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Euro 5 &amp; Đầu Kéo Điện EV
            </span>
          </div>
          <Truck size={32} color="#38bdf8" />
        </motion.div>

        {/* Card 4: Emergency Notifications */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Cảnh Báo Chờ Xử Lý</div>
            <div
              className="stat-value"
              style={{
                color: notificationsCount > 0 ? '#f87171' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {notificationsCount > 0 && <span className="radar-dot radar-dot-red"></span>}
              <CountingNumber value={notificationsCount} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Sự Cố</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#fca5a5' }}>
              Kênh Cảnh Báo Thời Gian Thực
            </span>
          </div>
          <Bell size={32} color="#ef4444" />
        </motion.div>
      </div>

      {/* 2B. REAL-TIME 3D GOOGLE HYBRID SATELLITE FLEET MAP */}
      <RealTimeFleetMap3D
        height={490}
        title="Bản Đồ Vệ Tinh 3D Giám Sát Toàn Đội Xe Thời Gian Thực (Google Hybrid 3D)"
      />

      {/* 3. FOUR STATISTICAL CHARTS (2x2 GRID) */}
      <div className="grid-2">
        {/* Chart 1: Carbon Benchmark (UC13) */}
        <CarbonBenchmarkChart />

        {/* Chart 2: Fleet Utilization Donut */}
        <FleetStatusDonutChart />

        {/* Chart 3: Corridor Speed & Eco-Score (UC10) */}
        <CorridorEfficiencyBarChart />

        {/* Chart 4: Deviation Trend & Dynamic Reroutes (UC09/10) */}
        <DeviationTrendSparkline />
      </div>

      {/* 4. REAL-TIME FLEET, SHIPMENTS & PARTNER REGISTRY CONSOLE */}
      <div className="card glass-card-interactive" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Layers size={18} color="#10b981" />
              <span>Bảng Giám Sát Vận Đơn, Đội Xe &amp; Đối Tác Khách Hàng B2B</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              Đồng bộ thời gian thực giữa Hệ Thống Giám Sát Nội Bộ và Cổng Khách Hàng Doanh Nghiệp
            </p>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '3px',
              borderRadius: '8px',
              gap: '4px',
              flexWrap: 'wrap'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('shipments')}
              style={{
                background: activeTab === 'shipments' ? 'var(--accent-green)' : 'transparent',
                color: activeTab === 'shipments' ? '#090d16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Vận Đơn ({visibleShipments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              style={{
                background: activeTab === 'vehicles' ? 'var(--accent-green)' : 'transparent',
                color: activeTab === 'vehicles' ? '#090d16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Phương Tiện ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              style={{
                background: activeTab === 'users' ? 'var(--accent-green)' : 'transparent',
                color: activeTab === 'users' ? '#090d16' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Users size={13} />
              <span>Tài Khoản Hệ Thống ({accounts.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Shipments Table */}
        {activeTab === 'shipments' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Vận Đơn</th>
                  <th>Chủ Hàng (B2B)</th>
                  <th>Điểm Xuất Phát (Origin)</th>
                  <th>Điểm Đến (Destination)</th>
                  <th>Tải Trọng</th>
                  <th>Cự Ly (Haversine)</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {visibleShipments.map((s) => (
                  <tr key={s.id || s.shipmentCode}>
                    <td>
                      <code style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                        {s.shipmentCode || s.code}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.customerId || s.customerName || 'VINAMILK'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {s.originName || 'Cảng Cát Lái, TP.HCM'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {s.destinationName || 'KCN VSIP 1, Bình Dương'}
                    </td>
                    <td>
                      <strong>{s.cargoWeightTons || s.weightTons || 14.5}</strong> tấn
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>
                      {s.distance || '27.25 KM'}
                    </td>
                    <td>
                      <span
                        className={
                          s.status === 'IN_TRANSIT'
                            ? 'badge badge-green'
                            : s.status === 'COMPLETED'
                              ? 'badge badge-blue'
                              : 'badge badge-amber'
                        }
                      >
                        {s.status === 'IN_TRANSIT' && (
                          <span className="radar-dot" style={{ marginRight: '4px' }}></span>
                        )}
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/planning/${s.id || 'c0000000-0000-0000-0000-000000000001'}`)
                        }
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>Lập Tuyến</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Vehicles Table */}
        {activeTab === 'vehicles' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Xe</th>
                  <th>Biển Số Xe</th>
                  <th>Loại Động Cơ / Tiêu Chuẩn</th>
                  <th>Tải Trọng Tối Đa</th>
                  <th>Tiêu Chuẩn Khí Thải</th>
                  <th>Trạng Thái</th>
                  <th>Kiểm Định Xe</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id || v.vehicleCode}>
                    <td>
                      <code style={{ color: '#34d399', fontWeight: 700 }}>
                        {v.vehicleCode || 'V001'}
                      </code>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                        {v.licensePlate || v.plateNumber || '51C-888.99'}
                      </strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {v.vehicleType || 'HEAVY_TRUCK_EURO5'}
                    </td>
                    <td>
                      <strong>{v.maxPayloadTons || 25.0}</strong> tấn
                    </td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                        {v.euroStandard || 'EURO_5 / EV'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          v.status === 'AVAILABLE'
                            ? 'badge badge-blue'
                            : v.status === 'IN_TRANSIT'
                              ? 'badge badge-green'
                              : 'badge badge-amber'
                        }
                      >
                        {v.status || 'AVAILABLE'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Đã Kiểm Định</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Unified System Accounts Directory */}
        {activeTab === 'users' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Hệ thống khởi tạo chỉ với <strong>01 tài khoản Root Admin</strong>. Các tài khoản
                nhân sự nội bộ (<code>DISPATCHER</code>, <code>SAFETY_MANAGER</code>,{' '}
                <code>DRIVER</code>, <code>ESG_AUDITOR</code>) do Admin trực tiếp tạo và phân quyền;
                khách hàng B2B có thể tự đăng ký tại <code>/register</code>.
              </div>
              <button
                type="button"
                onClick={() => navigate('/governance')}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShieldCheck size={14} />
                <span>Quản Lý &amp; Tạo Tài Khoản Nội Bộ (IAM)</span>
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tài Khoản</th>
                    <th>Họ Tên Nhân Sự / Đại Diện</th>
                    <th>Phòng Ban / Doanh Nghiệp</th>
                    <th>Vai Trò (Role)</th>
                    <th>Số Quyền Được Cấp</th>
                    <th>Nguồn Khởi Tạo</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.username}>
                      <td>
                        <code style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                          @{acc.username}
                        </code>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>{acc.fullName}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {acc.email}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {acc.companyName || acc.department}
                      </td>
                      <td>
                        <span
                          className={
                            acc.role === 'SHIPPER' ? 'badge badge-amber' : 'badge badge-green'
                          }
                          style={{ fontSize: '0.7rem' }}
                        >
                          {acc.role}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--accent-green)' }}>
                          {(acc.permissions || []).length}
                        </strong>{' '}
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          quyền
                        </span>
                      </td>
                      <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {acc.createdBy === 'SYSTEM_BOOTSTRAP'
                          ? 'Hệ thống gốc (Root)'
                          : acc.createdBy === 'SELF_REGISTERED'
                            ? 'User tự đăng ký'
                            : `Admin (${acc.createdBy})`}
                      </td>
                      <td>
                        <span
                          className={
                            acc.status === 'LOCKED' ? 'badge badge-red' : 'badge badge-blue'
                          }
                        >
                          {acc.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. ENTERPRISE OPERATIONAL MODULES */}
      <div className="card glass-card-interactive">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px'
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.02rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Server size={18} color="#0ea5e9" />
              <span>Hệ Sinh Thái Phân Hệ Vận Hành Doanh Nghiệp</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Kiến trúc chuẩn hóa, đảm bảo tính toàn vẹn dữ liệu và phân tách trách nhiệm theo từng
              phân hệ nghiệp vụ
            </p>
          </div>

          <span className="badge badge-green">
            <CheckCircle2 size={13} />
            <span>Trực Tuyến 24/7</span>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}
        >
          {ENTERPRISE_MODULES.map((mod) => (
            <div
              key={mod.code}
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'var(--bg-card-hover)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                  {mod.name}
                </span>
                <span
                  style={{
                    color: 'var(--accent-green-light)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'var(--accent-green-dim)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {mod.code}
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {mod.domain}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
