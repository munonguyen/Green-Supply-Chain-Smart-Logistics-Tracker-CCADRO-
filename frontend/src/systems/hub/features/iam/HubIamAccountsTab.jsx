import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus
} from 'lucide-react';
import { api } from '../../../../services/api';
import SearchToolbar from '../../../../shared/components/search/SearchToolbar';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';

const HUB_SHIPPER_ROLE_OPTIONS = [
  {
    role: 'DRIVER',
    label: 'DRIVER — Tài xế giao vận Bưu cục (Khóa 1 Trụ sở + 1 Mã Shipper)'
  },
  {
    role: 'OPERATOR',
    label: 'OPERATOR — Nhân viên điều hành / Trưởng Bưu cục (Quản lý trạm)'
  },
  {
    role: 'HUB_SHIPPER',
    label: 'HUB_SHIPPER — Nhân viên Giao hàng Chặng cuối (Khóa 1 Trụ sở + 1 Mã Shipper)'
  },
  {
    role: 'HUB_AUDITOR',
    label: 'HUB_AUDITOR — Kiểm tra viên Ảnh POD & SLA Trụ sở (Chỉ đọc)'
  },
  {
    role: 'HUB_MANAGER',
    label: 'HUB_MANAGER — Trưởng Trụ sở Giao nhận (ADMIN cấp)'
  }
];

export default function HubIamAccountsTab({
  currentUser,
  accounts,
  hubAuthAuditLogs,
  activeHubCode,
  availableHubs,
  hubShippers,
  isDark,
  onProvisionAccount,
  onToggleStatus,
  onSoftDeleteAccount,
  onRestoreAccount
}) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const lockedHub = isAdmin ? activeHubCode : currentUser?.assignedHubCode || activeHubCode;

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('0912 345 678');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('HUB_SHIPPER');
  const [targetHubCode, setTargetHubCode] = useState(lockedHub || 'HUB-DINHBANG-BN');
  const [targetShipperCode, setTargetShipperCode] = useState(
    hubShippers[0]?.shipperCode || 'SHP-BN-001'
  );
  const [formMsg, setFormMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [remoteAccounts, setRemoteAccounts] = useState(null);
  const [remoteLogs, setRemoteLogs] = useState(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [showDeletedAccounts, setShowDeletedAccounts] = useState(false);

  useEffect(() => {
    setTargetHubCode(lockedHub || 'HUB-DINHBANG-BN');
  }, [lockedHub]);

  useEffect(() => {
    let active = true;
    const syncRemoteIam = async () => {
      try {
        const [accRes, logRes] = await Promise.all([
          api.getHubIamAccounts(isAdmin ? '' : lockedHub),
          api.getHubAuthAuditLogs(isAdmin ? '' : lockedHub)
        ]);
        if (!active) return;
        if (Array.isArray(accRes?.result) && accRes.result.length > 0) {
          setRemoteAccounts(accRes.result);
        }
        if (Array.isArray(logRes?.result) && logRes.result.length > 0) {
          setRemoteLogs(logRes.result);
        }
      } catch (_) {
        // Offline / Vite standalone mode uses AuthContext IAM ledger
      }
    };
    syncRemoteIam();
    return () => {
      active = false;
    };
  }, [isAdmin, lockedHub]);

  const cardBg = isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff';
  const subtleBg = isDark ? 'rgba(30, 41, 59, 0.55)' : '#f8fafc';
  const border = isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: isDark ? '1px solid rgba(148,163,184,0.28)' : '1px solid #cbd5e1',
    background: isDark ? '#0f172a' : '#ffffff',
    color: textPrimary,
    fontSize: 13
  };

  const scopedHubAccounts = useMemo(() => {
    const source = remoteAccounts || accounts || [];
    const hubRoles = ['OPERATOR', 'DRIVER', 'HUB_MANAGER', 'HUB_SHIPPER', 'HUB_AUDITOR', 'SHIPPER', 'ADMIN'];
    return source
      .map((acc) => ({
        ...acc,
        primaryRole: acc.primaryRole || acc.role
      }))
      .filter((acc) => hubRoles.includes(acc.primaryRole))
      .filter((acc) => {
        if (isAdmin) return true;
        return acc.assignedHubCode === lockedHub;
      });
  }, [remoteAccounts, accounts, isAdmin, lockedHub]);

  const deletedHubAccountsCount = useMemo(
    () => scopedHubAccounts.filter((acc) => Boolean(acc.isDeleted)).length,
    [scopedHubAccounts]
  );

  const activeOrDeletedHubAccounts = useMemo(
    () =>
      scopedHubAccounts.filter((acc) =>
        showDeletedAccounts ? Boolean(acc.isDeleted) : !acc.isDeleted
      ),
    [scopedHubAccounts, showDeletedAccounts]
  );

  const elasticHubAccounts = useMemo(
    () =>
      elasticSearchMatch(activeOrDeletedHubAccounts, accountSearch, [
        'username',
        'fullName',
        'primaryRole',
        'assignedHubCode',
        'assignedShipperCode',
        'email'
      ]),
    [activeOrDeletedHubAccounts, accountSearch]
  );
  const displayedAccounts = elasticHubAccounts.items;

  const displayedAuditLogs = useMemo(() => {
    const logs = remoteLogs || hubAuthAuditLogs || [];
    if (isAdmin) return logs.slice(0, 20);
    return logs
      .filter((l) => !l.assignedHubCode || l.assignedHubCode === lockedHub || l.assignedHubCode === 'GLOBAL')
      .slice(0, 20);
  }, [remoteLogs, hubAuthAuditLogs, isAdmin, lockedHub]);

  const handleProvision = async (e) => {
    e.preventDefault();
    setFormMsg(null);
    setSubmitting(true);
    try {
      const created = await onProvisionAccount({
        username,
        fullName,
        email,
        phone,
        password,
        role,
        assignedHubCode: isAdmin ? targetHubCode : lockedHub,
        assignedShipperCode: (role === 'HUB_SHIPPER' || role === 'DRIVER') ? targetShipperCode : null
      });
      setFormMsg({
        type: 'success',
        text: `Đã cấp tài khoản @${created.username} (${created.role}) vào phân vùng bảo mật hub_iam cho ${created.assignedHubCode}.`
      });
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err?.message || 'Không thể cấp tài khoản.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (acc) => {
    const nextStatus = acc.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setFormMsg(null);
    try {
      await onToggleStatus(acc.username, nextStatus);
      setFormMsg({
        type: 'success',
        text: `Đã chuyển tài khoản @${acc.username} sang trạng thái ${nextStatus}.`
      });
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err?.message || 'Không thể cập nhật trạng thái tài khoản.'
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Security Architecture Header Banner */}
      <section
        style={{
          background: cardBg,
          border,
          borderRadius: 16,
          padding: 18
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={18} color="#059669" />
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary }}>
                Kho Tài Khoản & Phân Quyền Bảo Mật Riêng (`hub_iam.hub_accounts`)
              </h3>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                Tách biệt hoàn toàn dữ liệu đăng nhập Shipper/Trụ sở khỏi bảng nghiệp vụ vận tải • Mã hóa BCrypt / Salted Digest • Khóa tự động sau 5 lần sai mật khẩu
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              background: 'rgba(16,185,129,0.14)',
              color: '#059669'
            }}
          >
            {isAdmin ? 'PHẠM VI TOÀN HỆ THỐNG (ADMIN)' : `CÔ LẬP TRỤ SỞ: ${lockedHub}`}
          </span>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start'
        }}
      >
        {/* Left: Provision New Hub Account */}
        <section
          style={{
            background: cardBg,
            border,
            borderRadius: 16,
            padding: 18
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <UserPlus size={16} color="#0284c7" />
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }}>
              Cấp Tài Khoản Nhân Sự Trụ Sở Mới
            </h4>
          </div>

          <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                Tên đăng nhập (username)
              </label>
              <input
                data-testid="iam-new-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: shipper_bn4"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                Họ và tên nhân sự
              </label>
              <input
                data-testid="iam-new-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="vd: Hoàng Văn Minh (Shipper BN #4)"
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                  Email công vụ
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="minh.bn4@ccadro.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                  Số điện thoại
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                Vai trò &amp; Phân quyền chức năng
              </label>
              <select
                data-testid="iam-new-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={inputStyle}
              >
                {HUB_SHIPPER_ROLE_OPTIONS.filter((opt) => isAdmin || opt.role !== 'HUB_MANAGER').map(
                  (opt) => (
                    <option key={opt.role} value={opt.role}>
                      {opt.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                  Trụ sở cô lập (Hub Scope)
                </label>
                <select
                  value={isAdmin ? targetHubCode : lockedHub}
                  disabled={!isAdmin}
                  onChange={(e) => setTargetHubCode(e.target.value)}
                  style={{ ...inputStyle, opacity: isAdmin ? 1 : 0.78 }}
                >
                  {availableHubs.map((h) => (
                    <option key={h.hubCode} value={h.hubCode}>
                      {h.hubCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                  Mã Shipper gắn cứng
                </label>
                <input
                  data-testid="iam-new-shipper-code"
                  value={(role === 'HUB_SHIPPER' || role === 'DRIVER') ? targetShipperCode : 'N/A (Quản lý/Điều hành)'}
                  disabled={role !== 'HUB_SHIPPER' && role !== 'DRIVER'}
                  onChange={(e) => setTargetShipperCode(e.target.value)}
                  placeholder="SHP-BN-004"
                  style={{ ...inputStyle, opacity: (role === 'HUB_SHIPPER' || role === 'DRIVER') ? 1 : 0.65 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 4 }}>
                Mật khẩu khởi tạo (&ge; 3 ký tự, mặc định: 123)
              </label>
              <input
                data-testid="iam-new-password"
                type="password"
                minLength={3}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vd: 123"
                style={inputStyle}
                required
              />
            </div>

            {formMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    formMsg.type === 'success'
                      ? 'rgba(16,185,129,0.14)'
                      : 'rgba(239,68,68,0.12)',
                  color: formMsg.type === 'success' ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <ShieldAlert size={14} />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="btn-provision-hub-account"
              disabled={submitting}
              style={{
                marginTop: 4,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <KeyRound size={14} />
              <span>{submitting ? 'Đang cấp phát...' : 'Cấp tài khoản vào hub_iam'}</span>
            </button>
          </form>
        </section>

        {/* Right: Accounts Table + Audit Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section
            style={{
              background: cardBg,
              border,
              borderRadius: 16,
              padding: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} color="#059669" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }}>
                  Danh Sách Tài Khoản Phân Quyền (`hub_iam.hub_accounts`)
                </h4>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
                {displayedAccounts.length} tài khoản trong phạm vi
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <SearchToolbar
                value={accountSearch}
                onChange={setAccountSearch}
                label="Tìm tài khoản trụ sở"
                placeholder="Tên đăng nhập, họ tên, vai trò hoặc trụ sở…"
                totalCount={activeOrDeletedHubAccounts.length}
                matchedCount={displayedAccounts.length}
                showDeleted={showDeletedAccounts}
                onToggleDeleted={() => setShowDeletedAccounts((prev) => !prev)}
                deletedCount={deletedHubAccountsCount}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayedAccounts.map((acc) => {
                const isLocked = acc.status === 'LOCKED';
                const canToggle = acc.primaryRole !== 'ADMIN' && acc.username !== currentUser?.username;
                return (
                  <div
                    key={acc.username}
                    data-testid={`hub-iam-row-${acc.username}`}
                    style={{
                      background: subtleBg,
                      border,
                      borderRadius: 12,
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>
                          @{acc.username}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 800,
                            background: 'rgba(2,132,199,0.14)',
                            color: '#0284c7'
                          }}
                        >
                          {acc.primaryRole}
                        </span>
                        {acc.assignedHubCode && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'rgba(16,185,129,0.14)',
                              color: '#059669'
                            }}
                          >
                            {acc.assignedHubCode}
                          </span>
                        )}
                        {acc.assignedShipperCode && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'rgba(139,92,246,0.14)',
                              color: '#7c3aed'
                            }}
                          >
                            {acc.assignedShipperCode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: textMuted, marginTop: 3 }}>
                        {acc.fullName} • Sai MK: {acc.failedLoginAttempts || 0}/5
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          background: isLocked
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(16,185,129,0.15)',
                          color: isLocked ? '#dc2626' : '#059669'
                        }}
                      >
                        {acc.status || 'ACTIVE'}
                      </span>

                      {canToggle && (
                        <>
                          {acc.isDeleted && onRestoreAccount ? (
                            <button
                              type="button"
                              onClick={async () => {
                                setFormMsg(null);
                                try {
                                  await onRestoreAccount(acc.username);
                                  setFormMsg({
                                    type: 'success',
                                    text: `Đã khôi phục tài khoản @${acc.username}.`
                                  });
                                } catch (err) {
                                  setFormMsg({ type: 'error', text: err?.message || 'Không thể khôi phục.' });
                                }
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(16,185,129,0.4)',
                                background: 'rgba(16,185,129,0.14)',
                                color: '#059669',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <RotateCcw size={12} />
                              <span>Khôi phục</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                data-testid={`btn-toggle-status-${acc.username}`}
                                onClick={() => handleStatusToggle(acc)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148,163,184,0.35)',
                                  background: isDark ? '#1e293b' : '#ffffff',
                                  color: isLocked ? '#059669' : '#dc2626',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                              </button>
                              {onSoftDeleteAccount && (
                                <button
                                  type="button"
                                  title="Xóa mềm tài khoản (chuyển vào Thùng rác)"
                                  onClick={async () => {
                                    setFormMsg(null);
                                    try {
                                      await onSoftDeleteAccount(acc.username);
                                      setFormMsg({
                                        type: 'success',
                                        text: `Đã xóa mềm tài khoản @${acc.username}.`
                                      });
                                    } catch (err) {
                                      setFormMsg({ type: 'error', text: err?.message || 'Không thể xóa mềm.' });
                                    }
                                  }}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(239,68,68,0.35)',
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Security Audit Trail */}
          <section
            style={{
              background: cardBg,
              border,
              borderRadius: 16,
              padding: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldAlert size={16} color="#d97706" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }}>
                Nhật Ký Bảo Mật Đăng Nhập (`hub_iam.hub_auth_audit_logs`)
              </h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {displayedAuditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: subtleBg,
                    border,
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: log.outcome === 'DENIED' ? '#dc2626' : '#059669',
                        marginRight: 8
                      }}
                    >
                      [{log.eventType}]
                    </span>
                    <span style={{ fontWeight: 700, color: textPrimary }}>@{log.username}</span>
                    <span style={{ color: textMuted, marginLeft: 8 }}>{log.detail}</span>
                  </div>
                  <span style={{ fontSize: 11, color: textMuted }}>
                    {log.createdAt?.slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

