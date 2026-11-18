import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import CountingNumber from '../../../../shared/components/CountingNumber';
import ElasticSearchBar from '../../../../shared/components/ElasticSearchBar';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import CarbonBenchmarkChart from '../../../../shared/charts/CarbonBenchmarkChart';
import FleetStatusDonutChart from '../../../../shared/charts/FleetStatusDonutChart';
import CorridorEfficiencyBarChart from '../../../../shared/charts/CorridorEfficiencyBarChart';
import DeviationTrendSparkline from '../../../../shared/charts/DeviationTrendSparkline';
import RevenueAndBranchChart from '../../../../shared/charts/RevenueAndBranchChart';
import RealTimeFleetMap3D from '../../../../shared/map/RealTimeFleetMap3D';
import SystemEvaluationDashboard from './SystemEvaluationDashboard';
import { api } from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import { identityProfile } from '../../../../hooks/useLiveIdentity';
import { loadStoredUserShipments } from '../../../customer/features/portal/CustomerPortalPage';
import { loadCustomerContracts, loadCustomerPayments } from '../../../../utils/paymentSync';
import {
  buildRoleBreakdown,
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  getLocalApplications,
  getLocalBranches,
  getLocalStaff,
  saveLocalBranches,
  saveLocalStaff
} from '../../../../utils/adminOrgSync';
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Layers,
  Leaf,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react';

async function loadSnapshotData(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: err?.message || 'Không thể tải dữ liệu' };
  }
}

function unwrapArray(res) {
  const raw = res?.result ?? res?.data ?? res;
  return Array.isArray(raw) ? raw : [];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token, accounts = [], companies = [], demoIdentity } = useAuth();

  const [shipments, setShipments] = useState(() =>
    (demoIdentity ? loadStoredUserShipments() : []).map((s) => ({
      id: s.id,
      shipmentCode: s.shipmentCode,
      customerId: s.customerId,
      originName: s.originName,
      destinationName: s.destinationName,
      cargoWeightTons: s.cargoWeightTons,
      co2SavedKg: s.co2SavedKg,
      distance: `${s.distanceKm} KM`,
      status: s.status
    }))
  );
  const [vehicles, setVehicles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [liveFleet, setLiveFleet] = useState([]);
  const [carbonBenchmarks, setCarbonBenchmarks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [b2bContracts, setB2bContracts] = useState([]);
  const [b2bPayments, setB2bPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [branches, setBranches] = useState(() => getLocalBranches(false));
  const [staffList, setStaffList] = useState(() => getLocalStaff(false));
  const [hubItems, setHubItems] = useState([]);
  const [liveUsers, setLiveUsers] = useState(null);
  const [liveCompanies, setLiveCompanies] = useState(null);

  const [sseTrackingLive, setSseTrackingLive] = useState(false);
  const [sseAlertLive, setSseAlertLive] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [snapshotErrors, setSnapshotErrors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState('shipments'); // 'shipments' | 'revenue' | 'vehicles' | 'org' | 'finance' | 'incidents' | 'users'
  const [accountSearch, setAccountSearch] = useState('');

  const mergedAccounts = useMemo(
    () => liveUsers ?? accounts,
    [liveUsers, accounts]
  );
  const mergedCompanies = useMemo(
    () => liveCompanies ?? companies,
    [liveCompanies, companies]
  );

  const activeAccounts = useMemo(
    () => mergedAccounts.filter((a) => !a.isDeleted),
    [mergedAccounts]
  );
  const lockedAccountsCount = useMemo(
    () => activeAccounts.filter((a) => Boolean(a.locked)).length,
    [activeAccounts]
  );

  const elasticDashboardAccounts = useMemo(
    () =>
      elasticSearchMatch(activeAccounts, accountSearch, [
        'username',
        'fullName',
        'email',
        'role',
        'companyName',
        'department',
        'taxCode'
      ]),
    [activeAccounts, accountSearch]
  );

  const loadAdminRealtimeSnapshot = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const [
          usrRes,
          compRes,
          vehRes,
          contRes,
          shpRes,
          trpRes,
          fleetRes,
          benchRes,
          incRes,
          notifRes,
          payRes,
          conRes,
          hubRes,
          paySumRes,
          branchRes,
          staffRes
        ] = await Promise.all([
          typeof api.getUsers === 'function'
            ? loadSnapshotData(() => api.getUsers({ includeDeleted: true }))
            : Promise.resolve({ ok: false }),
          typeof api.getCompanies === 'function'
            ? loadSnapshotData(() => api.getCompanies({ includeDeleted: true }))
            : Promise.resolve({ ok: false }),
          loadSnapshotData(() => api.getVehicles()),
          typeof api.getContainers === 'function'
            ? loadSnapshotData(() => api.getContainers())
            : Promise.resolve({ ok: false }),
          loadSnapshotData(() => api.getShipments()),
          typeof api.getTrips === 'function'
            ? loadSnapshotData(() => api.getTrips())
            : Promise.resolve({ ok: false }),
          typeof api.getLiveFleetTelemetry === 'function'
            ? loadSnapshotData(() => api.getLiveFleetTelemetry())
            : Promise.resolve({ ok: false }),
          typeof api.getCarbonBenchmarks === 'function'
            ? loadSnapshotData(() => api.getCarbonBenchmarks())
            : Promise.resolve({ ok: false }),
          typeof api.getIncidents === 'function'
            ? loadSnapshotData(() => api.getIncidents())
            : Promise.resolve({ ok: false }),
          loadSnapshotData(() => api.getNotifications()),
          typeof api.getPayments === 'function'
            ? loadSnapshotData(() => api.getPayments())
            : Promise.resolve({ ok: false }),
          typeof api.getContracts === 'function'
            ? loadSnapshotData(() => api.getContracts())
            : Promise.resolve({ ok: false }),
          typeof api.getHubShipperWorkspace === 'function'
            ? loadSnapshotData(() => api.getHubShipperWorkspace({}))
            : Promise.resolve({ ok: false }),
          typeof api.getPaymentSummary === 'function'
            ? loadSnapshotData(() => api.getPaymentSummary())
            : Promise.resolve({ ok: false }),
          typeof api.getBranches === 'function'
            ? loadSnapshotData(() => api.getBranches({ includeDeleted: true }))
            : Promise.resolve({ ok: false }),
          typeof api.getStaff === 'function'
            ? loadSnapshotData(() => api.getStaff({ includeDeleted: true }))
            : Promise.resolve({ ok: false })
        ]);

        if (usrRes.ok) {
          const list = unwrapArray(usrRes.data);
          setLiveUsers(list.map((u) => identityProfile(u)));
        }
        if (compRes.ok) {
          const list = unwrapArray(compRes.data);
          setLiveCompanies(list);
        }
        if (vehRes.ok) {
          const list = unwrapArray(vehRes.data);
          setVehicles(list);
        }
        if (contRes.ok) {
          const list = unwrapArray(contRes.data);
          setContainers(list);
        }
        if (shpRes.ok) {
          const list = unwrapArray(shpRes.data);
          setShipments(list);
        }
        if (trpRes.ok) {
          const list = unwrapArray(trpRes.data);
          setTrips(list);
        }
        if (fleetRes.ok) {
          const list = unwrapArray(fleetRes.data);
          setLiveFleet(list);
        }
        if (benchRes.ok) {
          const list = unwrapArray(benchRes.data);
          setCarbonBenchmarks(list);
        }
        if (incRes.ok) {
          setIncidents(unwrapArray(incRes.data));
        }
        if (notifRes.ok) {
          setNotificationsList(unwrapArray(notifRes.data));
        }

        if (conRes.ok) {
          setB2bContracts(unwrapArray(conRes.data));
        } else if (demoIdentity) {
          const fallbackC = await loadCustomerContracts(user?.customerId || 'DOANH_NGHIEP_B2B').catch(
            () => ({ contracts: [] })
          );
          if (Array.isArray(fallbackC?.contracts)) setB2bContracts(fallbackC.contracts);
        }

        if (payRes.ok) {
          setB2bPayments(unwrapArray(payRes.data));
        } else if (demoIdentity) {
          const fallbackP = await loadCustomerPayments(user?.customerId || 'DOANH_NGHIEP_B2B').catch(
            () => ({ payments: [] })
          );
          if (Array.isArray(fallbackP?.payments)) setB2bPayments(fallbackP.payments);
        }

        if (hubRes.ok && hubRes.data) {
          const ws = hubRes.data?.result ?? hubRes.data;
          const items = Array.isArray(ws?.manifestItems) ? ws.manifestItems : [];
          setHubItems(items);
        }

        if (paySumRes.ok && paySumRes.data) {
          setPaymentSummary(paySumRes.data?.result ?? paySumRes.data);
        }

        if (branchRes.ok) {
          const list = unwrapArray(branchRes.data);
          if (list.length > 0) {
            setBranches(saveLocalBranches(list).filter((b) => !b.isDeleted));
          }
        } else {
          setBranches(getLocalBranches(false));
        }

        if (staffRes.ok) {
          const list = unwrapArray(staffRes.data);
          if (list.length > 0) {
            setStaffList(saveLocalStaff(list).filter((s) => !s.isDeleted));
          }
        } else {
          setStaffList(getLocalStaff(false));
        }

        const sources = [usrRes, compRes, vehRes, contRes, shpRes, trpRes, fleetRes, benchRes, incRes, notifRes, payRes, conRes, hubRes];
        const names = ['Tài khoản', 'Doanh nghiệp', 'Phương tiện', 'Container', 'Vận đơn', 'Chuyến đi', 'Vị trí đội xe', 'Đối chuẩn carbon', 'Sự cố', 'Thông báo', 'Thanh toán', 'Hợp đồng', 'Giao nhận'];
        const failures = names.filter((_, i) => !sources[i].ok);
        setSnapshotErrors(failures);
        if (!failures.length) setLastSyncAt(new Date().toLocaleTimeString('vi-VN'));
      } finally {
        setRefreshing(false);
      }
    },
    [user?.customerId, demoIdentity]
  );

  // Initial load + 15s polling fallback
  useEffect(() => {
    loadAdminRealtimeSnapshot(false);
    const pollTimer = setInterval(() => loadAdminRealtimeSnapshot(false), 15000);
    return () => clearInterval(pollTimer);
  }, [loadAdminRealtimeSnapshot]);

  // Dual Real-time SSE Listeners (Tracking Fleet Stream + Notification Emergency Stream)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return undefined;
    }
    const baseApi = import.meta.env.VITE_API_URL || 'http://localhost:8888';
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';

    let trackingEs = null;
    let alertEs = null;

    try {
      trackingEs = new window.EventSource(`${baseApi}/api/v1/tracking/stream${qs}`);
      trackingEs.addEventListener('fleet-snapshot', (evt) => {
        try {
          const list = JSON.parse(evt.data);
          if (Array.isArray(list)) {
            setLiveFleet(list);
            setSseTrackingLive(true);
            setLastSyncAt(new Date().toLocaleTimeString('vi-VN'));
          }
        } catch (_) {
          // ignore
        }
      });
      trackingEs.addEventListener('fleet-telemetry-update', (evt) => {
        try {
          const item = JSON.parse(evt.data);
          if (item?.tripId) {
            setLiveFleet((prev) => [item, ...prev.filter((x) => x.tripId !== item.tripId)]);
            setSseTrackingLive(true);
            setLastSyncAt(new Date().toLocaleTimeString('vi-VN'));
          }
        } catch (_) {
          // ignore
        }
      });
      trackingEs.onerror = () => setSseTrackingLive(false);
    } catch (_) {
      setSseTrackingLive(false);
    }

    try {
      alertEs = new window.EventSource(`${baseApi}/api/v1/notifications/stream${qs}`);
      alertEs.addEventListener('open', () => setSseAlertLive(true));
      alertEs.addEventListener('emergency-alert', (evt) => {
        try {
          const incoming = JSON.parse(evt.data);
          if (incoming?.id) {
            setNotificationsList((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)]);
            setSseAlertLive(true);
            setLastSyncAt(new Date().toLocaleTimeString('vi-VN'));
          }
        } catch (_) {
          // ignore
        }
      });
      alertEs.addEventListener('emergency-acknowledged', (evt) => {
        try {
          const updated = JSON.parse(evt.data);
          if (updated?.id) {
            setNotificationsList((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          }
        } catch (_) {
          // ignore
        }
      });
      alertEs.onerror = () => setSseAlertLive(false);
    } catch (_) {
      setSseAlertLive(false);
    }

    return () => {
      if (trackingEs) trackingEs.close();
      if (alertEs) alertEs.close();
    };
  }, [token]);

  const visibleShipments =
    (user?.role === 'CUSTOMER' || user?.role === 'SHIPPER') && user?.customerId
      ? shipments.filter((s) => s.customerId === user.customerId)
      : shipments;

  const tripByShipmentId = useMemo(() => {
    const map = {};
    trips.forEach((t) => {
      if (t?.shipmentId && t?.id) map[t.shipmentId] = t.id;
    });
    return map;
  }, [trips]);

  const unackedNotificationsCount = useMemo(
    () => notificationsList.filter((n) => n.status !== 'ACKNOWLEDGED').length,
    [notificationsList]
  );

  const openIncidentsCount = useMemo(
    () => incidents.filter((i) => String(i.status || '').toUpperCase() !== 'RESOLVED').length,
    [incidents]
  );

  const effectiveRevenueSummary = useMemo(() => {
    if (paymentSummary && typeof paymentSummary.totalPaidVnd === 'number') {
      return paymentSummary;
    }
    const paid = b2bPayments
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + Number(p.finalAmountVnd || p.amountVnd || 0), 0);
    const net30 = b2bPayments
      .filter((p) => p.status === 'NET_30')
      .reduce((acc, p) => acc + Number(p.finalAmountVnd || p.amountVnd || 0), 0);
    const pending = b2bPayments
      .filter((p) => p.status === 'PENDING')
      .reduce((acc, p) => acc + Number(p.finalAmountVnd || p.amountVnd || 0), 0);
    const greenDiscount = b2bPayments.reduce(
      (acc, p) => acc + Number(p.greenDiscountVnd || 0),
      0
    );
    const co2Saved = b2bPayments.reduce((acc, p) => acc + Number(p.co2SavedKg || 0), 0);
    return {
      totalTransactions: b2bPayments.length,
      paidCount: b2bPayments.filter((p) => p.status === 'PAID').length,
      pendingCount: b2bPayments.filter((p) => p.status === 'PENDING').length,
      net30Count: b2bPayments.filter((p) => p.status === 'NET_30').length,
      totalPaidVnd: paid,
      totalPendingVnd: pending,
      totalNet30Vnd: net30,
      totalGreenDiscountVnd: greenDiscount,
      totalCo2SavedKg: co2Saved
    };
  }, [paymentSummary, b2bPayments]);

  const roleBreakdown = useMemo(() => buildRoleBreakdown(staffList), [staffList]);

  const totalContractValueVnd = useMemo(
    () =>
      b2bContracts.reduce(
        (sum, c) => sum + Number(c.contractValueVnd || c.totalAmountVnd || 0),
        0
      ),
    [b2bContracts]
  );

  const totalBranchRevenueTargetVnd = useMemo(
    () =>
      branches
        .filter((b) => !b.isDeleted)
        .reduce((sum, b) => sum + Number(b.monthlyRevenueTargetVnd || 0), 0),
    [branches]
  );

  const orgComplianceSummary = useMemo(() => {
    const active = staffList.filter((s) => !s.isDeleted);
    const drivers = active.filter((s) => DRIVER_ROLE_CODES.includes(s.roleCode));
    const controllers = active.filter((s) => CONTROLLER_ROLE_CODES.includes(s.roleCode));
    return {
      driversTotal: drivers.length,
      driversApproved: drivers.filter((s) => s.verificationStatus === 'APPROVED').length,
      controllersTotal: controllers.length,
      controllersApproved: controllers.filter((s) => s.verificationStatus === 'APPROVED').length
    };
  }, [staffList]);

  const handleAckNotification = async (id) => {
    try {
      await api.acknowledgeNotification(id);
      setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'ACKNOWLEDGED' } : n)));
    } catch (err) {
      setSnapshotErrors([`Chưa xác nhận được thông báo: ${err.message}`]);
    }
  };

  return (
    <div className="page-body" style={{ position: 'relative' }}>
      {snapshotErrors.length > 0 && <p role="alert">Dữ liệu chưa được đồng bộ đầy đủ: {snapshotErrors.join(', ')}. Không dùng số liệu đang hiển thị để xác nhận hoàn tất nghiệp vụ.</p>}
      <div className="ambient-gradient-mesh" />

      {/* 1. ADMIN HERO & REAL-TIME TELEMETRY STATUS BAR */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card glass-card-interactive"
        style={{
          marginBottom: '22px',
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, var(--bg-card) 60%, rgba(56, 189, 248, 0.08) 100%)',
          border: `1px solid ${user?.border || 'rgba(16, 185, 129, 0.35)'}`
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span
                style={{
                  background: user?.bgDim || 'rgba(16, 185, 129, 0.15)',
                  color: user?.color || '#34d399',
                  border: `1px solid ${user?.color || '#10b981'}`,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span className="radar-dot" style={{ backgroundColor: user?.color || '#34d399' }}></span>
                {user?.role || 'ADMIN'}
              </span>

              <span className={`badge ${sseTrackingLive ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                <Truck size={12} />
                <span>Vị trí đội xe: {sseTrackingLive ? 'Cập nhật trực tiếp' : 'Cập nhật định kỳ'}</span>
              </span>

              <span className={`badge ${sseAlertLive ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                <Bell size={12} />
                <span>Cảnh báo khẩn: {sseAlertLive ? 'Cập nhật trực tiếp' : 'Cập nhật định kỳ'}</span>
              </span>

              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                Đồng bộ lúc: <strong>{lastSyncAt}</strong>
              </span>
            </div>

            <h2
              style={{
                fontSize: '1.42rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '6px'
              }}
            >
              Trung Tâm Giám Sát Toàn Hệ Thống • {user?.fullName || 'Root Administrator'}
            </h2>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '880px', lineHeight: 1.5, margin: 0 }}>
              Theo dõi vận đơn, đội xe, an toàn hành trình, phát thải carbon, công nợ và hoạt động giao nhận.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => loadAdminRealtimeSnapshot(true)}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} />
              <span>{refreshing ? 'Đang đồng bộ...' : 'Làm Mới Real-time'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/branches')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              <Building2 size={14} color="#f59e0b" />
              <span>Chi Nhánh ({branches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/staff')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              <UserCheck size={14} color="#a855f7" />
              <span>Nhân Sự ({staffList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              <Users size={14} color="#38bdf8" />
              <span>Tài Khoản IAM</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/shipments/new')}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem' }}
            >
              <Package size={14} />
              <span>Tạo Vận Đơn Mới</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. TOP REAL-TIME ADMIN KPI ROW */}
      <div className="grid-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.42, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Vận Đơn Hoàn Tất</div>
            <div className="stat-value" style={{ color: 'var(--accent-green-light)' }}>
              <CountingNumber value={visibleShipments.filter((s) => s.status === 'COMPLETED').length} />
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Trong tổng số {visibleShipments.length} vận đơn
            </span>
          </div>
          <Package size={30} color="var(--accent-green)" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Vận Đơn &amp; Chuyến Thực Tế</div>
            <div className="stat-value" style={{ color: 'var(--text-main)' }}>
              <CountingNumber value={visibleShipments.length} />
            </div>
            <span style={{ fontSize: '0.73rem', color: '#34d399' }}>
              {liveFleet.length} xe đang phát GPS • {trips.length} chuyến vận chuyển
            </span>
          </div>
          <Package size={30} color="#34d399" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.42, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Hạm Đội &amp; Smart Container</div>
            <div className="stat-value" style={{ color: '#38bdf8' }}>
              <CountingNumber value={vehicles.length} />{' '}
              <span style={{ fontSize: '1rem' }}>Xe</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {containers.length} Cont IoT • {hubItems.length} kiện Hub 3PL
            </span>
          </div>
          <Truck size={30} color="#38bdf8" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.42, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="card stat-card glass-card-interactive"
        >
          <div>
            <div className="stat-label">Cảnh Báo, Sự Cố &amp; IAM Khóa</div>
            <div
              className="stat-value"
              style={{
                color:
                  unackedNotificationsCount + lockedAccountsCount > 0 ? '#f87171' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {unackedNotificationsCount > 0 && <span className="radar-dot radar-dot-red"></span>}
              <CountingNumber value={unackedNotificationsCount + openIncidentsCount} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cảnh báo</span>
            </div>
            <span style={{ fontSize: '0.73rem', color: lockedAccountsCount > 0 ? '#fca5a5' : 'var(--text-muted)' }}>
              {openIncidentsCount} sự cố UC16 • {lockedAccountsCount} tài khoản khóa
            </span>
          </div>
          <Bell size={30} color="#ef4444" />
        </motion.div>
      </div>

      {/* 2R. FINANCIAL REVENUE, NET-30 DEBT & NETWORK SUPERVISION KPI ROW */}
      <div className="grid-4" style={{ marginTop: '14px' }}>
        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Doanh Thu Đã Thu (PAID)</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.3rem' }}>
              {(Number(effectiveRevenueSummary.totalPaidVnd || 0) / 1_000_000).toLocaleString(
                'vi-VN',
                { maximumFractionDigits: 1 }
              )}{' '}
              Tr ₫
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {effectiveRevenueSummary.paidCount || 0} giao dịch tất toán • TB{' '}
              {effectiveRevenueSummary.paidCount > 0
                ? Math.round(
                    Number(effectiveRevenueSummary.totalPaidVnd || 0) /
                      effectiveRevenueSummary.paidCount /
                      1_000_000
                  )
                : 0}{' '}
              Tr/đơn
            </span>
          </div>
          <DollarSign size={28} color="#10b981" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Công Nợ Net-30 &amp; Chờ Thu</div>
            <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.3rem' }}>
              {(
                (Number(effectiveRevenueSummary.totalNet30Vnd || 0) +
                  Number(effectiveRevenueSummary.totalPendingVnd || 0)) /
                1_000_000
              ).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}{' '}
              Tr ₫
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {b2bContracts.length} hợp đồng B2B •{' '}
              {(totalContractValueVnd / 1_000_000).toLocaleString('vi-VN', {
                maximumFractionDigits: 1
              })}{' '}
              Tr giá trị
            </span>
          </div>
          <CreditCard size={28} color="#38bdf8" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Ưu Đãi Carbon Xanh &amp; ESG</div>
            <div className="stat-value" style={{ color: '#22c55e', fontSize: '1.3rem' }}>
              {(
                Number(effectiveRevenueSummary.totalGreenDiscountVnd || 0) / 1_000_000
              ).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
              Tr ₫
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              {Number(effectiveRevenueSummary.totalCo2SavedKg || 0).toLocaleString('vi-VN')} kg CO₂e tiết kiệm
            </span>
          </div>
          <Leaf size={28} color="#22c55e" />
        </div>

        <div className="card stat-card glass-card-interactive">
          <div>
            <div className="stat-label">Chi Nhánh &amp; Nhân Sự Vận Hành</div>
            <div className="stat-value" style={{ color: '#f59e0b', fontSize: '1.3rem' }}>
              {branches.length} CN • {staffList.length} NV
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Duyệt: {orgComplianceSummary.driversApproved}/{orgComplianceSummary.driversTotal} Lái xe •{' '}
              {orgComplianceSummary.controllersApproved}/{orgComplianceSummary.controllersTotal} Kiểm soát •{' '}
              {(totalBranchRevenueTargetVnd / 1_000_000_000).toFixed(2)} Tỷ
            </span>
          </div>
          <Wallet size={28} color="#f59e0b" />
        </div>
      </div>

      {/* 2A. EXECUTIVE MULTI-PILLAR SYSTEM EVALUATION SUITE */}
      <SystemEvaluationDashboard
        shipments={visibleShipments}
        vehicles={vehicles}
        containers={containers}
        liveFleet={liveFleet}
        incidents={incidents}
        notifications={notificationsList}
        accounts={activeAccounts}
        companies={mergedCompanies}
        contracts={b2bContracts}
        payments={b2bPayments}
        hubItems={hubItems}
      />

      {/* 2B. REAL-TIME 3D GOOGLE HYBRID SATELLITE FLEET MAP */}
      <RealTimeFleetMap3D
        height={490}
        title="Bản Đồ Vệ Tinh 3D Giám Sát Toàn Đội Xe Thời Gian Thực (Google Hybrid 3D)"
      />

      {/* 3. REVENUE ANALYTICS & FOUR LIVE DATA CHARTS */}
      <div style={{ marginBottom: '20px' }}>
        <RevenueAndBranchChart
          paymentSummary={effectiveRevenueSummary}
          branches={branches}
          contracts={b2bContracts}
          payments={b2bPayments}
        />
      </div>

      <div className="grid-2">
        <CarbonBenchmarkChart
          benchmarks={carbonBenchmarks}
          liveFleet={liveFleet}
          shipments={visibleShipments}
        />
        <FleetStatusDonutChart vehicles={vehicles} />
        <CorridorEfficiencyBarChart liveFleet={liveFleet} shipments={visibleShipments} />
        <DeviationTrendSparkline
          liveFleet={liveFleet}
          notifications={notificationsList}
          incidents={incidents}
        />
      </div>

      {/* 4. REAL-TIME ADMIN SUPERVISION REGISTRY CONSOLE */}
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
              <span>Bảng Điều Hành &amp; Giám Sát Toàn Hệ Thống (Admin Control Center)</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Theo dõi và quản lý dữ liệu vận hành mới nhất
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              background: 'rgba(148, 163, 184, 0.08)',
              padding: '3px',
              borderRadius: '9px',
              gap: '4px',
              flexWrap: 'wrap'
            }}
          >
            {[
              { id: 'shipments', label: `Vận Đơn (${visibleShipments.length})` },
              { id: 'revenue', label: `Doanh Thu & Hợp Đồng (${b2bPayments.length})` },
              { id: 'vehicles', label: `Đội Xe & Telemetry (${vehicles.length})` },
              { id: 'org', label: `Chi Nhánh & Nhân Sự (${branches.length}/${staffList.length})` },
              { id: 'finance', label: `Công Ty & Net-30 (${mergedCompanies.length})` },
              {
                id: 'incidents',
                label: `Cảnh Báo & Sự Cố (${unackedNotificationsCount + openIncidentsCount})`
              },
              { id: 'users', label: `IAM & Bảo Mật (${activeAccounts.length})` }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? 'var(--accent-green)' : 'transparent',
                  color: activeTab === t.id ? '#090d16' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Shipments */}
        {activeTab === 'shipments' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Vận Đơn</th>
                  <th>Chủ Hàng (B2B)</th>
                  <th>Điểm Xuất Phát</th>
                  <th>Điểm Đến</th>
                  <th>Tải Trọng</th>
                  <th>Trạng Thái</th>
                  <th>Giám Sát</th>
                </tr>
              </thead>
              <tbody>
                {visibleShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có vận đơn nào được tải từ Shipment Service.
                    </td>
                  </tr>
                ) : (
                  visibleShipments.map((s) => (
                    <tr key={s.id || s.shipmentCode}>
                      <td>
                        <code style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                          {s.shipmentCode || s.code}
                        </code>
                      </td>
                      <td>
                        <strong>{s.customerId || s.customerName || '--'}</strong>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.originName || '--'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.destinationName || '--'}</td>
                      <td>
                        <strong>{s.cargoWeightTons || 0}</strong> tấn
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
                          {s.status}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/planning/${s.id || 'c0000000-0000-0000-0000-000000000001'}`)
                          }
                          className="btn btn-secondary"
                          style={{ padding: '4px 9px', fontSize: '0.73rem' }}
                        >
                          <span>Lập Tuyến</span>
                          <ChevronRight size={13} />
                        </button>
                        {tripByShipmentId[s.id] && (
                          <button
                            type="button"
                            onClick={() => navigate(`/trips/${tripByShipmentId[s.id]}`)}
                            className="btn btn-primary"
                            style={{ padding: '4px 9px', fontSize: '0.73rem' }}
                          >
                            GPS Live
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Vehicles + Live Telemetry Overlay */}
        {activeTab === 'vehicles' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã Xe</th>
                  <th>Biển Số</th>
                  <th>Loại Phương Tiện</th>
                  <th>Vận Tốc &amp; Lệch Tuyến Live</th>
                  <th>Trạng Thái (BRULE-01)</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa nhận được danh sách đội xe từ Asset Service (:8888).
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => {
                    const liveMatch = liveFleet.find(
                      (f) => f.vehicleCode === v.vehicleCode || f.vehicleId === v.id
                    );
                    return (
                      <tr key={v.id || v.vehicleCode}>
                        <td>
                          <code style={{ color: '#10b981', fontWeight: 700 }}>{v.vehicleCode}</code>
                        </td>
                        <td>
                          <strong>{v.licensePlate || v.plateNumber}</strong>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {v.vehicleType} • {v.euroStandard || 'EV'}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {liveMatch ? (
                            <span>
                              <strong>{liveMatch.speedKmh} km/h</strong> • Lệch{' '}
                              <strong
                                style={{
                                  color:
                                    liveMatch.deviationStatus === 'CRITICAL_200M'
                                      ? '#ef4444'
                                      : '#10b981'
                                }}
                              >
                                {liveMatch.deviationMeters ?? 0}m
                              </strong>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Chưa có GPS thực</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              v.status === 'IN_TRANSIT'
                                ? 'badge badge-green'
                                : v.status === 'MAINTENANCE'
                                  ? 'badge badge-red'
                                  : 'badge badge-blue'
                            }
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Companies KYC & B2B Finance */}
        {activeTab === 'finance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Giám sát pháp lý công ty B2B, hạn mức công nợ Net-30 ({b2bContracts.length} hợp đồng, {b2bPayments.length} giao dịch)
              </span>
              <button
                type="button"
                onClick={() => navigate('/admin/companies')}
                className="btn btn-secondary"
                style={{ fontSize: '0.76rem', padding: '5px 11px' }}
              >
                <Building2 size={13} /> Quản Lý Công Ty &amp; KYC
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mã Công Ty</th>
                    <th>Tên Doanh Nghiệp / MST</th>
                    <th>Phân Nhóm</th>
                    <th>Hạn Mức Net-30</th>
                    <th>Trạng Thái KYC</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedCompanies
                    .filter((c) => !c.isDeleted)
                    .map((c) => (
                      <tr key={c.id || c.companyCode}>
                        <td>
                          <code>{c.companyCode}</code>
                        </td>
                        <td>
                          <strong>{c.companyName}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            MST: {c.taxCode || '--'}
                          </div>
                        </td>
                        <td>{c.companyType}</td>
                        <td>
                          <strong>{Number(c.creditLimitVnd || 0).toLocaleString('vi-VN')} ₫</strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              c.kycStatus === 'VERIFIED'
                                ? 'badge-green'
                                : c.kycStatus === 'REJECTED'
                                  ? 'badge-red'
                                  : 'badge-amber'
                            }`}
                          >
                            {c.kycStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Revenue, Payments & Contracts Supervision */}
        {activeTab === 'revenue' && (
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
                Đã thu:{' '}
                <strong style={{ color: '#10b981' }}>
                  {Number(effectiveRevenueSummary.totalPaidVnd || 0).toLocaleString('vi-VN')} ₫
                </strong>{' '}
                • Công nợ Net-30 &amp; chờ đối soát:{' '}
                <strong style={{ color: '#38bdf8' }}>
                  {(
                    Number(effectiveRevenueSummary.totalNet30Vnd || 0) +
                    Number(effectiveRevenueSummary.totalPendingVnd || 0)
                  ).toLocaleString('vi-VN')}{' '}
                  ₫
                </strong>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/companies')}
                className="btn btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                <Building2 size={13} />
                <span>Đối Soát Hạn Mức Công Ty B2B</span>
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mã Giao Dịch</th>
                    <th>Khách Hàng / Vận Đơn</th>
                    <th>Phương Thức</th>
                    <th>Ưu Đãi Xanh</th>
                    <th>Thực Thu</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {b2bPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa ghi nhận giao dịch doanh thu nào từ Payment Service.
                      </td>
                    </tr>
                  ) : (
                    b2bPayments.slice(0, 12).map((p) => (
                      <tr key={p.id || p.transactionCode}>
                        <td>
                          <code style={{ color: '#38bdf8', fontWeight: 700 }}>
                            {p.transactionCode || p.id}
                          </code>
                        </td>
                        <td>
                          <strong>{p.customerId || p.companyCode || '--'}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Vận đơn: {p.shipmentCode || '--'}
                          </div>
                        </td>
                        <td>{p.paymentMethod || 'BANK_TRANSFER'}</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>
                          -{Number(p.greenDiscountVnd || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {Number(p.finalAmountVnd || p.amountVnd || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              p.status === 'PAID'
                                ? 'badge-green'
                                : p.status === 'NET_30'
                                  ? 'badge-blue'
                                  : 'badge-amber'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3B: Branches & Staff by Role Overview */}
        {activeTab === 'org' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {roleBreakdown.map((rb) => (
                  <span
                    key={rb.roleCode}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card-hover)',
                      fontSize: '0.76rem'
                    }}
                  >
                    <strong style={{ color: rb.color }}>{rb.roleCode}</strong>: {rb.totalCount} NV
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/drivers')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <Truck size={13} color="#10b981" />
                  <span>
                    Lái Xe ({orgComplianceSummary.driversApproved}/{orgComplianceSummary.driversTotal} duyệt)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/controllers')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <ShieldCheck size={13} color="#f59e0b" />
                  <span>
                    Kiểm Soát ({orgComplianceSummary.controllersApproved}/{orgComplianceSummary.controllersTotal} duyệt)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/branches')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <Building2 size={13} />
                  <span>CRUD Chi Nhánh (/admin/branches)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/applications')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <UserCheck size={13} color="#38bdf8" />
                  <span>
                    Đơn Ứng Tuyển ({getLocalApplications().filter((a) => a.applicationStatus !== 'APPROVED_ONBOARDED' && a.applicationStatus !== 'REJECTED').length} chờ duyệt)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/staff')}
                  className="btn btn-primary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <Users size={13} />
                  <span>CRUD Nhân Viên Theo Vai Trò (/admin/staff)</span>
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Mã / Tên Chi Nhánh</th>
                    <th>Vùng / Loại Hình</th>
                    <th>Quản Lý Phụ Trách</th>
                    <th>Sức Chứa &amp; Nhân Sự</th>
                    <th>Chỉ Tiêu Doanh Thu / Tháng</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id || b.branchCode}>
                      <td>
                        <code style={{ color: '#38bdf8', fontWeight: 700 }}>{b.branchCode}</code>
                        <div style={{ fontWeight: 700 }}>{b.branchName}</div>
                      </td>
                      <td>
                        {b.region} • {b.city}
                      </td>
                      <td>
                        {b.managerName || '--'}{' '}
                        {b.managerUsername ? <code>@{b.managerUsername}</code> : null}
                      </td>
                      <td>
                        {b.vehicleCapacity || 0} xe • <strong>{b.activeStaffCount || 0} NV</strong>
                      </td>
                      <td style={{ color: '#f59e0b', fontWeight: 700 }}>
                        {Number(b.monthlyRevenueTargetVnd || 0).toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Incidents & Emergency Alerts */}
        {activeTab === 'incidents' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nguồn</th>
                  <th>Tiêu Đề / Mô Tả Sự Cố</th>
                  <th>Mức Độ</th>
                  <th>Trạng Thái</th>
                  <th>Xử Lý</th>
                </tr>
              </thead>
              <tbody>
                {notificationsList.length === 0 && incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không có sự cố hoặc cảnh báo đỏ nào đang mở.
                    </td>
                  </tr>
                ) : (
                  <>
                    {notificationsList.map((n) => (
                      <tr key={`n-${n.id}`}>
                        <td>
                          <span className="badge badge-red">ALERT P0</span>
                        </td>
                        <td>
                          <strong>{n.title}</strong>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {n.message}
                          </div>
                        </td>
                        <td>{n.severity || 'CRITICAL'}</td>
                        <td>{n.status || 'UNREAD'}</td>
                        <td>
                          {n.status !== 'ACKNOWLEDGED' ? (
                            <button
                              type="button"
                              onClick={() => handleAckNotification(n.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 9px', fontSize: '0.73rem' }}
                            >
                              Tiếp Nhận (ACK)
                            </button>
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '0.76rem', fontWeight: 700 }}>
                              Đã ACK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {incidents.map((inc) => (
                      <tr key={`i-${inc.id}`}>
                        <td>
                          <span className="badge badge-amber">UC16</span>
                        </td>
                        <td>
                          <strong>{inc.incidentType}</strong>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {inc.description}
                          </div>
                        </td>
                        <td>{inc.severity}</td>
                        <td>{inc.status}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => navigate('/governance')}
                            className="btn btn-secondary"
                            style={{ padding: '4px 9px', fontSize: '0.73rem' }}
                          >
                            Thẩm Định UC17
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: IAM Accounts Directory */}
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
                Tổng <strong>{activeAccounts.length}</strong> tài khoản đang hoạt động •{' '}
                <strong style={{ color: lockedAccountsCount > 0 ? '#ef4444' : '#10b981' }}>
                  {lockedAccountsCount}
                </strong>{' '}
                tài khoản đang khóa brute-force.
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="btn btn-primary"
                style={{ fontSize: '0.78rem', padding: '7px 14px' }}
              >
                <ShieldCheck size={14} />
                <span>Mở Trang Quản Lý User Chi Tiết (/admin/users)</span>
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <ElasticSearchBar
                value={accountSearch}
                onChange={setAccountSearch}
                placeholder="Elastic search: username, họ tên, công ty, MST, vai trò..."
                totalCount={activeAccounts.length}
                matchedCount={elasticDashboardAccounts.items.length}
                tookMs={elasticDashboardAccounts.tookMs}
                rounded={8}
              />
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tài Khoản</th>
                    <th>Họ Tên / Chức Danh</th>
                    <th>Công Ty / MST</th>
                    <th>Vai Trò</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {elasticDashboardAccounts.items.map((acc) => (
                    <tr key={acc.username}>
                      <td>
                        <code style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>
                          @{acc.username}
                        </code>
                      </td>
                      <td>
                        <strong>{acc.fullName}</strong>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {acc.jobTitle || acc.email}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {acc.companyName || acc.department}
                        {acc.taxCode ? ` • MST: ${acc.taxCode}` : ''}
                      </td>
                      <td>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          {acc.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${acc.locked ? 'badge-red' : 'badge-blue'}`}>
                          {acc.locked ? 'LOCKED' : 'ACTIVE'}
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

      {/* Unused icon guard resolved: ShieldAlert linked to governance inspection */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => navigate('/governance')}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem' }}
        >
          <ShieldAlert size={14} color="#f59e0b" />
          <span>Đi tới Trung tâm Kiểm định An toàn &amp; Sự cố (UC01 / UC16)</span>
        </button>
      </div>
    </div>
  );
}
