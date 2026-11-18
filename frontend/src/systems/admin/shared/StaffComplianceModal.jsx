import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Truck,
  X,
  XCircle
} from 'lucide-react';
import {
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  STAFF_ROLE_LABELS,
  validateComplianceForApproval,
  VERIFICATION_STATUS_META
} from '../../../utils/adminOrgSync';

export default function StaffComplianceModal({
  staff,
  canVerify = true,
  onClose,
  onSubmitVerification
}) {
  const [draft, setDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!staff) {
      setDraft(null);
      return;
    }
    setErrorMsg('');
    setDraft({
      verificationStatus: staff.verificationStatus || 'PENDING_REVIEW',
      verificationNotes: staff.verificationNotes || '',
      backgroundCheckPassed: Boolean(staff.backgroundCheckPassed),
      healthCheckPassed: Boolean(staff.healthCheckPassed),
      healthCheckDate: staff.healthCheckDate || '',
      safetyTrainingCertified: Boolean(staff.safetyTrainingCertified),
      canSignOffCompliance: Boolean(staff.canSignOffCompliance),
      licenseNumber: staff.licenseNumber || '',
      licenseClass: staff.licenseClass || 'FC',
      licenseExpiryDate: staff.licenseExpiryDate || '',
      certificationCode: staff.certificationCode || '',
      certificateExpiryDate: staff.certificateExpiryDate || '',
      issuingAuthority: staff.issuingAuthority || '',
      inspectionScope: staff.inspectionScope || ''
    });
  }, [staff]);

  if (!staff || !draft) return null;

  const isDriverRole = DRIVER_ROLE_CODES.includes(staff.roleCode);
  const isControllerRole = CONTROLLER_ROLE_CODES.includes(staff.roleCode);
  const meta = VERIFICATION_STATUS_META[staff.verificationStatus || 'PENDING_REVIEW'] ||
    VERIFICATION_STATUS_META.PENDING_REVIEW;

  const mergedForValidation = {
    ...staff,
    ...draft
  };
  const missingForApproval = validateComplianceForApproval(mergedForValidation);

  const handleActionSubmit = async (nextStatus) => {
    setErrorMsg('');
    const candidate = {
      ...draft,
      verificationStatus: nextStatus
    };
    if (nextStatus === 'APPROVED') {
      const missing = validateComplianceForApproval({ ...staff, ...candidate });
      if (missing.length > 0) {
        setErrorMsg(`Chưa đủ điều kiện phê duyệt nghiệp vụ: ${missing.join(', ')}.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSubmitVerification(staff, candidate);
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể lưu trạng thái kiểm duyệt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Hồ sơ chi tiết & Kiểm duyệt nghiệp vụ ${staff.fullName}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(9, 13, 22, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          marginBottom: 0,
          border: '1px solid rgba(56, 189, 248, 0.45)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '14px',
            marginBottom: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem' }}>
                {staff.employeeCode}
              </code>
              <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                {STAFF_ROLE_LABELS[staff.roleCode] || staff.roleCode}
              </span>
              <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '0.72rem' }}>
                {meta.label}
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px', fontSize: '1.14rem', fontWeight: 800 }}>
              {staff.fullName}
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {staff.jobTitle} • {staff.department} • Chi nhánh:{' '}
              <strong>{staff.branchName || staff.branchCode || 'Chưa gán'}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ kiểm duyệt"
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Thông tin định danh & Dấu vết kiểm duyệt */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-color)',
            fontSize: '0.79rem'
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)' }}>CCCD / Định Danh</div>
            <strong>{staff.nationalId || 'Chưa cập nhật CCCD'}</strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Tài Khoản IAM &amp; Liên Hệ</div>
            <strong>
              {staff.username ? `@${staff.username}` : 'Chưa gán IAM'} • {staff.phone || staff.email}
            </strong>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Người Kiểm Duyệt &amp; Thời Gian</div>
            <strong>
              {staff.verifiedBy ? `@${staff.verifiedBy}` : 'Chưa có người duyệt'}{' '}
              {staff.verifiedAt
                ? `(${new Date(staff.verifiedAt).toLocaleDateString('vi-VN')})`
                : ''}
            </strong>
          </div>
        </div>

        {/* Section 2: Chứng từ & Thông số Chuyên môn theo Role */}
        {isDriverRole && (
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10
              }}
            >
              <Truck size={16} color="#10b981" />
              <span>Hồ Sơ Lái Xe &amp; Phương Tiện ({staff.roleCode})</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="verify-license-num">Số GPLX</label>
                <input
                  id="verify-license-num"
                  className="form-input"
                  value={draft.licenseNumber}
                  onChange={(e) => setDraft({ ...draft, licenseNumber: e.target.value })}
                  placeholder="VD: 790145889201"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="verify-license-class">Hạng Bằng</label>
                <select
                  id="verify-license-class"
                  className="form-input"
                  value={draft.licenseClass}
                  onChange={(e) => setDraft({ ...draft, licenseClass: e.target.value })}
                >
                  <option value="FC">FC (Đầu kéo Container)</option>
                  <option value="C">C (Xe tải EV/Diesel)</option>
                  <option value="B2">B2 (Xe tải nhẹ)</option>
                  <option value="A1">A1 (Shipper xe máy điện)</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="verify-license-expiry">Hạn GPLX</label>
                <input
                  id="verify-license-expiry"
                  type="date"
                  className="form-input"
                  value={draft.licenseExpiryDate}
                  onChange={(e) => setDraft({ ...draft, licenseExpiryDate: e.target.value })}
                />
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >
              <span>
                Phương tiện phụ trách: <strong>{staff.assignedVehiclePlate || 'Chưa gán xe'}</strong>
              </span>
              {staff.assignedHubCode && (
                <span>
                  Hub cô lập: <strong>{staff.assignedHubCode}</strong>
                </span>
              )}
              <span>
                Điểm phạt an toàn BRULE-18:{' '}
                <strong style={{ color: Number(staff.demeritPoints || 0) > 5 ? '#ef4444' : '#10b981' }}>
                  {staff.demeritPoints || 0}/20 điểm
                </strong>
              </span>
            </div>
          </div>
        )}

        {isControllerRole && (
          <div style={{ marginBottom: '16px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10
              }}
            >
              <Award size={16} color="#f59e0b" />
              <span>Chứng Chỉ Kiểm Soát &amp; Thẩm Quyền Ký Duyệt ({staff.roleCode})</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" htmlFor="verify-cert-code">Mã Chứng Chỉ</label>
                <input
                  id="verify-cert-code"
                  className="form-input"
                  value={draft.certificationCode}
                  onChange={(e) => setDraft({ ...draft, certificationCode: e.target.value })}
                  placeholder="VD: HSE-2026-003"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="verify-cert-expiry">Hạn Chứng Chỉ</label>
                <input
                  id="verify-cert-expiry"
                  type="date"
                  className="form-input"
                  value={draft.certificateExpiryDate}
                  onChange={(e) => setDraft({ ...draft, certificateExpiryDate: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="verify-cert-authority">Đơn Vị Cấp</label>
                <input
                  id="verify-cert-authority"
                  className="form-input"
                  value={draft.issuingAuthority}
                  onChange={(e) => setDraft({ ...draft, issuingAuthority: e.target.value })}
                  placeholder="Cục Đăng Kiểm / GLEC v3"
                />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="form-label" htmlFor="verify-scope">Phạm Vi Kiểm Soát Nghiệp Vụ</label>
              <input
                id="verify-scope"
                className="form-input"
                value={draft.inspectionScope}
                onChange={(e) => setDraft({ ...draft, inspectionScope: e.target.value })}
                placeholder="VD: PRE_TRIP_UC01, GLEC_V3_CARBON_UC12, HUB_POD_PHOTO"
              />
            </div>
          </div>
        )}

        {/* Section 3: Checklist Kiểm Duyệt Nghiệp Vụ */}
        <div style={{ marginBottom: '16px' }}>
          <h4
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10
            }}
          >
            <ClipboardCheck size={16} color="#38bdf8" />
            <span>Checklist Kiểm Duyệt Nghiệp Vụ Bắt Buộc</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.backgroundCheckPassed}
                onChange={(e) => setDraft({ ...draft, backgroundCheckPassed: e.target.checked })}
              />
              <span>Đã xác minh CCCD &amp; Lý lịch tư pháp / Không xung đột lợi ích</span>
            </label>

            {isDriverRole && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.healthCheckPassed}
                    onChange={(e) => setDraft({ ...draft, healthCheckPassed: e.target.checked })}
                  />
                  <span>Đạt giấy khám sức khỏe &amp; xét nghiệm âm tính định kỳ</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.safetyTrainingCertified}
                    onChange={(e) => setDraft({ ...draft, safetyTrainingCertified: e.target.checked })}
                  />
                  <span>Hoàn tất tập huấn an toàn PCCC, lái xe điện EV &amp; quy trình ePOD</span>
                </label>
              </>
            )}

            {isControllerRole && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draft.canSignOffCompliance}
                  onChange={(e) => setDraft({ ...draft, canSignOffCompliance: e.target.checked })}
                />
                <span>Cấp quyền ký duyệt &amp; niêm phong chứng từ kiểm soát nghiệp vụ</span>
              </label>
            )}
          </div>
        </div>

        {/* Missing Condition Alert */}
        {missingForApproval.length > 0 && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b',
              fontSize: '0.78rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={15} />
            <span>
              Cần hoàn thiện trước khi Phê duyệt đạt chuẩn: <strong>{missingForApproval.join(', ')}</strong>
            </span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <XCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label" htmlFor="verify-notes">Ghi Chú Thẩm Định / Lý Do Kiểm Duyệt</label>
          <textarea
            id="verify-notes"
            rows={2}
            className="form-input"
            value={draft.verificationNotes}
            onChange={(e) => setDraft({ ...draft, verificationNotes: e.target.value })}
            placeholder="Nhập kết luận thẩm định hồ sơ, hạn bằng lái hoặc yêu cầu bổ sung..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Đóng
          </button>
          {canVerify && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleActionSubmit('REJECTED')}
                className="btn btn-secondary"
                style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
              >
                <XCircle size={14} />
                <span>Từ Chối</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleActionSubmit('REVISION_REQUIRED')}
                className="btn btn-secondary"
                style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <FileCheck2 size={14} />
                <span>Yêu Cầu Bổ Sung</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleActionSubmit('APPROVED')}
                className="btn btn-primary"
              >
                <CheckCircle2 size={14} />
                <span>Phê Duyệt Đạt Chuẩn Nghiệp Vụ</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
