import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertOctagon,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Lock,
  MapPin,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Truck,
  Unlock,
  UserPlus,
  Users
} from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuth, ENTERPRISE_ROLES, ALL_SYSTEM_PERMISSIONS } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import SearchToolbar from '../../../../shared/components/search/SearchToolbar';
import UserCompanyDetailModal from '../../shared/UserCompanyDetailModal';
import AdminCompaniesTab from '../organization/AdminCompaniesTab';
import AdminBranchesTab from '../organization/AdminBranchesTab';
import AdminStaffByRoleTab from '../organization/AdminStaffByRoleTab';
import AdminApplicationsTab from '../recruitment/AdminApplicationsTab';
import {
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  getLocalBranches,
  getLocalStaff
} from '../../../../utils/adminOrgSync';

const EMPTY_LIST = [];

export default function GovernanceAndSafetyPage({
  defaultTab = 'RBAC',
  defaultRbacSubTab = 'USERS'
}) {
  const { isDark } = useTheme();
  const {
    user,
    accounts = [],
    companies = [],
    adminCreateAccount,
    adminUpdateAccount,
    adminDeleteAccount,
    adminRestoreAccount,
    identityRoles = EMPTY_LIST, identityPermissions = EMPTY_LIST, identityLoading, identityError, refreshIdentity, demoIdentity
  } = useAuth();

  const isAdminUser = user?.role === 'ADMIN';
  const permissionsCatalog = demoIdentity ? ALL_SYSTEM_PERMISSIONS : identityPermissions.map((p) => ({ code: p.name, label: p.description || p.name }));
  const roleNames = demoIdentity ? Object.keys(ENTERPRISE_ROLES) : identityRoles.map((r) => r.name);
  const [activeTab, setActiveTab] = useState(
    !isAdminUser && defaultTab === 'RBAC' ? 'PRETRIP' : defaultTab
  ); // 'RBAC' | 'PRETRIP' | 'INCIDENT'
  const [rbacSubTab, setRbacSubTab] = useState(defaultRbacSubTab); // 'USERS' | 'STAFF' | 'DRIVERS' | 'CONTROLLERS' | 'BRANCHES' | 'COMPANIES'
  const [orgBranchCount, setOrgBranchCount] = useState(() => getLocalBranches(false).length);
  const [orgStaffCount, setOrgStaffCount] = useState(() => getLocalStaff(false).length);
  const [orgDriverCount, setOrgDriverCount] = useState(
    () => getLocalStaff(false).filter((s) => DRIVER_ROLE_CODES.includes(s.roleCode)).length
  );
  const [orgControllerCount, setOrgControllerCount] = useState(
    () => getLocalStaff(false).filter((s) => CONTROLLER_ROLE_CODES.includes(s.roleCode)).length
  );

  const handleSyncStaffCounts = (list) => {
    const active = list.filter((s) => !s.isDeleted);
    setOrgStaffCount(active.length);
    setOrgDriverCount(active.filter((s) => DRIVER_ROLE_CODES.includes(s.roleCode)).length);
    setOrgControllerCount(active.filter((s) => CONTROLLER_ROLE_CODES.includes(s.roleCode)).length);
  };

  useEffect(() => {
    setActiveTab(!isAdminUser && defaultTab === 'RBAC' ? 'PRETRIP' : defaultTab);
  }, [defaultTab, isAdminUser]);

  useEffect(() => {
    setRbacSubTab(defaultRbacSubTab);
  }, [defaultRbacSubTab]);
  const [accountFilter, setAccountFilter] = useState('ALL'); // 'ALL' | 'INTERNAL' | 'CUSTOMER'
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);

  // State cho form Admin tạo tài khoản nội bộ / đối tác mới
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: '',
    department: ENTERPRISE_ROLES.DISPATCHER.department,
    customerId: '',
    role: 'DISPATCHER',
    permissions: [...ENTERPRISE_ROLES.DISPATCHER.permissions]
  });
  const [provisionStatus, setProvisionStatus] = useState(null);

  // State cho Modal / Drawer phân quyền & hồ sơ chi tiết User + Công ty
  const [editingAccountUsername, setEditingAccountUsername] = useState(null);
  const [detailAccountUsername, setDetailAccountUsername] = useState(null);

  // Pre-trip checklist state (UC01)
  const [checklist, setChecklist] = useState({
    vehicleId: '', driverId: '',
    brakesOk: false, tiresOk: false, lightsOk: false, steeringOk: false,
    hornAndMirrorsOk: false, safetyEquipmentOk: false,
    odometerKm: 0, notes: ''
  });
  const [inspectionResult, setInspectionResult] = useState(null);

  // Field incident state (UC16)
  const [incidentForm, setIncidentForm] = useState({
    tripId: '',
    driverId: '',
    incidentType: 'TRAFFIC_BLOCKADE',
    severity: 'CRITICAL',
    latitude: '', longitude: '', description: ''
  });
  const [incidentStatus, setIncidentStatus] = useState(null);
  const [resources, setResources] = useState({ vehicles: [], drivers: [], trips: [] });
  const [resourceError, setResourceError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (activeTab === 'RBAC') return undefined;
    let cancelled = false;
    setResourceError('');
    Promise.all([api.getVehicles(), api.getDrivers(), api.getTrips()]).then(([v, d, t]) => {
      if (!cancelled) setResources({ vehicles: v.result || [], drivers: d.result || [], trips: t.result || [] });
    }).catch((e) => { if (!cancelled) setResourceError(e.message); });
    return () => { cancelled = true; };
  }, [activeTab]);
  useEffect(() => {
    if (demoIdentity) return;
    const selected = identityRoles.find((r) => r.name === newUserForm.role);
    const next = (selected?.permissions || []).map((p) => typeof p === 'string' ? p : p.name);
    setNewUserForm((prev) => JSON.stringify(prev.permissions) === JSON.stringify(next) ? prev : { ...prev, permissions: next });
  }, [identityRoles, newUserForm.role, demoIdentity]);

  const isAdmin = user?.role === 'ADMIN';

  const portalAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (accountFilter === 'INTERNAL' && acc.portalType !== 'INTERNAL') return false;
      if (accountFilter === 'CUSTOMER' && acc.portalType !== 'CUSTOMER') return false;
      if (accountFilter === 'SHIPPER' && acc.portalType !== 'SHIPPER') return false;
      return true;
    });
  }, [accounts, accountFilter]);

  const deletedAccountCount = useMemo(
    () => portalAccounts.filter((acc) => acc.isDeleted).length,
    [portalAccounts]
  );

  const visiblePortalAccounts = useMemo(
    () => portalAccounts.filter((acc) => (showDeletedAccounts ? Boolean(acc.isDeleted) : !acc.isDeleted)),
    [portalAccounts, showDeletedAccounts]
  );

  const elasticAccountsResult = useMemo(
    () =>
      elasticSearchMatch(visiblePortalAccounts, searchQuery, [
        'username',
        'fullName',
        'email',
        'phone',
        'jobTitle',
        'companyName',
        'taxCode',
        'role',
        'roleLabel',
        'department',
        'customerId',
        'assignedHubCode'
      ]),
    [visiblePortalAccounts, searchQuery]
  );
  const filteredAccounts = elasticAccountsResult.items;

  const editingAccount = useMemo(
    () => accounts.find((a) => a.username === editingAccountUsername) || null,
    [accounts, editingAccountUsername]
  );

  const detailAccount = useMemo(
    () => accounts.find((a) => a.username === detailAccountUsername) || null,
    [accounts, detailAccountUsername]
  );

  const handleSelectRoleInForm = (roleKey) => {
    const tpl = ENTERPRISE_ROLES[roleKey] || ENTERPRISE_ROLES.DISPATCHER;
    setNewUserForm((prev) => ({
      ...prev,
      role: roleKey,
      department: tpl.department,
      permissions: [...tpl.permissions]
    }));
  };

  const handleToggleFormPermission = (permCode) => {
    setNewUserForm((prev) => {
      const exists = prev.permissions.includes(permCode);
      const nextPerms = exists
        ? prev.permissions.filter((p) => p !== permCode)
        : [...prev.permissions, permCode];
      return { ...prev, permissions: nextPerms };
    });
  };

  const handleProvisionUser = async (e) => {
    e.preventDefault();
    setProvisionStatus(null);
    if (!isAdmin) {
      setProvisionStatus({
        ok: false,
        message:
          'Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền khởi tạo và phân quyền tài khoản.'
      });
      return;
    }

    try {
      const created = await adminCreateAccount(newUserForm);
      setProvisionStatus({
        ok: true,
        message: `Đã khởi tạo thành công tài khoản "@${created.username}" với vai trò ${created.role} (${created.permissions.length} quyền)! Nhân sự này có thể đăng nhập ngay tại trang /login.`
      });
      setNewUserForm({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        jobTitle: '',
        companyId: '',
        department: ENTERPRISE_ROLES[newUserForm.role]?.department || 'Trung Tâm Điều Hành Nội Bộ',
        customerId: '',
        role: newUserForm.role,
        permissions: [...(ENTERPRISE_ROLES[newUserForm.role]?.permissions || [])]
      });
    } catch (err) {
      setProvisionStatus({
        ok: false,
        message: err.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.'
      });
    }
  };

  const handleChangeAccountRole = async (accUsername, nextRole) => {
    if (!isAdmin) return;
    try {
    await adminUpdateAccount(accUsername, {
      role: nextRole,
      department: ENTERPRISE_ROLES[nextRole]?.department,
      permissions: [...(ENTERPRISE_ROLES[nextRole]?.permissions || [])]
    });
    setProvisionStatus({
      ok: true,
      message: `Đã cập nhật vai trò của tài khoản "@${accUsername}" sang ${nextRole} và đồng bộ bộ quyền chuẩn.`
    });
    } catch (err) { setProvisionStatus({ ok: false, message: err.message }); }
  };

  const handleToggleAccountStatus = async (acc) => {
    if (!isAdmin || acc.username === 'admin') return;
    const nextStatus = acc.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
    await adminUpdateAccount(acc.username, { status: nextStatus });
    setProvisionStatus({
      ok: true,
      message:
        nextStatus === 'LOCKED'
          ? `Đã tạm khóa quyền đăng nhập của tài khoản "@${acc.username}".`
          : `Đã mở khóa kích hoạt lại tài khoản "@${acc.username}".`
    });
    } catch (err) { setProvisionStatus({ ok: false, message: err.message }); }
  };

  const handleRemoveAccount = async (acc) => {
    if (!isAdmin || acc.username === 'admin') return;
    try {
      await adminDeleteAccount(acc.username);
      if (editingAccountUsername === acc.username) {
        setEditingAccountUsername(null);
      }
      setProvisionStatus({
        ok: true,
        message: `Đã xóa mềm tài khoản "@${acc.username}" (chuyển vào Thùng rác, có thể khôi phục).`
      });
    } catch (err) {
      setProvisionStatus({
        ok: false,
        message: err.message
      });
    }
  };

  const handleRestoreAccount = async (acc) => {
    if (!isAdmin) return;
    try {
      await adminRestoreAccount(acc.username);
      setProvisionStatus({
        ok: true,
        message: `Đã khôi phục tài khoản "@${acc.username}" về trạng thái hoạt động.`
      });
    } catch (err) {
      setProvisionStatus({
        ok: false,
        message: err.message
      });
    }
  };

  const handleToggleExistingAccountPermission = async (acc, permCode) => {
    if (!demoIdentity) return;
    if (!isAdmin || acc.username === 'admin') return;
    const currentPerms = Array.isArray(acc.permissions) ? acc.permissions : [];
    const exists = currentPerms.includes(permCode);
    const nextPerms = exists
      ? currentPerms.filter((p) => p !== permCode)
      : [...currentPerms, permCode];
    await adminUpdateAccount(acc.username, { permissions: nextPerms });
  };

  const handleSubmitPreTrip = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setInspectionResult(null);
    const requestPayload = {
      vehicleId: checklist.vehicleId,
      driverId: checklist.driverId,
      tirePressurePassed: Boolean(checklist.tiresOk),
      brakeSystemPassed: Boolean(checklist.brakesOk),
      lightingSystemPassed: Boolean(checklist.lightsOk),
      fluidLevelPassed: Boolean(checklist.steeringOk),
      cargoSecuringPassed: Boolean(checklist.hornAndMirrorsOk),
      emergencyKitPassed: Boolean(checklist.safetyEquipmentOk),
      odometerKm: Number(checklist.odometerKm) || 0,
      remarks: checklist.notes
    };
    try {
      const res = await api.submitPreTripInspection(requestPayload);
      if (!res?.result?.id) throw new Error('Máy chủ chưa xác nhận biên bản.');
      setInspectionResult({
        ok: true,
        message: `Đã lưu biên bản kiểm tra trước chuyến ${res.result.id}.`,
        data: res.result
      });
    } catch (err) {
      setInspectionResult({
        ok: false,
        message: err?.status === 422 ? 'Biên bản không đạt kiểm tra an toàn. Phương tiện chưa đủ điều kiện xuất bến.'
          : `Chưa lưu được biên bản: ${err?.message || 'Không kết nối được máy chủ'}. Vui lòng thử lại.`
      });
    } finally { setSubmitting(false); }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setIncidentStatus(null);
    const incidentPayload = {
      ...incidentForm, latitude: Number(incidentForm.latitude), longitude: Number(incidentForm.longitude),
      incidentCode: `INC-${Date.now().toString().slice(-6)}`
    };
    try {
      const res = await api.createIncident(incidentPayload);
      if (!res?.result?.id) throw new Error('Máy chủ chưa xác nhận báo cáo.');
      setIncidentStatus({
        ok: true,
        message: `Đã lưu báo cáo sự cố ${res.result.incidentCode}. Hồ sơ đang chờ thẩm định.`
      });
    } catch (err) {
      setIncidentStatus({
        ok: false,
        message: `Chưa gửi được báo cáo: ${err.message}. Nội dung được giữ lại để bạn thử lại.`
      });
    } finally { setSubmitting(false); }
  };

  const activeAccountsList = useMemo(() => accounts.filter((a) => !a.isDeleted), [accounts]);
  const internalCount = activeAccountsList.filter((a) => a.portalType === 'INTERNAL').length;
  const customerCount = activeAccountsList.filter((a) => a.portalType === 'CUSTOMER').length;
  const shipperCount = activeAccountsList.filter((a) => a.portalType === 'SHIPPER').length;

  return (
    <div className="page-body">
      {identityLoading && <p role="status">Đang tải dữ liệu tài khoản từ máy chủ…</p>}
      {identityError && <div role="alert">Không tải được danh sách: {identityError} <button className="btn btn-secondary" onClick={() => refreshIdentity().catch(() => {})}>Thử tải lại</button></div>}
      {resourceError && <p role="alert">Không tải được xe, tài xế hoặc chuyến: {resourceError}</p>}
      {/* Header & Module Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '22px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '4px' }}>
            {defaultTab === 'RBAC' ? 'Quản lý tài khoản & doanh nghiệp' : 'An toàn & sự cố'}
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Thông tin được lưu tại máy chủ. Quyền truy cập được kế thừa theo vai trò của tài khoản.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            ...(isAdmin
              ? [{ id: 'RBAC', label: '🔐 Quản Lý Tài Khoản & Phân Quyền (Admin IAM)', icon: Users }]
              : []),
            { id: 'PRETRIP', label: '🛠️ Kiểm tra trước chuyến', icon: ClipboardCheck },
            { id: 'INCIDENT', label: '🚨 Báo Cáo Sự Cố & Điểm Phạt', icon: AlertOctagon }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background:
                  activeTab === tab.id
                    ? 'var(--accent-green-dim)'
                    : isDark
                      ? 'rgba(30, 41, 59, 0.7)'
                      : 'var(--bg-card)',
                border: `1px solid ${activeTab === tab.id ? 'var(--accent-green)' : 'var(--border-color)'}`,
                color: activeTab === tab.id ? 'var(--accent-green-light)' : 'var(--text-main)',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ADMIN ACCOUNT DIRECTORY, CREATION & PERMISSION ASSIGNMENT */}
      {activeTab === 'RBAC' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 1. Summary KPI Row */}
          <div className="grid-4">
            <div className="card stat-card">
              <div>
                <div className="stat-label">Tổng Tài Khoản Hệ Thống</div>
                <div className="stat-value" style={{ color: 'var(--text-main)' }}>
                  {activeAccountsList.length}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Định danh tập trung IAM
                </span>
              </div>
              <Users size={28} color="#a855f7" />
            </div>

            <div className="card stat-card">
              <div>
                <div className="stat-label">Nhân Sự Nội Bộ (Admin Cấp)</div>
                <div className="stat-value" style={{ color: '#38bdf8' }}>
                  {internalCount}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#38bdf8' }}>
                  Khởi tạo &amp; phân quyền bởi ADMIN
                </span>
              </div>
              <ShieldCheck size={28} color="#38bdf8" />
            </div>

            <div className="card stat-card">
              <div>
                <div className="stat-label">Tài Khoản Khách Hàng (User)</div>
                <div className="stat-value" style={{ color: '#34d399' }}>
                  {customerCount}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#34d399' }}>
                  Tự đăng ký (/register) hoặc Admin cấp
                </span>
              </div>
              <UserPlus size={28} color="#10b981" />
            </div>

            <div className="card stat-card">
              <div>
                <div className="stat-label">Doanh Nghiệp &amp; Đối Tác</div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>
                  {companies.filter((c) => !c.isDeleted).length}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Hồ sơ B2B • MST • Hạn mức Net-30
                </span>
              </div>
              <Building2 size={28} color="#f59e0b" />
            </div>
          </div>

          {/* Sub-navigation: IAM Users, Drivers, Controllers, All Staff by Role, Branches, Enterprise Companies */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRbacSubTab('USERS')}
              className={`btn ${rbacSubTab === 'USERS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <Users size={15} />
              <span>Quản Lý User &amp; Hồ Sơ Chi Tiết ({activeAccountsList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('DRIVERS')}
              className={`btn ${rbacSubTab === 'DRIVERS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <Truck size={15} />
              <span>Nhân Viên Lái Xe ({orgDriverCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('CONTROLLERS')}
              className={`btn ${rbacSubTab === 'CONTROLLERS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <ClipboardCheck size={15} />
              <span>Nhân Viên Kiểm Soát ({orgControllerCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('STAFF')}
              className={`btn ${rbacSubTab === 'STAFF' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <Briefcase size={15} />
              <span>Nhân Viên Theo Vai Trò ({orgStaffCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('BRANCHES')}
              className={`btn ${rbacSubTab === 'BRANCHES' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <MapPin size={15} />
              <span>Chi Nhánh &amp; Văn Phòng ({orgBranchCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('APPLICATIONS')}
              className={`btn ${rbacSubTab === 'APPLICATIONS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <ClipboardCheck size={15} />
              <span>Đơn Xin Việc &amp; Tuyển Dụng</span>
            </button>
            <button
              type="button"
              onClick={() => setRbacSubTab('COMPANIES')}
              className={`btn ${rbacSubTab === 'COMPANIES' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            >
              <Building2 size={15} />
              <span>Quản Lý Công Ty &amp; Đối Tác B2B ({companies.filter((c) => !c.isDeleted).length})</span>
            </button>
          </div>

          {rbacSubTab === 'COMPANIES' ? (
            <AdminCompaniesTab isAdmin={isAdmin} />
          ) : rbacSubTab === 'APPLICATIONS' ? (
            <AdminApplicationsTab
              isAdmin={isAdmin}
              actorUsername={user?.username || 'admin'}
              onOnboardedSuccess={(_data, nextStaffList) => {
                handleSyncStaffCounts(nextStaffList || getLocalStaff(false));
              }}
            />
          ) : rbacSubTab === 'BRANCHES' ? (
            <AdminBranchesTab
              isAdmin={isAdmin}
              onBranchesChanged={(list) => setOrgBranchCount(list.filter((b) => !b.isDeleted).length)}
            />
          ) : rbacSubTab === 'DRIVERS' ? (
            <AdminStaffByRoleTab
              focusMode="DRIVERS"
              isAdmin={isAdmin}
              canVerify={isAdmin || user?.role === 'SAFETY_MANAGER'}
              onStaffChanged={handleSyncStaffCounts}
            />
          ) : rbacSubTab === 'CONTROLLERS' ? (
            <AdminStaffByRoleTab
              focusMode="CONTROLLERS"
              isAdmin={isAdmin}
              canVerify={isAdmin || user?.role === 'SAFETY_MANAGER'}
              onStaffChanged={handleSyncStaffCounts}
            />
          ) : rbacSubTab === 'STAFF' ? (
            <AdminStaffByRoleTab
              focusMode="ALL"
              isAdmin={isAdmin}
              canVerify={isAdmin || user?.role === 'SAFETY_MANAGER'}
              onStaffChanged={handleSyncStaffCounts}
            />
          ) : (
            <>

          {provisionStatus && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: provisionStatus.ok
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(239, 68, 68, 0.16)',
                border: `1px solid ${provisionStatus.ok ? '#10b981' : '#ef4444'}`,
                color: provisionStatus.ok ? '#34d399' : '#fca5a5',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{provisionStatus.message}</span>
              <button
                type="button"
                onClick={() => setProvisionStatus(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 2. Split Grid: Account Directory Table (Left) + Create & Assign Role Form (Right) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
              gap: '22px',
              alignItems: 'start'
            }}
          >
            {/* Left Card: Complete Account Directory & Inline Role/Permission Management */}
            <div className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Users size={18} color="#38bdf8" />
                    <span>Danh Sách Tài Khoản Hệ Thống ({filteredAccounts.length})</span>
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                    Quản trị viên có thể đổi Vai trò (Role), tùy chỉnh quyền chi tiết hoặc khóa/xóa
                    tài khoản trực tiếp tại bảng này.
                  </p>
                </div>

                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `Tất cả (${accounts.length})` },
                    { id: 'INTERNAL', label: `Nội bộ (${internalCount})` },
                    { id: 'CUSTOMER', label: `Khách hàng (${customerCount})` },
                    { id: 'SHIPPER', label: `Shipper 3PL (${shipperCount})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAccountFilter(f.id)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 999,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border:
                          accountFilter === f.id
                            ? '1px solid #10b981'
                            : '1px solid rgba(148, 163, 184, 0.25)',
                        background:
                          accountFilter === f.id ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                        color: accountFilter === f.id ? '#34d399' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Elastic Search & Soft Delete Toggle */}
              <div style={{ marginBottom: 14 }}>
                <SearchToolbar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  label="Tìm tài khoản"
                  loading={identityLoading}
                  placeholder="Tên đăng nhập, họ tên, vai trò hoặc phòng ban…"
                  totalCount={visiblePortalAccounts.length}
                  matchedCount={filteredAccounts.length}
                  showDeleted={showDeletedAccounts}
                  onToggleDeleted={() => setShowDeletedAccounts((prev) => !prev)}
                  deletedCount={deletedAccountCount}
                />
              </div>

              {filteredAccounts.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                    border: '1px dashed #334155',
                    borderRadius: 10
                  }}
                >
                  Chưa có tài khoản nào trong nhóm này. Hãy dùng biểu mẫu bên phải để khởi tạo tài
                  khoản nhân sự nội bộ mới hoặc đăng ký tài khoản khách hàng tại{' '}
                  <code>/register</code>.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tài Khoản &amp; Liên Hệ</th>
                        <th>Người Dùng &amp; Công Ty (MST)</th>
                        <th>Vai Trò (Phân Quyền Role)</th>
                        <th>Quyền &amp; Hồ Sơ</th>
                        <th>Trạng Thái &amp; Quản Lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((acc) => {
                        const isRoot = acc.username === 'admin' || acc.isRootAdmin;
                        const isSeed = Boolean(acc.isSystemSeed);
                        const permCount = Array.isArray(acc.permissions)
                          ? acc.permissions.length
                          : 0;
                        return (
                          <tr key={acc.username}>
                            <td>
                              <code style={{ color: '#38bdf8', fontWeight: 800 }}>
                                @{acc.username}
                              </code>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {acc.email}
                              </div>
                              {acc.phone && (
                                <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                                  📞 {acc.phone}
                                </div>
                              )}
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Nguồn:{' '}
                                {acc.createdBy === 'SELF_REGISTERED'
                                  ? 'User tự đăng ký'
                                  : `Cấp bởi ${acc.createdBy || 'ADMIN'}`}
                              </div>
                            </td>

                            <td>
                              <strong style={{ color: 'var(--text-main)', fontSize: '0.84rem' }}>
                                {acc.fullName}
                              </strong>
                              {acc.jobTitle && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                                  {acc.jobTitle}
                                </div>
                              )}
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                🏢 {acc.companyName || acc.department}
                              </div>
                              {(acc.taxCode || acc.customerId) && (
                                <div style={{ fontSize: '0.69rem', color: '#64748b' }}>
                                  {acc.customerId ? `Mã: ${acc.customerId}` : ''}
                                  {acc.taxCode ? ` • MST: ${acc.taxCode}` : ''}
                                </div>
                              )}
                            </td>

                            <td>
                              {isRoot || isSeed ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: isRoot
                                      ? 'rgba(168, 85, 247, 0.2)'
                                      : 'rgba(16, 185, 129, 0.16)',
                                    color: isRoot ? '#d8b4fe' : '#6ee7b7',
                                    border: isRoot ? '1px solid #a855f7' : '1px solid #10b981'
                                  }}
                                >
                                  {isRoot ? 'ROOT ADMIN' : `${acc.role} (CỐ ĐỊNH)`}
                                </span>
                              ) : (
                                <select
                                  disabled={!isAdmin}
                                  value={acc.role}
                                  onChange={(e) =>
                                    handleChangeAccountRole(acc.username, e.target.value)
                                  }
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    background: 'var(--bg-primary)',
                                    border: `1px solid ${acc.color || '#38bdf8'}`,
                                    color: acc.color || '#38bdf8',
                                    fontWeight: 700,
                                    fontSize: '0.76rem',
                                    cursor: isAdmin ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  {roleNames.map((rKey) => (
                                    <option key={rKey} value={rKey}>
                                      {rKey}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
                                <button
                                  type="button"
                                  onClick={() => setDetailAccountUsername(acc.username)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: 'var(--accent-green)',
                                    fontSize: '0.73rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  <Edit3 size={12} />
                                  <span>Chi tiết User / Công ty</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingAccountUsername(
                                      editingAccountUsername === acc.username ? null : acc.username
                                    )
                                  }
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    background:
                                      editingAccountUsername === acc.username
                                        ? 'rgba(56, 189, 248, 0.25)'
                                        : 'rgba(56, 189, 248, 0.1)',
                                    color: '#38bdf8',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  <Settings2 size={12} />
                                  <span>
                                    {permCount}/{permissionsCatalog.length} quyền
                                  </span>
                                </button>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  className={
                                    acc.isDeleted
                                      ? 'badge badge-red'
                                      : acc.status === 'LOCKED'
                                        ? 'badge badge-amber'
                                        : 'badge badge-green'
                                  }
                                  style={{ fontSize: '0.68rem' }}
                                >
                                  {acc.isDeleted ? 'ĐÃ XÓA MỀM' : acc.status === 'LOCKED' ? 'ĐÃ KHÓA' : 'ACTIVE'}
                                </span>

                                {!isRoot && isAdmin && (
                                  <>
                                    {acc.isDeleted ? (
                                      <button
                                        type="button"
                                        title="Khôi phục tài khoản"
                                        onClick={() => handleRestoreAccount(acc)}
                                        style={{
                                          padding: '4px 8px',
                                          borderRadius: 6,
                                          border: '1px solid rgba(16, 185, 129, 0.4)',
                                          background: 'rgba(16, 185, 129, 0.14)',
                                          color: '#34d399',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: '0.7rem',
                                          fontWeight: 700
                                        }}
                                      >
                                        <RotateCcw size={12} />
                                        Khôi phục
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          title={
                                            acc.status === 'LOCKED'
                                              ? 'Mở khóa tài khoản'
                                              : 'Khóa tài khoản'
                                          }
                                          onClick={() => handleToggleAccountStatus(acc)}
                                          style={{
                                            padding: '4px 7px',
                                            borderRadius: 6,
                                            border: '1px solid #334155',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: acc.status === 'LOCKED' ? '#34d399' : '#fbbf24',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          {acc.status === 'LOCKED' ? (
                                            <Unlock size={13} />
                                          ) : (
                                            <Lock size={13} />
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          title="Xóa mềm tài khoản (chuyển vào Thùng rác)"
                                          onClick={() => handleRemoveAccount(acc)}
                                          style={{
                                            padding: '4px 7px',
                                            borderRadius: 6,
                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                            background: 'rgba(239, 68, 68, 0.12)',
                                            color: '#f87171',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Drawer / Panel chỉnh sửa quyền chi tiết cho tài khoản đang chọn */}
              {editingAccount && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 16,
                    borderRadius: 12,
                    background: isDark ? 'rgba(9, 13, 22, 0.9)' : '#f8fafc',
                    border: '1.5px solid #38bdf8'
                  }}
                >
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
                      <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>
                        Ma Trận Phân Quyền Chi Tiết: @{editingAccount.username} (
                        {editingAccount.role})
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Quyền được kế thừa từ vai trò đã lưu trên máy chủ. Đổi vai trò để thay đổi quyền.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingAccountUsername(null)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #334155',
                        background: 'transparent',
                        color: '#cbd5e1',
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      Đóng ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: 8,
                      maxHeight: 260,
                      overflowY: 'auto',
                      paddingRight: 4
                    }}
                  >
                    {permissionsCatalog.map((perm) => {
                      const checked =
                        editingAccount.role === 'ADMIN' ||
                        (Array.isArray(editingAccount.permissions) &&
                          editingAccount.permissions.includes(perm.code));
                      return (
                        <label
                          key={perm.code}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '7px 9px',
                            borderRadius: 8,
                            background: checked
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(255,255,255,0.03)',
                            border: checked
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : '1px solid rgba(255,255,255,0.06)',
                            fontSize: '0.74rem',
                            cursor: editingAccount.username === 'admin' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!demoIdentity || editingAccount.username === 'admin' || !isAdmin}
                            checked={checked}
                            onChange={() =>
                              handleToggleExistingAccountPermission(editingAccount, perm.code)
                            }
                            style={{ marginTop: 2, accentColor: '#10b981' }}
                          />
                          <div>
                            <code style={{ color: '#6ee7b7', fontWeight: 700, fontSize: '0.7rem' }}>
                              {perm.code}
                            </code>
                            <div style={{ color: '#cbd5e1' }}>{perm.label}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Admin Form to Create New Internal Role Account & Assign Permissions */}
            <div className="card">
              <h3
                style={{
                  fontSize: '1.08rem',
                  fontWeight: 800,
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <UserPlus size={18} color="#10b981" />
                <span>Khởi Tạo Tài Khoản Nội Bộ &amp; Phân Quyền (Dành Cho ADMIN)</span>
              </h3>
              <p style={{ fontSize: '0.79rem', color: '#94a3b8', marginBottom: '16px' }}>
                Chọn vai trò và công ty phù hợp. Tài khoản chỉ xuất hiện sau khi máy chủ xác nhận đã lưu.
              </p>

              <form
                onSubmit={handleProvisionUser}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Tên đăng nhập (Username) *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      placeholder="VD: dispatcher01, safety01..."
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Mật khẩu khởi tạo (&ge; 3 ký tự) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={3}
                      autoComplete="new-password"
                      placeholder="Mật khẩu khởi tạo"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Họ và tên nhân sự *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Lê Minh Khoa"
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Email công vụ *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="VD: khoa.lm@ccadro.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Gán Vai trò (Role Nội bộ / Hệ thống) *
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => handleSelectRoleInForm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid #10b981',
                        color: 'var(--accent-green)',
                        fontWeight: 700,
                        fontSize: '0.84rem'
                      }}
                    >
                      {roleNames.map((name) => <option key={name} value={name}>{name} — {ENTERPRISE_ROLES[name]?.fullName || name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Phòng ban / Đơn vị trực thuộc
                    </label>
                    <input
                      type="text"
                      value={newUserForm.department}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, department: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Số điện thoại &amp; Chức vụ
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 0903 812 456"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                        marginBottom: '6px'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Chức vụ (VD: Điều phối viên)"
                      value={newUserForm.jobTitle}
                      onChange={(e) => setNewUserForm({ ...newUserForm, jobTitle: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '4px'
                      }}
                    >
                      Gắn Công Ty / Đối Tác B2B
                    </label>
                    <select
                      value={newUserForm.companyId}
                      onChange={(e) => {
                        const c = companies.find((x) => x.id === e.target.value);
                        setNewUserForm({
                          ...newUserForm,
                          companyId: e.target.value,
                          customerId: c ? c.companyCode : newUserForm.customerId
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem'
                      }}
                    >
                      <option value="">-- Mặc định theo vai trò --</option>
                      {companies
                        .filter((c) => !c.isDeleted)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyCode} — {c.companyName}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Granular Permission Assignment Matrix */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <label
                      style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}
                    >
                      Quyền kế thừa từ vai trò ({newUserForm.permissions.length}/
                      {permissionsCatalog.length} quyền được cấp):
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-green)' }}>
                      {ENTERPRISE_ROLES[newUserForm.role]?.description}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
                      gap: 6,
                      maxHeight: 210,
                      overflowY: 'auto',
                      padding: 10,
                      borderRadius: 8,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {permissionsCatalog.map((perm) => {
                      const isChecked = newUserForm.permissions.includes(perm.code);
                      return (
                        <label
                          key={perm.code}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            padding: '6px 8px',
                            borderRadius: 6,
                            background: isChecked
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(255,255,255,0.02)',
                            border: isChecked
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : '1px solid transparent',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!demoIdentity}
                            onChange={() => handleToggleFormPermission(perm.code)}
                            style={{ marginTop: 2, accentColor: '#10b981' }}
                          />
                          <div>
                            <code style={{ color: '#6ee7b7', fontWeight: 700 }}>{perm.code}</code>
                            <div style={{ color: '#94a3b8' }}>{perm.label}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', marginTop: '4px', padding: '11px 16px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Khởi Tạo Tài Khoản &amp; Áp Dụng Phân Quyền</span>
                </button>
              </form>
            </div>
          </div>
            </>
          )}

          <UserCompanyDetailModal
            account={detailAccount}
            isAdmin={isAdmin}
            onClose={() => setDetailAccountUsername(null)}
            onSavedNotice={(msg) => setProvisionStatus({ ok: true, message: msg })}
          />
        </div>
      )}

      {/* TAB 2: PRE-TRIP INSPECTION (UC01 & BRULE-01) */}
      {activeTab === 'PRETRIP' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Biên Bản Kiểm Tra An Toàn Kỹ Thuật 6 Hạng Mục Trước Chuyến
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px' }}>
            Quy định an toàn bắt buộc: Nếu bất kỳ hạng mục nào trong 6 hạng mục
            dưới đây không đạt (<code>false</code>), phương tiện lập tức bị khóa sang trạng thái{' '}
            <code>MAINTENANCE</code> và chặn xuất bến.
          </p>

          {inspectionResult && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                background: inspectionResult.ok
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.18)',
                border: `1px solid ${inspectionResult.ok ? '#10b981' : '#ef4444'}`,
                color: inspectionResult.ok ? '#34d399' : '#fca5a5',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              {inspectionResult.message}
            </div>
          )}

          <form
            onSubmit={handleSubmitPreTrip}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <label>Phương tiện
              <select aria-label="Phương tiện kiểm tra" required value={checklist.vehicleId} onChange={(e) => setChecklist({ ...checklist, vehicleId: e.target.value })}>
                <option value="">Chọn phương tiện</option>
                {resources.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber} — {v.vehicleCode}</option>)}
              </select>
            </label>
            <label>Tài xế kiểm tra
              <select aria-label="Tài xế kiểm tra" required value={checklist.driverId} onChange={(e) => setChecklist({ ...checklist, driverId: e.target.value })}>
                <option value="">Chọn tài xế</option>
                {resources.drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName} — {d.driverCode}</option>)}
              </select>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '12px'
              }}
            >
              {[
                { key: 'brakesOk', label: '1. Hệ thống Phanh hơi & Phanh tay (Brakes)' },
                { key: 'tiresOk', label: '2. Áp suất & Độ mòn Lốp container (Tires)' },
                { key: 'lightsOk', label: '3. Hệ thống Đèn pha, Xi-nhan & Cảnh báo (Lights)' },
                { key: 'steeringOk', label: '4. Mức dầu và dung dịch' },
                {
                  key: 'hornAndMirrorsOk',
                  label: '5. Chằng buộc và cố định hàng hóa'
                },
                {
                  key: 'safetyEquipmentOk',
                  label: '6. Bộ dụng cụ cứu hộ và sơ cứu'
                }
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: checklist[item.key]
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${checklist[item.key] ? 'rgba(16, 185, 129, 0.35)' : '#ef4444'}`,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</span>
                </label>
              ))}
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <ClipboardCheck size={16} /> Xác Nhận Biên Bản Kiểm Tra Trước Chuyến
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: FIELD INCIDENTS & DEMERIT GOVERNANCE (UC16, UC17, UC18) */}
      {activeTab === 'INCIDENT' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
            gap: '22px'
          }}
        >
          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Báo Cáo Sự Cố Hiện Trường
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Khi gửi báo cáo sự cố, hệ thống lập tức phát bản tin khẩn cấp tới Trung tâm Điều phối.
              Theo quy chuẩn an toàn, việc gửi báo cáo sự cố độc lập với quy trình đánh giá kỷ luật tài xế.
            </p>

            {incidentStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: incidentStatus.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${incidentStatus.ok ? '#10b981' : '#ef4444'}`,
                  color: incidentStatus.ok ? '#34d399' : '#ef4444',
                  fontSize: '0.82rem'
                }}
              >
                {incidentStatus.message}
              </div>
            )}

            <form
              onSubmit={handleReportIncident}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <label>Chuyến xảy ra sự cố
                <select aria-label="Chuyến xảy ra sự cố" required value={incidentForm.tripId} onChange={(e) => setIncidentForm({ ...incidentForm, tripId: e.target.value })}>
                  <option value="">Chọn chuyến</option>
                  {resources.trips.map((t) => <option key={t.id} value={t.id}>{t.tripCode || t.id}</option>)}
                </select>
              </label>
              <label>Tài xế liên quan
                <select aria-label="Tài xế liên quan" required value={incidentForm.driverId} onChange={(e) => setIncidentForm({ ...incidentForm, driverId: e.target.value })}>
                  <option value="">Chọn tài xế</option>
                  {resources.drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName} — {d.driverCode}</option>)}
                </select>
              </label>
              <label>Vĩ độ <input aria-label="Vĩ độ sự cố" required type="number" step="any" min="-90" max="90" value={incidentForm.latitude} onChange={(e) => setIncidentForm({ ...incidentForm, latitude: e.target.value })} /></label>
              <label>Kinh độ <input aria-label="Kinh độ sự cố" required type="number" step="any" min="-180" max="180" value={incidentForm.longitude} onChange={(e) => setIncidentForm({ ...incidentForm, longitude: e.target.value })} /></label>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px'
                  }}
                >
                  Loại sự cố hiện trường
                </label>
                <select
                  value={incidentForm.incidentType}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, incidentType: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="TRAFFIC_BLOCKADE">Phong tỏa giao thông / Tai nạn liên hoàn</option>
                  <option value="VEHICLE_BREAKDOWN">
                    Sự cố kỹ thuật phương tiện (Nổ lốp / Quá nhiệt)
                  </option>
                  <option value="SEVERE_WEATHER">Ngập lụt / Sạt lở thiên tai</option>
                  <option value="CARGO_HAZARD">Cảnh báo an toàn hàng hóa</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    marginBottom: '4px'
                  }}
                >
                  Mô tả hiện trường &amp; Kiến nghị đổi lộ trình
                </label>
                <textarea
                  required
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary">
                <AlertOctagon size={16} /> Gửi báo cáo sự cố
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Quản Trị Điểm Phạt &amp; Kỷ Luật An Toàn Tài Xế
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Ngưỡng cảnh báo tự động: <strong>10 điểm</strong> = Cảnh cáo an toàn (
              <code>WARNING_ISSUED</code>) • <strong>20 điểm</strong> = Chuyển Hội đồng Nhân sự xem
              xét kỷ luật nhưng <strong>không tự động khóa tài khoản</strong> khi chưa có quyết định phê duyệt.
            </p>
            <p role="status">Chưa kết nối luồng thẩm định và tổng hợp điểm phạt tại màn hình này. Xem hồ sơ thực tế trước khi ra quyết định kỷ luật.</p>
          </div>
        </div>
      )}
    </div>
  );
}
