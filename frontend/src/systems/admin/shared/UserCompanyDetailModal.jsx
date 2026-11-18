import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
  Unlock,
  User,
  X
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

export default function UserCompanyDetailModal({
  account,
  isAdmin,
  onClose,
  onSavedNotice
}) {
  const { isDark } = useTheme();
  const {
    companies = [],
    adminUpdateAccount,
    adminUnlockAccount,
    adminResetUserPassword
  } = useAuth();

  const [tab, setTab] = useState('PROFILE'); // 'PROFILE' | 'COMPANY' | 'SECURITY'
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    nationalId: '',
    workAddress: '',
    notes: '',
    companyId: '',
    companyCode: '',
    companyName: '',
    customerId: '',
    taxCode: '',
    kycStatus: 'VERIFIED',
    assignedHubCode: '',
    assignedShipperCode: '',
    status: 'ACTIVE'
  });
  const [newPassword, setNewPassword] = useState('');
  const [statusFeedback, setStatusFeedback] = useState(null);

  useEffect(() => {
    if (!account) return;
    const matchedComp =
      companies.find(
        (c) =>
          c.id === account.companyId ||
          c.companyCode === account.companyCode ||
          c.companyCode === account.customerId
      ) || null;
    setForm({
      fullName: account.fullName || '',
      email: account.email || '',
      phone: account.phone || account.phoneNumber || '',
      jobTitle: account.jobTitle || '',
      department: account.department || '',
      nationalId: account.nationalId || '',
      workAddress: account.workAddress || matchedComp?.headquartersAddress || '',
      notes: account.notes || '',
      companyId: matchedComp?.id || account.companyId || '',
      companyCode: matchedComp?.companyCode || account.companyCode || '',
      companyName: matchedComp?.companyName || account.companyName || '',
      customerId: account.customerId || matchedComp?.companyCode || '',
      taxCode: matchedComp?.taxCode || account.taxCode || '',
      kycStatus: matchedComp?.kycStatus || account.kycStatus || 'VERIFIED',
      assignedHubCode: account.assignedHubCode || '',
      assignedShipperCode: account.assignedShipperCode || '',
      status: account.status || 'ACTIVE'
    });
    setNewPassword('');
    setStatusFeedback(null);
  }, [account, companies]);

  if (!account) return null;

  const activeCompanies = companies.filter((c) => !c.isDeleted);
  const selectedCompany =
    activeCompanies.find((c) => c.id === form.companyId || c.companyCode === form.companyCode) ||
    null;

  const inputStyle = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: '8px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    fontSize: '0.84rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '4px'
  };

  const handleSelectCompany = (compId) => {
    const comp = activeCompanies.find((c) => c.id === compId);
    if (!comp) {
      setForm((prev) => ({ ...prev, companyId: '' }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      companyId: comp.id,
      companyCode: comp.companyCode,
      companyName: comp.companyName,
      customerId: comp.companyCode,
      taxCode: comp.taxCode || '',
      kycStatus: comp.kycStatus || 'VERIFIED',
      workAddress: prev.workAddress || comp.headquartersAddress || ''
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
    await adminUpdateAccount(account.username, {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      jobTitle: form.jobTitle,
      department: form.department,
      nationalId: form.nationalId,
      workAddress: form.workAddress,
      notes: form.notes,
      companyId: form.companyId || undefined,
      companyCode: form.companyCode,
      companyName: form.companyName,
      customerId: form.customerId,
      taxCode: form.taxCode,
      kycStatus: form.kycStatus,
      assignedHubCode: form.assignedHubCode || null,
      assignedShipperCode: form.assignedShipperCode || null,
      status: form.status
    });
    const msg = `Đã lưu hồ sơ chi tiết & thông tin công ty cho tài khoản "@${account.username}".`;
    setStatusFeedback({ ok: true, message: msg });
    if (onSavedNotice) onSavedNotice(msg);
    } catch (err) { setStatusFeedback({ ok: false, message: err.message }); }
  };

  const handleUnlock = async () => {
    if (!isAdmin) return;
    try {
      await adminUnlockAccount(account.username);
      setForm((prev) => ({ ...prev, status: 'ACTIVE' }));
      setStatusFeedback({
        ok: true,
        message: `Đã mở khóa bảo mật & reset số lần đăng nhập sai cho "@${account.username}".`
      });
    } catch (err) {
      setStatusFeedback({ ok: false, message: err.message });
    }
  };

  const handleResetPassword = async () => {
    if (!isAdmin) return;
    try {
      await adminResetUserPassword(account.username, newPassword);
      setNewPassword('');
      setStatusFeedback({
        ok: true,
        message: `Đã đặt lại mật khẩu mới thành công cho "@${account.username}".`
      });
    } catch (err) {
      setStatusFeedback({ ok: false, message: err.message });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          background: isDark ? '#0f172a' : '#ffffff',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.38)',
          padding: '24px',
          color: 'var(--text-main)'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <code style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                @{account.username}
              </code>
              <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                {account.role}
              </span>
              <span
                className={`badge ${form.kycStatus === 'VERIFIED' ? 'badge-green' : 'badge-amber'}`}
                style={{ fontSize: '0.7rem' }}
              >
                KYC: {form.kycStatus}
              </span>
            </div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '6px 0 2px' }}>
              Hồ Sơ Chi Tiết Người Dùng &amp; Công Ty Trực Thuộc
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Quản trị thông tin nhân thân, liên hệ, đơn vị pháp lý (MST / Net-30) và trạng thái
              bảo mật tài khoản
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ chi tiết"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { id: 'PROFILE', label: 'Thông Tin Cá Nhân', icon: User },
            { id: 'COMPANY', label: 'Công Ty & Pháp Lý B2B', icon: Building2 },
            { id: 'SECURITY', label: 'Bảo Mật & Tài Khoản', icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 13px',
                  borderRadius: '8px',
                  border: `1px solid ${active ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  background: active ? 'var(--accent-green-dim)' : 'var(--bg-card)',
                  color: active ? 'var(--accent-green-light)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        {statusFeedback && (
          <div
            style={{
              marginBottom: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: statusFeedback.ok ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
              border: `1px solid ${statusFeedback.ok ? '#10b981' : '#ef4444'}`,
              color: statusFeedback.ok ? 'var(--accent-green)' : '#ef4444',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            {statusFeedback.message}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'PROFILE' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Họ và Tên đầy đủ *</label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email công vụ / liên hệ *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="VD: 0903 812 456"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Chức vụ (Job Title)</label>
                  <input
                    type="text"
                    placeholder="VD: Trưởng phòng Logistics"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phòng ban / Đơn vị</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Số CCCD / Mã Nhân Sự</label>
                  <input
                    type="text"
                    placeholder="VD: NV-2026-008 hoặc CCCD"
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Địa chỉ công tác / Kho bãi làm việc</label>
                <input
                  type="text"
                  placeholder="Địa chỉ văn phòng, cảng hoặc kho vận phụ trách"
                  value={form.workAddress}
                  onChange={(e) => setForm({ ...form, workAddress: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ghi chú quản trị IAM</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú xác minh, hợp đồng hoặc phân quyền bổ sung..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {tab === 'COMPANY' && (
            <>
              <div>
                <label htmlFor="user-company-select" style={labelStyle}>
                  Gắn với Hồ sơ Công ty / Doanh nghiệp (Danh mục chuẩn)
                </label>
                <select
                  id="user-company-select"
                  value={form.companyId}
                  onChange={(e) => handleSelectCompany(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Nhập thủ công hoặc chọn từ danh mục doanh nghiệp --</option>
                  {activeCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyCode} — {c.companyName} (MST: {c.taxCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tên Pháp Lý Công Ty</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mã Khách Hàng / Phân Vùng (Customer ID)</label>
                  <input
                    type="text"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mã Số Thuế Doanh Nghiệp (MST)</label>
                  <input
                    type="text"
                    placeholder="VD: 0300588569"
                    value={form.taxCode}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Trạng Thái Thẩm Định KYC</label>
                  <select
                    value={form.kycStatus}
                    onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="VERIFIED">VERIFIED — Đã xác minh pháp lý &amp; MST</option>
                    <option value="PENDING">PENDING — Chờ kiểm tra hồ sơ</option>
                    <option value="REJECTED">REJECTED — Từ chối cấp tín dụng B2B</option>
                  </select>
                </div>
              </div>

              {selectedCompany && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '0.8rem',
                    lineHeight: 1.6
                  }}
                >
                  <strong style={{ color: 'var(--accent-green)', display: 'block', marginBottom: 4 }}>
                    Thông số Hợp đồng &amp; Pháp lý từ Công ty {selectedCompany.companyCode}:
                  </strong>
                  • Người đại diện: <strong>{selectedCompany.representativeName || 'Chưa cập nhật'}</strong>{' '}
                  ({selectedCompany.representativeTitle || 'Đại diện pháp luật'})
                  <br />• Hạng tín dụng: <strong>{selectedCompany.creditTier}</strong> • Hạn mức công
                  nợ Net-30:{' '}
                  <strong>
                    {Number(selectedCompany.creditLimitVnd || 0).toLocaleString('vi-VN')} ₫
                  </strong>
                  <br />• Trụ sở xuất hóa đơn VAT:{' '}
                  <strong>{selectedCompany.headquartersAddress || 'Chưa cập nhật'}</strong>
                </div>
              )}
            </>
          )}

          {tab === 'SECURITY' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Mã Trụ Sở / Hub Phân Công (Cô lập dữ liệu)</label>
                  <input
                    type="text"
                    placeholder="VD: HUB-DINHBANG-BN"
                    value={form.assignedHubCode}
                    onChange={(e) => setForm({ ...form, assignedHubCode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mã Shipper (nếu là HUB_SHIPPER)</label>
                  <input
                    type="text"
                    placeholder="VD: SHP-BN-001"
                    value={form.assignedShipperCode}
                    onChange={(e) => setForm({ ...form, assignedShipperCode: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Trạng Thái Tài Khoản</label>
                  <select
                    disabled={account.username === 'admin'}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
                    <option value="LOCKED">LOCKED — Tạm khóa đăng nhập</option>
                  </select>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>Lần sai mật khẩu gần đây</div>
                  <strong style={{ color: (account.failedLoginAttempts || 0) >= 3 ? '#ef4444' : 'var(--text-main)' }}>
                    {account.failedLoginAttempts || 0} / 5 lần thử
                  </strong>
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={handleUnlock}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #10b981',
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: 'var(--accent-green)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      {form.status === 'LOCKED' ? <Unlock size={12} /> : <Lock size={12} />}
                      Mở khóa &amp; Reset bộ đếm Brute-Force
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  background: 'rgba(245, 158, 11, 0.08)'
                }}
              >
                <label style={labelStyle}>
                  <KeyRound size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Admin Đặt Lại Mật Khẩu Mới cho @{account.username}
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Nhập mật khẩu mới (>= 3 ký tự)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 220px' }}
                  />
                  <button
                    type="button"
                    disabled={!isAdmin || !newPassword.trim()}
                    onClick={handleResetPassword}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px' }}
                  >
                    Cập Nhật Mật Khẩu
                  </button>
                </div>
              </div>
            </>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Đóng
            </button>
            <button type="submit" disabled={!isAdmin} className="btn btn-primary">
              <CheckCircle2 size={16} />
              Lưu Thay Đổi Hồ Sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
