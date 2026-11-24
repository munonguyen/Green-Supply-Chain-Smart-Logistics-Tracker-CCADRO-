import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCheck,
  XCircle
} from 'lucide-react';
import {
  SearchToolbar,
  KpiStatCard,
  ModalDialog,
  StatusBadge,
  StatusBanner,
  sharedInputStyle,
  sharedLabelStyle
} from '../../../../shared/components/ui/SharedPrimitives';
import { elasticSearchMatch } from '../../../../utils/elasticSearch';
import { formatVnd } from '../../../../utils/formatters';
import { api } from '../../../../services/api';
import {
  APPLICATION_STATUS_META,
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  PUBLIC_CAREER_ROLE_CODES,
  STAFF_ROLE_LABELS,
  advanceLocalApplicationStage,
  approveLocalApplication,
  getLocalApplications,
  getLocalBranches,
  getLocalStaff,
  rejectLocalApplication,
  validateComplianceForApproval
} from '../../../../utils/adminOrgSync';

const STATUS_FILTER_OPTIONS = [
  { code: 'ALL', label: 'Tất cả hồ sơ' },
  { code: 'SUBMITTED', label: 'Mới nộp' },
  { code: 'SCREENING', label: 'Đang sơ loại' },
  { code: 'INTERVIEW_OR_DRIVE_TEST', label: 'PV / Lái thử' },
  { code: 'COMPLIANCE_CHECKING', label: 'Chờ thẩm định' },
  { code: 'APPROVED_ONBOARDED', label: 'Đã tiếp nhận' },
  { code: 'REJECTED', label: 'Từ chối' }
];

function suggestUsername(app) {
  const emailPrefix = String(app?.email || '')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
  return emailPrefix || `nv_${String(app?.applicationCode || 'ccadro').toLowerCase()}`;
}

export default function AdminApplicationsTab({ isAdmin = true, actorUsername = 'admin', onOnboardedSuccess }) {
  const [applications, setApplications] = useState(() => getLocalApplications());
  const [branches, setBranches] = useState(() => getLocalBranches(false));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const [stageModalApp, setStageModalApp] = useState(null);
  const [stageForm, setStageForm] = useState({});

  const [approveModalApp, setApproveModalApp] = useState(null);
  const [approveForm, setApproveForm] = useState({});

  const [rejectModalApp, setRejectModalApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, brRes] = await Promise.all([
        api.getApplications().catch(() => null),
        api.getBranches(false).catch(() => null)
      ]);
      const appRows = Array.isArray(appRes?.result) ? appRes.result : Array.isArray(appRes) ? appRes : null;
      if (appRows && appRows.length > 0) {
        setApplications(appRows);
      } else {
        setApplications(getLocalApplications());
      }
      const brRows = Array.isArray(brRes?.result) ? brRes.result : Array.isArray(brRes) ? brRes : null;
      if (brRows && brRows.length > 0) {
        setBranches(brRows);
      } else {
        setBranches(getLocalBranches(false));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const kpis = useMemo(() => {
    const total = applications.length;
    const newOrScreening = applications.filter(
      (a) => a.applicationStatus === 'SUBMITTED' || a.applicationStatus === 'SCREENING'
    ).length;
    const testingOrCompliance = applications.filter(
      (a) => a.applicationStatus === 'INTERVIEW_OR_DRIVE_TEST' || a.applicationStatus === 'COMPLIANCE_CHECKING'
    ).length;
    const onboarded = applications.filter((a) => a.applicationStatus === 'APPROVED_ONBOARDED').length;
    return { total, newOrScreening, testingOrCompliance, onboarded };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const byFilters = applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.applicationStatus !== statusFilter) return false;
      if (roleFilter !== 'ALL' && app.roleCode !== roleFilter) return false;
      return true;
    });
    return (
      elasticSearchMatch(byFilters, searchQuery, [
        'applicationCode',
        'fullName',
        'email',
        'phone',
        'nationalId',
        'roleCode',
        'preferredBranchCode',
        'preferredBranchName',
        'licenseNumber',
        'certificationCode',
        'createdUsername'
      ])?.items || []
    );
  }, [applications, statusFilter, roleFilter, searchQuery]);

  const openStageModal = (app) => {
    setStageModalApp(app);
    setStageForm({
      applicationStatus:
        app.applicationStatus === 'SUBMITTED'
          ? 'SCREENING'
          : app.applicationStatus === 'SCREENING'
            ? 'INTERVIEW_OR_DRIVE_TEST'
            : app.applicationStatus === 'INTERVIEW_OR_DRIVE_TEST'
              ? 'COMPLIANCE_CHECKING'
              : app.applicationStatus,
      screeningNotes: app.screeningNotes || '',
      interviewScheduledAt: app.interviewScheduledAt ? String(app.interviewScheduledAt).slice(0, 16) : '',
      interviewScore: app.interviewScore ?? 85,
      driveTestPassed: Boolean(app.driveTestPassed),
      healthCheckDeclared: Boolean(app.healthCheckDeclared),
      safetyTrainingDeclared: Boolean(app.safetyTrainingDeclared)
    });
  };

  const handleSaveStage = async (e) => {
    e.preventDefault();
    if (!stageModalApp) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      applicationStatus: stageForm.applicationStatus,
      screeningNotes: stageForm.screeningNotes,
      interviewScheduledAt: stageForm.interviewScheduledAt
        ? new Date(stageForm.interviewScheduledAt).toISOString()
        : null,
      interviewScore: stageForm.interviewScore === '' ? null : Number(stageForm.interviewScore),
      driveTestPassed: Boolean(stageForm.driveTestPassed),
      healthCheckDeclared: Boolean(stageForm.healthCheckDeclared),
      safetyTrainingDeclared: Boolean(stageForm.safetyTrainingDeclared)
    };
    try {
      const res = await api.advanceApplicationStage(stageModalApp.id, payload);
      const updated = res?.result || res;
      setApplications((prev) => prev.map((a) => (a.id === stageModalApp.id ? updated : a)));
      setStageModalApp(null);
      setBanner({ ok: true, message: `Đã cập nhật vòng duyệt hồ sơ ${stageModalApp.applicationCode}.` });
    } catch (err) {
      if (err?.status >= 400 && err?.status < 500) {
        setBanner({ ok: false, message: err.message });
      } else {
        try {
          const updated = advanceLocalApplicationStage(stageModalApp.id, payload, actorUsername);
          setApplications((prev) => prev.map((a) => (a.id === stageModalApp.id ? updated : a)));
          setStageModalApp(null);
          setBanner({ ok: true, message: `Đã cập nhật vòng duyệt hồ sơ ${stageModalApp.applicationCode} (Sandbox).` });
        } catch (localErr) {
          setBanner({ ok: false, message: localErr.message });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openApproveModal = (app) => {
    setApproveModalApp(app);
    setApproveForm({
      username: suggestUsername(app),
      temporaryPassword: 'Ccadro@2026',
      department: DRIVER_ROLE_CODES.includes(app.roleCode) ? 'Đội Xe Vận Tải Xanh' : 'Phòng Nghiệp Vụ CCADRO',
      jobTitle: STAFF_ROLE_LABELS[app.roleCode] || app.roleCode,
      branchId: app.preferredBranchId || '',
      branchCode: app.preferredBranchCode || '',
      assignedHubCode: app.roleCode?.startsWith('HUB_') ? app.preferredBranchCode || 'HUB-CATLAI' : '',
      assignedShipperCode: '',
      assignedVehiclePlate: '',
      approvedSalaryVnd: app.expectedSalaryVnd || 20000000,
      contractType: 'PROBATION_60D',
      shiftName: 'CA_HANH_CHINH',
      approveComplianceNow: true,
      backgroundCheckPassed: true,
      healthCheckPassed: Boolean(app.healthCheckDeclared ?? true),
      healthCheckDate: new Date().toISOString().slice(0, 10),
      safetyTrainingCertified: Boolean(app.safetyTrainingDeclared ?? false),
      canSignOffCompliance: CONTROLLER_ROLE_CODES.includes(app.roleCode),
      approvalNotes: `Xác nhận tiếp nhận & cấp tài khoản từ đơn ${app.applicationCode}.`
    });
  };

  const complianceMissingPreview = useMemo(() => {
    if (!approveModalApp) return [];
    return validateComplianceForApproval({
      ...approveModalApp,
      ...approveForm
    });
  }, [approveModalApp, approveForm]);

  const handleConfirmOnboarding = async (e) => {
    e.preventDefault();
    if (!approveModalApp) return;
    setSaving(true);
    setBanner(null);
    const payload = {
      ...approveForm,
      approvedSalaryVnd: Number(approveForm.approvedSalaryVnd || 0),
      branchId: approveForm.branchId || null
    };
    try {
      const res = await api.approveAndOnboardApplication(approveModalApp.id, payload);
      const data = res?.result || res;
      if (data?.application) {
        setApplications((prev) => prev.map((a) => (a.id === approveModalApp.id ? data.application : a)));
      } else {
        await loadApplications();
      }
      if (onOnboardedSuccess) {
        onOnboardedSuccess(data);
      }
      setApproveModalApp(null);
      setBanner({
        ok: true,
        receipt: data,
        message: `Đã tiếp nhận ${data?.createdStaff?.fullName || approveModalApp.fullName} (${data?.generatedEmployeeCode}) · Tài khoản @${data?.onboardedUsername} (Yêu cầu đổi mật khẩu lần đầu).`
      });
    } catch (err) {
      if (err?.status >= 400 && err?.status < 500) {
        setBanner({ ok: false, message: err.message });
      } else {
        try {
          const data = approveLocalApplication(approveModalApp.id, payload, actorUsername);
          setApplications(getLocalApplications());
          if (onOnboardedSuccess) {
            onOnboardedSuccess(data, getLocalStaff(false));
          }
          setApproveModalApp(null);
          setBanner({
            ok: true,
            receipt: data,
            message: `Đã tiếp nhận ${data.createdStaff.fullName} (${data.generatedEmployeeCode}) · Tài khoản @${data.onboardedUsername} (Yêu cầu đổi mật khẩu lần đầu).`
          });
        } catch (localErr) {
          setBanner({ ok: false, message: localErr.message });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModalApp) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await api.rejectApplication(rejectModalApp.id, rejectReason);
      const updated = res?.result || res;
      setApplications((prev) => prev.map((a) => (a.id === rejectModalApp.id ? updated : a)));
      setRejectModalApp(null);
      setRejectReason('');
      setBanner({ ok: true, message: `Đã từ chối hồ sơ ${rejectModalApp.applicationCode}.` });
    } catch (err) {
      if (err?.status >= 400 && err?.status < 500) {
        setBanner({ ok: false, message: err.message });
      } else {
        const updated = rejectLocalApplication(rejectModalApp.id, rejectReason, actorUsername);
        setApplications((prev) => prev.map((a) => (a.id === rejectModalApp.id ? updated : a)));
        setRejectModalApp(null);
        setRejectReason('');
        setBanner({ ok: true, message: `Đã từ chối hồ sơ ${rejectModalApp.applicationCode}.` });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Briefcase size={18} color="#10b981" /> Tiếp Nhận Đơn Xin Việc &amp; Xác Nhận Onboarding (Lái Xe / Kiểm Soát / Hub)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Quy trình Zero-Trust: Sơ loại -&gt; Phỏng vấn / Lái thử -&gt; Kiểm duyệt Compliance -&gt; Tự động tạo Hồ sơ Nhân viên &amp; Tài khoản IAM đổi mật khẩu lần đầu.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadApplications} disabled={loading}>
          <RefreshCw size={15} /> {loading ? 'Đang tải...' : 'Làm mới danh sách'}
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <KpiStatCard label="Tổng Đơn Ứng Tuyển" value={kpis.total} />
        <KpiStatCard label="Mới Nộp / Đang Sơ Loại" value={kpis.newOrScreening} color="#38bdf8" />
        <KpiStatCard label="Chờ Lái Thử / Compliance" value={kpis.testingOrCompliance} color="#f59e0b" />
        <KpiStatCard label="Đã Tiếp Nhận (Onboarded)" value={kpis.onboarded} color="#10b981" />
      </div>

      <StatusBanner status={banner} onDismiss={() => setBanner(null)}>
        {banner?.receipt && (
          <div style={{ marginTop: 6, fontSize: '0.8rem', opacity: 0.92 }}>
            <KeyRound size={14} style={{ verticalAlign: 'middle' }} /> Đồng bộ Fleet Asset:{' '}
            <strong>{banner.receipt.assetDriverSyncStatus}</strong> · Bắt buộc đổi mật khẩu lần đầu:{' '}
            <strong>{banner.receipt.mustChangePassword ? 'BẬT' : 'TẮT'}</strong>
          </div>
        )}
      </StatusBanner>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setStatusFilter(opt.code)}
              className={`btn ${statusFilter === opt.code ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 11px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Lọc theo vai trò ứng tuyển"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...sharedInputStyle, width: 'auto' }}
          >
            <option value="ALL">Tất cả vai trò tuyển dụng</option>
            {PUBLIC_CAREER_ROLE_CODES.map((rc) => (
              <option key={rc} value={rc}>
                {STAFF_ROLE_LABELS[rc] || rc}
              </option>
            ))}
          </select>
          <div style={{ minWidth: 0, flex: '1 1 250px', maxWidth: '100%' }}>
            <SearchToolbar
              value={searchQuery}
              onChange={setSearchQuery}
              label="Tìm hồ sơ ứng tuyển"
              loading={loading}
              placeholder="Mã hồ sơ, họ tên, CCCD hoặc GPLX…"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Mã Đơn &amp; Ứng Viên</th>
              <th>Vị Trí &amp; Chi Nhánh</th>
              <th>Chứng Từ / GPLX / Chứng Chỉ</th>
              <th>Phỏng Vấn &amp; Lái Thử</th>
              <th>Trạng Thái</th>
              <th style={{ textAlign: 'right' }}>Thao Tác Nghiệp Vụ</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.map((app) => {
              const meta = APPLICATION_STATUS_META[app.applicationStatus] || {};
              const isClosed = app.applicationStatus === 'APPROVED_ONBOARDED' || app.applicationStatus === 'REJECTED';
              const isDriver = DRIVER_ROLE_CODES.includes(app.roleCode);
              return (
                <tr key={app.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{app.applicationCode}</div>
                    <div style={{ fontWeight: 600 }}>{app.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {app.phone} · {app.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      {STAFF_ROLE_LABELS[app.roleCode] || app.roleCode}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {app.preferredBranchName || app.preferredBranchCode || 'Chưa chọn chi nhánh'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      KN: {app.experienceYears ?? 0} năm · Kỳ vọng: {formatVnd(app.expectedSalaryVnd)}
                    </div>
                  </td>
                  <td>
                    {isDriver ? (
                      <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                        <div>
                          <Truck size={13} style={{ verticalAlign: 'middle' }} /> GPLX:{' '}
                          <strong>{app.licenseNumber || 'Thiếu'}</strong> (Hạng {app.licenseClass || '—'})
                        </div>
                        <div>Hạn: {app.licenseExpiryDate || '—'}</div>
                        <div>
                          SK: {app.healthCheckDeclared ? '✓ Đạt' : 'Chưa'} · An toàn EV:{' '}
                          {app.safetyTrainingDeclared ? '✓ Đạt' : 'Chưa'}
                        </div>
                      </div>
                    ) : CONTROLLER_ROLE_CODES.includes(app.roleCode) ? (
                      <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                        <div>
                          <ShieldCheck size={13} style={{ verticalAlign: 'middle' }} /> CC:{' '}
                          <strong>{app.certificationCode || 'Thiếu'}</strong>
                        </div>
                        <div>Hạn: {app.certificateExpiryDate || '—'}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{app.inspectionScope || '—'}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        CCCD: {app.nationalId || '—'}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                      <div>Điểm PV: {app.interviewScore != null ? `${app.interviewScore}/100` : 'Chưa chấm'}</div>
                      {isDriver && (
                        <div style={{ color: app.driveTestPassed ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          {app.driveTestPassed ? '✓ Đạt kiểm tra lái thử' : 'Chưa đạt / chưa lái thử'}
                        </div>
                      )}
                      {app.createdUsername && (
                        <div style={{ color: '#10b981', fontWeight: 700 }}>
                          TK cấp: @{app.createdUsername}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      badgeClass={meta.badgeClass || 'badge-blue'}
                      label={meta.label || app.applicationStatus}
                    />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!isClosed ? (
                      <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                          onClick={() => openStageModal(app)}
                        >
                          <ClipboardCheck size={13} /> Đánh Giá Vòng
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            onClick={() => openApproveModal(app)}
                          >
                            <UserCheck size={13} /> Xác Nhận Tiếp Nhận
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                          onClick={() => {
                            setRejectModalApp(app);
                            setRejectReason('');
                          }}
                        >
                          <XCircle size={13} /> Từ Chối
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã đóng hồ sơ</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredApplications.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  Không có hồ sơ ứng tuyển nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Chuyển Vòng / Phỏng vấn / Lái thử */}
      <ModalDialog
        isOpen={Boolean(stageModalApp)}
        onClose={() => setStageModalApp(null)}
        title={stageModalApp ? `Đánh Giá Vòng Tuyển Dụng: ${stageModalApp.applicationCode} — ${stageModalApp.fullName}` : ''}
      >
        {stageModalApp && (
          <form onSubmit={handleSaveStage}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={sharedLabelStyle}>
                Chuyển trạng thái hồ sơ
                <select
                  value={stageForm.applicationStatus}
                  onChange={(e) => setStageForm({ ...stageForm, applicationStatus: e.target.value })}
                  style={sharedInputStyle}
                >
                  <option value="SCREENING">Đang sơ loại HR (SCREENING)</option>
                  <option value="INTERVIEW_OR_DRIVE_TEST">Phỏng vấn / Lái thử (INTERVIEW_OR_DRIVE_TEST)</option>
                  <option value="COMPLIANCE_CHECKING">Chờ thẩm định Compliance (COMPLIANCE_CHECKING)</option>
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={sharedLabelStyle}>
                  Điểm phỏng vấn / thực hành (0–100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={stageForm.interviewScore}
                    onChange={(e) => setStageForm({ ...stageForm, interviewScore: e.target.value })}
                    style={sharedInputStyle}
                  />
                </label>
                <label style={sharedLabelStyle}>
                  Lịch phỏng vấn / lái thử
                  <input
                    type="datetime-local"
                    value={stageForm.interviewScheduledAt}
                    onChange={(e) => setStageForm({ ...stageForm, interviewScheduledAt: e.target.value })}
                    style={sharedInputStyle}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(stageForm.driveTestPassed)}
                    onChange={(e) => setStageForm({ ...stageForm, driveTestPassed: e.target.checked })}
                  />
                  Đạt kiểm tra tay lái thực hành (Drive Test Passed)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(stageForm.healthCheckDeclared)}
                    onChange={(e) => setStageForm({ ...stageForm, healthCheckDeclared: e.target.checked })}
                  />
                  Đã nộp giấy khám sức khỏe
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(stageForm.safetyTrainingDeclared)}
                    onChange={(e) => setStageForm({ ...stageForm, safetyTrainingDeclared: e.target.checked })}
                  />
                  Hoàn tất tập huấn An toàn EV / PCCC
                </label>
              </div>
              <label style={sharedLabelStyle}>
                Nhận xét của HR / Hội đồng An toàn
                <textarea
                  rows={3}
                  value={stageForm.screeningNotes}
                  onChange={(e) => setStageForm({ ...stageForm, screeningNotes: e.target.value })}
                  style={sharedInputStyle}
                />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStageModalApp(null)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu Đánh Giá'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Xác Nhận Tiếp Nhận & Cấp Tài Khoản Onboarding */}
      <ModalDialog
        isOpen={Boolean(approveModalApp)}
        onClose={() => setApproveModalApp(null)}
        title={approveModalApp ? `Xác Nhận Tiếp Nhận & Cấp Tài Khoản: ${approveModalApp.fullName}` : ''}
        subtitle={approveModalApp ? `Đơn ${approveModalApp.applicationCode} · Vai trò: ${approveModalApp.roleCode}` : ''}
        maxWidth={640}
      >
        {approveModalApp && (
          <form onSubmit={handleConfirmOnboarding}>
            {approveForm.approveComplianceNow && complianceMissingPreview.length > 0 && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.14)',
                  border: '1px solid #f59e0b',
                  color: '#f59e0b',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: 12
                }}
              >
                Thiếu điều kiện Compliance để duyệt ngay: {complianceMissingPreview.join(', ')}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={sharedLabelStyle}>
                Username cấp phát *
                <input
                  required
                  value={approveForm.username}
                  onChange={(e) => setApproveForm({ ...approveForm, username: e.target.value })}
                  style={sharedInputStyle}
                />
              </label>
              <label style={sharedLabelStyle}>
                Mật khẩu tạm (đổi lần đầu) *
                <input
                  required
                  value={approveForm.temporaryPassword}
                  onChange={(e) => setApproveForm({ ...approveForm, temporaryPassword: e.target.value })}
                  style={sharedInputStyle}
                />
              </label>
              <label style={sharedLabelStyle}>
                Chi nhánh điều chuyển
                <select
                  value={approveForm.branchCode}
                  onChange={(e) => {
                    const b = branches.find((x) => x.branchCode === e.target.value);
                    setApproveForm({ ...approveForm, branchCode: e.target.value, branchId: b?.id || '' });
                  }}
                  style={sharedInputStyle}
                >
                  {branches.map((b) => (
                    <option key={b.branchCode} value={b.branchCode}>
                      {b.branchName} ({b.branchCode})
                    </option>
                  ))}
                </select>
              </label>
              <label style={sharedLabelStyle}>
                Mức lương phê duyệt (VNĐ)
                <input
                  type="number"
                  min="0"
                  step="500000"
                  value={approveForm.approvedSalaryVnd}
                  onChange={(e) => setApproveForm({ ...approveForm, approvedSalaryVnd: e.target.value })}
                  style={sharedInputStyle}
                />
              </label>
              <label style={sharedLabelStyle}>
                Chức danh chính thức
                <input
                  value={approveForm.jobTitle}
                  onChange={(e) => setApproveForm({ ...approveForm, jobTitle: e.target.value })}
                  style={sharedInputStyle}
                />
              </label>
              <label style={sharedLabelStyle}>
                Loại hợp đồng
                <select
                  value={approveForm.contractType}
                  onChange={(e) => setApproveForm({ ...approveForm, contractType: e.target.value })}
                  style={sharedInputStyle}
                >
                  <option value="PROBATION_60D">Thử việc 60 ngày</option>
                  <option value="FULL_TIME">Chính thức Toàn thời gian</option>
                  <option value="CONTRACT">Hợp đồng chuyên gia</option>
                </select>
              </label>
              {DRIVER_ROLE_CODES.includes(approveModalApp.roleCode) && (
                <label style={sharedLabelStyle}>
                  Biển số xe bàn giao (nếu có)
                  <input
                    value={approveForm.assignedVehiclePlate}
                    onChange={(e) => setApproveForm({ ...approveForm, assignedVehiclePlate: e.target.value })}
                    placeholder="51C-888.01"
                    style={sharedInputStyle}
                  />
                </label>
              )}
              {approveModalApp.roleCode?.startsWith('HUB_') && (
                <label style={sharedLabelStyle}>
                  Mã Hub cô lập (assignedHubCode)
                  <input
                    value={approveForm.assignedHubCode}
                    onChange={(e) => setApproveForm({ ...approveForm, assignedHubCode: e.target.value })}
                    style={sharedInputStyle}
                  />
                </label>
              )}
            </div>

            <div style={{ display: 'grid', gap: 6, marginTop: 12, fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={Boolean(approveForm.backgroundCheckPassed)}
                  onChange={(e) => setApproveForm({ ...approveForm, backgroundCheckPassed: e.target.checked })}
                />
                Xác nhận lý lịch / CCCD hợp lệ
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={Boolean(approveForm.healthCheckPassed)}
                  onChange={(e) => setApproveForm({ ...approveForm, healthCheckPassed: e.target.checked })}
                />
                Xác nhận giấy khám sức khỏe đạt chuẩn
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={Boolean(approveForm.safetyTrainingCertified)}
                  onChange={(e) => setApproveForm({ ...approveForm, safetyTrainingCertified: e.target.checked })}
                />
                Xác nhận đã cấp chứng chỉ tập huấn an toàn EV/PCCC
              </label>
              {CONTROLLER_ROLE_CODES.includes(approveModalApp.roleCode) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(approveForm.canSignOffCompliance)}
                    onChange={(e) => setApproveForm({ ...approveForm, canSignOffCompliance: e.target.checked })}
                  />
                  Cấp quyền ký duyệt chứng từ nghiệp vụ
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#10b981' }}>
                <input
                  type="checkbox"
                  checked={Boolean(approveForm.approveComplianceNow)}
                  onChange={(e) => setApproveForm({ ...approveForm, approveComplianceNow: e.target.checked })}
                />
                Phê duyệt Compliance đạt chuẩn (APPROVED) ngay khi tiếp nhận
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setApproveModalApp(null)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <CheckCircle2 size={15} /> {saving ? 'Đang cấp tài khoản...' : 'Xác Nhận Tiếp Nhận & Cấp TK'}
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Modal Từ Chối */}
      <ModalDialog
        isOpen={Boolean(rejectModalApp)}
        onClose={() => setRejectModalApp(null)}
        title={rejectModalApp ? `Từ Chối Hồ Sơ: ${rejectModalApp.applicationCode} — ${rejectModalApp.fullName}` : ''}
      >
        {rejectModalApp && (
          <form onSubmit={handleConfirmReject}>
            <label style={sharedLabelStyle}>
              Lý do từ chối *
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: GPLX hết hạn / Không đạt bài kiểm tra lái thử an toàn..."
                style={sharedInputStyle}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRejectModalApp(null)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: '#dc2626' }} disabled={saving}>
                Xác Nhận Từ Chối
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}
