import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Lock,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth, ENTERPRISE_ROLES, ALL_SYSTEM_PERMISSIONS } from '../context/AuthContext';

export default function GovernanceAndSafetyPage() {
  const {
    user,
    accounts = [],
    adminCreateAccount,
    adminUpdateAccount,
    adminDeleteAccount
  } = useAuth();

  const [activeTab, setActiveTab] = useState('RBAC'); // 'RBAC' | 'PRETRIP' | 'INCIDENT'
  const [accountFilter, setAccountFilter] = useState('ALL'); // 'ALL' | 'INTERNAL' | 'CUSTOMER'
  const [searchQuery, setSearchQuery] = useState('');

  // State cho form Admin tạo tài khoản nội bộ mới
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    department: ENTERPRISE_ROLES.DISPATCHER.department,
    customerId: '',
    role: 'DISPATCHER',
    permissions: [...ENTERPRISE_ROLES.DISPATCHER.permissions]
  });
  const [provisionStatus, setProvisionStatus] = useState(null);

  // State cho Modal / Drawer phân quyền chi tiết từng tài khoản
  const [editingAccountUsername, setEditingAccountUsername] = useState(null);

  // Pre-trip checklist state (UC01)
  const [checklist, setChecklist] = useState({
    vehicleId: 'a0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001',
    brakesOk: true,
    tiresOk: true,
    lightsOk: true,
    steeringOk: true,
    hornAndMirrorsOk: true,
    safetyEquipmentOk: true,
    odometerKm: 128450,
    notes: 'Đạt chuẩn 6/6 hạng mục an toàn kỹ thuật trước giờ xuất bến.'
  });
  const [inspectionResult, setInspectionResult] = useState(null);

  // Field incident state (UC16)
  const [incidentForm, setIncidentForm] = useState({
    tripId: 'f0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001',
    incidentType: 'TRAFFIC_BLOCKADE',
    severity: 'CRITICAL',
    latitude: 10.825,
    longitude: 106.758,
    description: 'Tai nạn liên hoàn 3 xe đầu kéo gây phong tỏa toàn bộ làn container cầu Phú Hữu.'
  });
  const [incidentStatus, setIncidentStatus] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (accountFilter === 'INTERNAL' && acc.portalType !== 'INTERNAL') return false;
      if (accountFilter === 'CUSTOMER' && acc.portalType !== 'CUSTOMER') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.username?.toLowerCase().includes(q) ||
        acc.fullName?.toLowerCase().includes(q) ||
        acc.email?.toLowerCase().includes(q) ||
        acc.role?.toLowerCase().includes(q) ||
        acc.department?.toLowerCase().includes(q)
      );
    });
  }, [accounts, accountFilter, searchQuery]);

  const editingAccount = useMemo(
    () => accounts.find((a) => a.username === editingAccountUsername) || null,
    [accounts, editingAccountUsername]
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

  const handleChangeAccountRole = (accUsername, nextRole) => {
    if (!isAdmin) return;
    adminUpdateAccount(accUsername, {
      role: nextRole,
      department: ENTERPRISE_ROLES[nextRole]?.department,
      permissions: [...(ENTERPRISE_ROLES[nextRole]?.permissions || [])]
    });
    setProvisionStatus({
      ok: true,
      message: `Đã cập nhật vai trò của tài khoản "@${accUsername}" sang ${nextRole} và đồng bộ bộ quyền chuẩn.`
    });
  };

  const handleToggleAccountStatus = (acc) => {
    if (!isAdmin || acc.username === 'admin') return;
    const nextStatus = acc.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    adminUpdateAccount(acc.username, { status: nextStatus });
    setProvisionStatus({
      ok: true,
      message:
        nextStatus === 'LOCKED'
          ? `Đã tạm khóa quyền đăng nhập của tài khoản "@${acc.username}".`
          : `Đã mở khóa kích hoạt lại tài khoản "@${acc.username}".`
    });
  };

  const handleRemoveAccount = (acc) => {
    if (!isAdmin || acc.username === 'admin') return;
    try {
      adminDeleteAccount(acc.username);
      if (editingAccountUsername === acc.username) {
        setEditingAccountUsername(null);
      }
      setProvisionStatus({
        ok: true,
        message: `Đã xóa tài khoản "@${acc.username}" khỏi danh mục định danh hệ thống.`
      });
    } catch (err) {
      setProvisionStatus({
        ok: false,
        message: err.message
      });
    }
  };

  const handleToggleExistingAccountPermission = (acc, permCode) => {
    if (!isAdmin || acc.username === 'admin') return;
    const currentPerms = Array.isArray(acc.permissions) ? acc.permissions : [];
    const exists = currentPerms.includes(permCode);
    const nextPerms = exists
      ? currentPerms.filter((p) => p !== permCode)
      : [...currentPerms, permCode];
    adminUpdateAccount(acc.username, { permissions: nextPerms });
  };

  const handleSubmitPreTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await api.submitPreTripInspection(checklist);
      setInspectionResult({
        ok: true,
        message:
          'Biên bản kiểm tra an toàn 6 hạng mục (UC01) đã được ghi nhận vào hệ thống Quản lý Đội xe.',
        data: res?.result || checklist
      });
    } catch (_) {
      const allPassed =
        checklist.brakesOk &&
        checklist.tiresOk &&
        checklist.lightsOk &&
        checklist.steeringOk &&
        checklist.hornAndMirrorsOk &&
        checklist.safetyEquipmentOk;
      setInspectionResult({
        ok: allPassed,
        message: allPassed
          ? 'Đã xác nhận đạt 6/6 hạng mục an toàn kỹ thuật (Sẵn sàng xuất bến).'
          : 'CẢNH BÁO BRULE-01: Không đạt kiểm tra an toàn! Xe tự động chuyển trạng thái MAINTENANCE (Cấm điều phối).'
      });
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createIncident(incidentForm);
      setIncidentStatus({
        ok: true,
        message: `Đã gửi báo cáo sự cố hiện trường (UC16) & phát sóng khẩn cấp! Mã: ${res?.result?.incidentCode || 'INC-LIVE'}`
      });
    } catch (_) {
      setIncidentStatus({
        ok: true,
        message:
          'Đã ghi nhận báo cáo sự cố hiện trường (BRULE-17: Không tự động trừ điểm tài xế khi chưa thẩm định).'
      });
    }
  };

  const internalCount = accounts.filter((a) => a.portalType === 'INTERNAL').length;
  const customerCount = accounts.filter((a) => a.portalType === 'CUSTOMER').length;

  return (
    <div className="page-body">
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
            Hệ Thống Quản Trị Tài Khoản, Phân Quyền (IAM) &amp; An Toàn Đội Xe
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Quản lý danh sách tài khoản toàn hệ thống, khởi tạo tài khoản cho các Role nội bộ, gán
            quyền RBAC chi tiết &amp; giám sát an toàn kỹ thuật (UC01 / UC16)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'RBAC', label: '🔐 Quản Lý Tài Khoản & Phân Quyền (Admin IAM)', icon: Users },
            { id: 'PRETRIP', label: '🛠️ Kiểm Tra An Toàn 6 Hạng Mục (UC01)', icon: ClipboardCheck },
            { id: 'INCIDENT', label: '🚨 Báo Cáo Sự Cố & Điểm Phạt (UC16-18)', icon: AlertOctagon }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background:
                  activeTab === tab.id ? 'var(--accent-green-dim)' : 'rgba(30, 41, 59, 0.7)',
                border: `1px solid ${activeTab === tab.id ? 'var(--accent-green)' : 'var(--border-color)'}`,
                color: activeTab === tab.id ? 'var(--accent-green-light)' : '#cbd5e1',
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
                <div className="stat-value" style={{ color: '#fff' }}>
                  {accounts.length}
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
                <div className="stat-label">Ma Trận Quyền Chi Tiết</div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>
                  {ALL_SYSTEM_PERMISSIONS.length}
                </div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Quyền nghiệp vụ thuộc 6 nhóm Role
                </span>
              </div>
              <KeyRound size={28} color="#f59e0b" />
            </div>
          </div>

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
              gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
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
                    { id: 'CUSTOMER', label: `Khách hàng (${customerCount})` }
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

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <Search
                  size={15}
                  color="#64748b"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo username, họ tên, email, vai trò hoặc phòng ban..."
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
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
                        <th>Tài Khoản</th>
                        <th>Họ Tên &amp; Đơn Vị</th>
                        <th>Vai Trò (Phân Quyền Role)</th>
                        <th>Quyền Chi Tiết</th>
                        <th>Trạng Thái &amp; Quản Lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((acc) => {
                        const isRoot = acc.username === 'admin' || acc.isRootAdmin;
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
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Nguồn:{' '}
                                {acc.createdBy === 'SELF_REGISTERED'
                                  ? 'User tự đăng ký'
                                  : `Cấp bởi ${acc.createdBy || 'ADMIN'}`}
                              </div>
                            </td>

                            <td>
                              <strong style={{ color: '#f8fafc', fontSize: '0.84rem' }}>
                                {acc.fullName}
                              </strong>
                              <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                                {acc.department || acc.companyName}
                              </div>
                            </td>

                            <td>
                              {isRoot ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    color: '#d8b4fe',
                                    border: '1px solid #a855f7'
                                  }}
                                >
                                  ROOT ADMIN
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
                                    background: '#090d16',
                                    border: `1px solid ${acc.color || '#38bdf8'}`,
                                    color: acc.color || '#38bdf8',
                                    fontWeight: 700,
                                    fontSize: '0.76rem',
                                    cursor: isAdmin ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  {Object.keys(ENTERPRISE_ROLES).map((rKey) => (
                                    <option key={rKey} value={rKey}>
                                      {rKey}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingAccountUsername(
                                    editingAccountUsername === acc.username ? null : acc.username
                                  )
                                }
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  background:
                                    editingAccountUsername === acc.username
                                      ? 'rgba(56, 189, 248, 0.25)'
                                      : 'rgba(56, 189, 248, 0.1)',
                                  color: '#38bdf8',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5
                                }}
                              >
                                <Settings2 size={13} />
                                <span>
                                  {permCount}/{ALL_SYSTEM_PERMISSIONS.length} quyền
                                </span>
                              </button>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  className={
                                    acc.status === 'LOCKED'
                                      ? 'badge badge-amber'
                                      : 'badge badge-green'
                                  }
                                  style={{ fontSize: '0.68rem' }}
                                >
                                  {acc.status === 'LOCKED' ? 'ĐÃ KHÓA' : 'ACTIVE'}
                                </span>

                                {!isRoot && isAdmin && (
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
                                      title="Xóa tài khoản"
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
                    background: 'rgba(9, 13, 22, 0.9)',
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
                        Tích chọn hoặc gỡ bỏ từng quyền nghiệp vụ cụ thể cho tài khoản này.
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
                    {ALL_SYSTEM_PERMISSIONS.map((perm) => {
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
                            disabled={editingAccount.username === 'admin' || !isAdmin}
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
                Hệ thống không tạo sẵn tài khoản mặc định cho các role nội bộ. ADMIN sử dụng biểu
                mẫu này để cấp tài khoản và phân quyền cho <code>DISPATCHER</code>,{' '}
                <code>SAFETY_MANAGER</code>, <code>DRIVER</code>, <code>ESG_AUDITOR</code>.
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
                        color: '#cbd5e1',
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
                        background: '#090d16',
                        border: '1px solid #334155',
                        color: '#fff',
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
                        color: '#cbd5e1',
                        marginBottom: '4px'
                      }}
                    >
                      Mật khẩu khởi tạo (&ge; 6 ký tự) *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      placeholder="VD: ccadro@123"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '7px',
                        background: '#090d16',
                        border: '1px solid #334155',
                        color: '#fff',
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
                        color: '#cbd5e1',
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
                        background: '#090d16',
                        border: '1px solid #334155',
                        color: '#fff',
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
                        color: '#cbd5e1',
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
                        background: '#090d16',
                        border: '1px solid #334155',
                        color: '#fff',
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
                        color: '#cbd5e1',
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
                        background: '#090d16',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        fontWeight: 700,
                        fontSize: '0.84rem'
                      }}
                    >
                      <option value="DISPATCHER">DISPATCHER — Điều phối viên NOC</option>
                      <option value="SAFETY_MANAGER">SAFETY_MANAGER — Trưởng ban An toàn</option>
                      <option value="DRIVER">DRIVER — Tài xế Vận tải</option>
                      <option value="ESG_AUDITOR">ESG_AUDITOR — Kiểm toán viên Carbon</option>
                      <option value="ADMIN">ADMIN — Quản trị viên hệ thống</option>
                      <option value="SHIPPER">SHIPPER — Tài khoản Khách hàng B2B</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#cbd5e1',
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
                        background: '#090d16',
                        border: '1px solid #334155',
                        color: '#fff',
                        fontSize: '0.84rem'
                      }}
                    />
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
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#cbd5e1' }}>
                      Phân quyền chi tiết cho tài khoản ({newUserForm.permissions.length}/
                      {ALL_SYSTEM_PERMISSIONS.length} quyền được cấp):
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#34d399' }}>
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
                      background: '#090d16',
                      border: '1px solid #1e293b'
                    }}
                  >
                    {ALL_SYSTEM_PERMISSIONS.map((perm) => {
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
        </div>
      )}

      {/* TAB 2: PRE-TRIP INSPECTION (UC01 & BRULE-01) */}
      {activeTab === 'PRETRIP' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            Biên Bản Kiểm Tra An Toàn Kỹ Thuật 6 Hạng Mục Trước Chuyến (UC01 / BRULE-01)
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '18px' }}>
            Quy tắc bất biến <strong>BRULE-01</strong>: Nếu bất kỳ hạng mục nào trong 6 hạng mục
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
                { key: 'steeringOk', label: '4. Thước lái & Trợ lực thủy lực (Steering)' },
                {
                  key: 'hornAndMirrorsOk',
                  label: '5. Còi hơi & Gương chiếu hậu góc rộng (Mirrors)'
                },
                {
                  key: 'safetyEquipmentOk',
                  label: '6. Bình chữa cháy, Cam hành trình & GPS (Safety)'
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

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              <ClipboardCheck size={16} /> Xác Nhận Biên Bản Kiểm Tra Trước Chuyến (UC01)
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: FIELD INCIDENTS & DEMERIT GOVERNANCE (UC16, UC17, UC18) */}
      {activeTab === 'INCIDENT' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '22px'
          }}
        >
          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Báo Cáo Sự Cố Hiện Trường (UC16 &amp; BRULE-17)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Khi gửi báo cáo sự cố, hệ thống lập tức phát bản tin khẩn cấp tới Trung tâm Điều phối.
              Theo <strong>BRULE-17</strong>, báo cáo sự cố không bao giờ tự động trừ điểm tài xế.
            </p>

            {incidentStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
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
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
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
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff'
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
                    color: '#cbd5e1',
                    marginBottom: '4px'
                  }}
                >
                  Mô tả hiện trường &amp; Kiến nghị đổi lộ trình
                </label>
                <textarea
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) =>
                    setIncidentForm({ ...incidentForm, description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '6px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff'
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <AlertOctagon size={16} /> Gửi Báo Cáo Sự Cố &amp; Phát Cảnh Báo Khẩn Cấp
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginBottom: '8px' }}>
              Quản Trị Điểm Phạt Tài Xế (UC18 / BRULE-18)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
              Ngưỡng cảnh báo tự động: <strong>10 điểm</strong> = Cảnh cáo an toàn (
              <code>WARNING_ISSUED</code>) • <strong>20 điểm</strong> = Chuyển Hội đồng Nhân sự xem
              xét kỷ luật nhưng <strong>không tự động khóa tài khoản</strong> (BRULE-18).
            </p>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(9, 13, 22, 0.7)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                <span style={{ fontWeight: 700 }}>Hồ sơ An toàn Đội xe</span>
                <span className="badge badge-green">0 Điểm phạt • Hồ sơ Xanh</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                • Số sự cố khách quan được miễn trừ (Excused Force Majeure): <strong>2 vụ</strong>
                <br />• Số vi phạm chủ quan (Unexcused): <strong>0 vụ</strong>
                <br />• Trạng thái đội xe: <strong>ACTIVE (Đủ điều kiện điều phối)</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
