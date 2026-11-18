import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Edit3,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import { formatMillionVnd } from '../../../../utils/formatters';
import { ElasticSearchBar } from '../../../../shared/components/SharedPrimitives';

const EMPTY_COMPANY_FORM = {
  id: null,
  companyCode: '',
  companyName: '',
  taxCode: '',
  businessLicenseNumber: '',
  industry: 'Chuỗi cung ứng & Logistics B2B',
  companyType: 'B2B_CUSTOMER',
  companyPhone: '',
  companyEmail: '',
  headquartersAddress: '',
  representativeName: '',
  representativeTitle: 'Giám đốc Điều hành',
  creditTier: 'STANDARD',
  creditLimitVnd: 0,
  kycStatus: 'PENDING'
};

export default function AdminCompaniesTab({ isAdmin }) {
  const {
    companies = [],
    accounts = [],
    adminCreateCompany,
    adminUpdateCompany,
    adminDeleteCompany,
    adminRestoreCompany
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY_FORM);
  const [feedback, setFeedback] = useState(null);
  const [inspectCompanyCode, setInspectCompanyCode] = useState(null);

  const inputStyle = {
    width: '100%',
    padding: '9px 10px',
    borderRadius: '7px',
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

  const deletedCount = useMemo(
    () => companies.filter((c) => Boolean(c.isDeleted)).length,
    [companies]
  );

  const visibleCompanies = useMemo(
    () => companies.filter((c) => (showDeleted ? Boolean(c.isDeleted) : !c.isDeleted)),
    [companies, showDeleted]
  );

  const elasticCompanies = useMemo(
    () =>
      elasticSearchMatch(visibleCompanies, searchQuery, [
        'companyCode',
        'companyName',
        'taxCode',
        'industry',
        'representativeName',
        'companyEmail',
        'creditTier',
        'kycStatus'
      ]),
    [visibleCompanies, searchQuery]
  );

  const activeCompanies = useMemo(() => companies.filter((c) => !c.isDeleted), [companies]);
  const verifiedCount = activeCompanies.filter((c) => c.kycStatus === 'VERIFIED').length;
  const totalCreditVnd = activeCompanies.reduce(
    (sum, c) => sum + Number(c.creditLimitVnd || 0),
    0
  );

  const usersForCompany = (comp) =>
    accounts.filter(
      (u) =>
        !u.isDeleted &&
        (u.companyId === comp.id ||
          u.companyCode === comp.companyCode ||
          u.customerId === comp.companyCode)
    );

  const handleEditClick = (comp) => {
    setCompanyForm({
      id: comp.id,
      companyCode: comp.companyCode || '',
      companyName: comp.companyName || '',
      taxCode: comp.taxCode || '',
      businessLicenseNumber: comp.businessLicenseNumber || '',
      industry: comp.industry || '',
      companyType: comp.companyType || 'B2B_CUSTOMER',
      companyPhone: comp.companyPhone || '',
      companyEmail: comp.companyEmail || '',
      headquartersAddress: comp.headquartersAddress || '',
      representativeName: comp.representativeName || '',
      representativeTitle: comp.representativeTitle || '',
      creditTier: comp.creditTier || 'STANDARD',
      creditLimitVnd: Number(comp.creditLimitVnd || 0),
      kycStatus: comp.kycStatus || 'VERIFIED'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFeedback(null);
    try {
      if (companyForm.id) {
        const updated = await adminUpdateCompany(companyForm.id, companyForm);
        setFeedback({
          ok: true,
          message: `Đã cập nhật hồ sơ công ty "${updated.companyName}" (${updated.companyCode}) & đồng bộ sang các User trực thuộc.`
        });
      } else {
        const created = await adminCreateCompany(companyForm);
        setFeedback({
          ok: true,
          message: `Đã khởi tạo hồ sơ doanh nghiệp "${created.companyName}" (${created.companyCode}).`
        });
      }
      setCompanyForm(EMPTY_COMPANY_FORM);
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    }
  };

  const handleDelete = async (comp) => {
    try {
      await adminDeleteCompany(comp.id || comp.companyCode);
      setFeedback({
        ok: true,
        message: `Đã xóa mềm doanh nghiệp ${comp.companyCode} (có thể khôi phục trong Thùng rác).`
      });
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    }
  };

  const handleRestore = async (comp) => {
    try {
      await adminRestoreCompany(comp.id || comp.companyCode);
      setFeedback({ ok: true, message: `Đã khôi phục doanh nghiệp ${comp.companyCode}.` });
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    }
  };

  const inspectedCompany =
    companies.find((c) => c.companyCode === inspectCompanyCode) || null;
  const inspectedUsers = inspectedCompany ? usersForCompany(inspectedCompany) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-3">
        <div className="card stat-card">
          <div>
            <div className="stat-label">Doanh Nghiệp &amp; Đối Tác Hoạt Động</div>
            <div className="stat-value" style={{ color: 'var(--text-main)' }}>
              {activeCompanies.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Chủ hàng B2B, Kho 3PL &amp; Đơn vị nội bộ
            </span>
          </div>
          <Building2 size={28} color="#0ea5e9" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Đã Xác Minh Pháp Lý KYC</div>
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
              {verifiedCount}/{activeCompanies.length}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>
              Đủ điều kiện ký MSA &amp; xuất hóa đơn VAT
            </span>
          </div>
          <ShieldCheck size={28} color="#10b981" />
        </div>

        <div className="card stat-card">
          <div>
            <div className="stat-label">Tổng Hạn Mức Công Nợ Net-30</div>
            <div className="stat-value" style={{ fontSize: '1.35rem', color: '#f59e0b' }}>
              {formatMillionVnd(totalCreditVnd)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tổng trần tín dụng B2B đang cấp phép
            </span>
          </div>
          <Users size={28} color="#f59e0b" />
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '11px 14px',
            borderRadius: '8px',
            background: feedback.ok ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            border: `1px solid ${feedback.ok ? '#10b981' : '#ef4444'}`,
            color: feedback.ok ? 'var(--accent-green)' : '#ef4444',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          {feedback.message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '22px',
          alignItems: 'start'
        }}
      >
        {/* Left: Companies Directory Table */}
        <div className="card">
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 6 }}>
            Danh Mục Công Ty &amp; Hồ Sơ Pháp Lý B2B ({elasticCompanies.items.length})
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Quản lý mã số thuế, hạn mức tín dụng Net-30, người đại diện và nhân sự thuộc từng doanh
            nghiệp.
          </p>

          <div style={{ marginBottom: 14 }}>
            <ElasticSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm mã công ty, tên công ty, MST, người đại diện..."
              totalCount={visibleCompanies.length}
              matchedCount={elasticCompanies.items.length}
              tookMs={elasticCompanies.tookMs}
              showDeleted={showDeleted}
              onToggleDeleted={() => setShowDeleted((p) => !p)}
              deletedCount={deletedCount}
              rounded={8}
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Công Ty &amp; MST</th>
                  <th>Loại Hình &amp; Đại Diện</th>
                  <th>Tín Dụng Net-30 &amp; KYC</th>
                  <th>User Trực Thuộc</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {elasticCompanies.items.map((comp) => {
                  const linkedCount = usersForCompany(comp).length;
                  return (
                    <tr key={comp.id || comp.companyCode}>
                      <td>
                        <code style={{ color: '#0ea5e9', fontWeight: 800 }}>{comp.companyCode}</code>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{comp.companyName}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          MST: {comp.taxCode || 'Chưa cập nhật'} • {comp.businessLicenseNumber || 'Chưa có ĐKKD'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem', marginBottom: 4 }}>
                          {comp.companyType}
                        </span>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                          {comp.representativeName || 'Chưa gán'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {comp.companyPhone}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${comp.kycStatus === 'VERIFIED' ? 'badge-green' : 'badge-amber'}`}
                          style={{ fontSize: '0.68rem', marginBottom: 4 }}
                        >
                          KYC: {comp.kycStatus}
                        </span>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                          {comp.creditTier}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {Number(comp.creditLimitVnd || 0).toLocaleString('vi-VN')} ₫
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setInspectCompanyCode(
                              inspectCompanyCode === comp.companyCode ? null : comp.companyCode
                            )
                          }
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                        >
                          <Users size={13} /> {linkedCount} user
                        </button>
                      </td>
                      <td>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {comp.isDeleted ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(comp)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              >
                                <RotateCcw size={13} /> Khôi phục
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  title="Chỉnh sửa thông tin công ty"
                                  onClick={() => handleEditClick(comp)}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px' }}
                                >
                                  <Edit3 size={13} />
                                </button>
                                {comp.companyCode !== 'CCADRO_INT' && (
                                  <button
                                    type="button"
                                    title="Xóa mềm công ty"
                                    onClick={() => handleDelete(comp)}
                                    style={{
                                      padding: '5px 8px',
                                      borderRadius: 6,
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      color: '#ef4444',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inspectedCompany && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)'
              }}
            >
              <strong style={{ fontSize: '0.88rem', color: 'var(--accent-blue)' }}>
                Tài khoản thuộc {inspectedCompany.companyName} ({inspectedUsers.length}):
              </strong>
              {inspectedUsers.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Chưa có tài khoản user nào liên kết với công ty này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {inspectedUsers.map((u) => (
                    <span key={u.username} className="badge badge-green" style={{ fontSize: '0.74rem' }}>
                      @{u.username} ({u.role}) — {u.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Create or Edit Company Form */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1.06rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={18} color="#10b981" />
              <span>{companyForm.id ? `Cập Nhật Công Ty (${companyForm.companyCode})` : 'Thêm Mới Doanh Nghiệp / Đối Tác'}</span>
            </h3>
            {companyForm.id && (
              <button
                type="button"
                onClick={() => setCompanyForm(EMPTY_COMPANY_FORM)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                Tạo mới
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Mã Công Ty *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(companyForm.id)}
                  placeholder="VD: MASAN_LOG"
                  value={companyForm.companyCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyCode: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tên Pháp Lý Công Ty *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: CTCP Hàng Tiêu Dùng Masan"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Mã Số Thuế (MST)</label>
                <input
                  type="text"
                  placeholder="0309998888"
                  value={companyForm.taxCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxCode: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Số ĐKKD / GP Vận Tải</label>
                <input
                  type="text"
                  placeholder="GP-B2B-2026-..."
                  value={companyForm.businessLicenseNumber}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, businessLicenseNumber: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Loại Hình Đối Tác</label>
                <select
                  value={companyForm.companyType}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="B2B_CUSTOMER">Khách hàng Chủ hàng B2B</option>
                  <option value="PARTNER_3PL">Đối tác Kho bãi / 3PL</option>
                  <option value="HUB_OPERATOR">Trụ sở Hub Phân phối</option>
                  <option value="INTERNAL_CORP">Đơn vị Nội bộ CCADRO</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ngành Nghề Vận Tải</label>
                <input
                  type="text"
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Người Đại Diện Pháp Luật</label>
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={companyForm.representativeName}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, representativeName: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email &amp; Hotline Công Ty</label>
                <input
                  type="text"
                  placeholder="028... hoặc email@company.vn"
                  value={companyForm.companyEmail}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyEmail: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Địa Chỉ Trụ Sở Xuất Hóa Đơn VAT</label>
              <input
                type="text"
                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố..."
                value={companyForm.headquartersAddress}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, headquartersAddress: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Hạng Tín Dụng</label>
                <select
                  value={companyForm.creditTier}
                  onChange={(e) => setCompanyForm({ ...companyForm, creditTier: e.target.value })}
                  style={inputStyle}
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="GOLD_NET30">GOLD_NET30</option>
                  <option value="ENTERPRISE_MSA">ENTERPRISE_MSA</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Hạn Mức Net-30 (₫)</label>
                <input
                  type="number"
                  min="0"
                  step="10000000"
                  value={companyForm.creditLimitVnd}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, creditLimitVnd: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Trạng Thái KYC</label>
                <select
                  value={companyForm.kycStatus}
                  onChange={(e) => setCompanyForm({ ...companyForm, kycStatus: e.target.value })}
                  style={inputStyle}
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isAdmin}
              className="btn btn-primary"
              style={{ justifyContent: 'center', marginTop: '4px', padding: '11px 16px' }}
            >
              <CheckCircle2 size={16} />
              <span>{companyForm.id ? 'Lưu Cập Nhật Doanh Nghiệp' : 'Tạo Mới Hồ Sơ Công Ty'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

