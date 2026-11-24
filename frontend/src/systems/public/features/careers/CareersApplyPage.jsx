import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  KeyRound,
  Leaf,
  MapPin,
  ShieldCheck,
  Truck,
  UserCheck
} from 'lucide-react';
import { api } from '../../../../services/api';
import { sharedInputStyle } from '../../../../shared/components/ui/SharedPrimitives';
import { isClientHttpError, unwrapApiData } from '../../../../utils/formatters';
import {
  APPLICATION_STATUS_META,
  CONTROLLER_ROLE_CODES,
  DRIVER_ROLE_CODES,
  PUBLIC_CAREER_OPENINGS,
  STAFF_ROLE_LABELS,
  getLocalBranches,
  lookupLocalCareerStatus,
  submitLocalApplication
} from '../../../../utils/adminOrgSync';

const STAGE_STEPS = [
  { code: 'SUBMITTED', label: '1. Nộp hồ sơ' },
  { code: 'SCREENING', label: '2. Sơ loại HR' },
  { code: 'INTERVIEW_OR_DRIVE_TEST', label: '3. Phỏng vấn / Lái thử' },
  { code: 'COMPLIANCE_CHECKING', label: '4. Thẩm định Compliance' },
  { code: 'APPROVED_ONBOARDED', label: '5. Tiếp nhận & Cấp TK' }
];

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  nationalId: '',
  dateOfBirth: '',
  address: '',
  roleCode: 'DRIVER',
  preferredBranchId: '',
  preferredBranchCode: '',
  experienceYears: 2,
  expectedSalaryVnd: 20000000,
  licenseNumber: '',
  licenseClass: 'CE',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  certificationCode: '',
  certificateExpiryDate: '2029-12-31',
  issuingAuthority: '',
  inspectionScope: '',
  healthCheckDeclared: true,
  safetyTrainingDeclared: false,
  candidateNotes: ''
};

export default function CareersApplyPage() {
  const [activeTab, setActiveTab] = useState('apply');
  const [openings, setOpenings] = useState(PUBLIC_CAREER_OPENINGS);
  const [branches, setBranches] = useState(() => getLocalBranches(false));
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupCredential, setLookupCredential] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getCareerOpenings();
        const rows = Array.isArray(res?.result) ? res.result : Array.isArray(res) ? res : [];
        if (mounted && rows.length > 0) {
          setOpenings(rows);
        }
      } catch {
        // Keep PUBLIC_CAREER_OPENINGS local fallback
      }
      try {
        const brRes = await api.getBranches(false);
        const rows = Array.isArray(brRes?.result) ? brRes.result : Array.isArray(brRes) ? brRes : [];
        if (mounted && rows.length > 0) {
          setBranches(rows);
        }
      } catch {
        // Public unauthenticated view falls back to getLocalBranches seed cleanly
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.preferredBranchCode && branches.length > 0) {
      setForm((prev) => ({
        ...prev,
        preferredBranchId: branches[0].id || '',
        preferredBranchCode: branches[0].branchCode || ''
      }));
    }
  }, [branches, form.preferredBranchCode]);

  const isDriverRole = useMemo(() => DRIVER_ROLE_CODES.includes(form.roleCode), [form.roleCode]);
  const isControllerRole = useMemo(() => CONTROLLER_ROLE_CODES.includes(form.roleCode), [form.roleCode]);

  const handleSelectOpening = (opening) => {
    const roleCode = opening.roleCode;
    setForm((prev) => ({
      ...prev,
      roleCode,
      licenseClass: roleCode === 'HUB_SHIPPER' ? 'B2' : roleCode === 'DRIVER' ? 'CE' : prev.licenseClass
    }));
    setSubmitError('');
  };

  const handleBranchChange = (branchCode) => {
    const found = branches.find((b) => b.branchCode === branchCode);
    setForm((prev) => ({
      ...prev,
      preferredBranchCode: branchCode,
      preferredBranchId: found?.id || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setReceipt(null);
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setSubmitError('Vui lòng nhập đầy đủ Họ tên, Email và Số điện thoại liên hệ.');
      return;
    }
    setSubmitting(true);
    const payload = {
      ...form,
      appliedRoleCode: form.roleCode,
      dateOfBirth: form.dateOfBirth || null,
      licenseIssueDate: form.licenseIssueDate || null,
      licenseExpiryDate: form.licenseExpiryDate || null,
      experienceYears: Number(form.experienceYears || 0),
      expectedSalaryVnd: Number(form.expectedSalaryVnd || 0),
      preferredBranchId: form.preferredBranchId || null
    };
    try {
      const res = await api.submitPublicApplication(payload);
      setReceipt(unwrapApiData(res));
    } catch (err) {
      if (((form.roleCode === 'DRIVER' && import.meta.env.VITE_DEMO_MODE !== 'true') || isClientHttpError(err)) && err?.message) {
        setSubmitError(err.message);
      } else {
        try {
          const localReceipt = submitLocalApplication(payload);
          setReceipt(localReceipt);
        } catch (localErr) {
          setSubmitError(localErr.message || 'Không thể nộp hồ sơ ứng tuyển.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);
    if (!lookupCode.trim() || !lookupCredential.trim()) {
      setLookupError('Vui lòng nhập Mã hồ sơ (VD: APP-2026-0001) và Email hoặc Mã PIN 6 số.');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await api.lookupCareerStatus(lookupCode.trim(), lookupCredential.trim());
      setLookupResult(unwrapApiData(res));
    } catch (err) {
      if (isClientHttpError(err)) {
        try {
          const localMatch = lookupLocalCareerStatus(lookupCode.trim(), lookupCredential.trim());
          setLookupResult(localMatch);
        } catch {
          setLookupError(err.message || 'Không tìm thấy hồ sơ khớp với thông tin xác thực.');
        }
      } else {
        try {
          const localMatch = lookupLocalCareerStatus(lookupCode.trim(), lookupCredential.trim());
          setLookupResult(localMatch);
        } catch (localErr) {
          setLookupError(localErr.message || 'Không tìm thấy hồ sơ.');
        }
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const activeOpening = openings.find((o) => o.roleCode === form.roleCode) || openings[0];
  const stageIdx = lookupResult
    ? STAGE_STEPS.findIndex((s) => s.code === lookupResult.applicationStatus)
    : -1;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', paddingBottom: 60 }}>
      <header
        style={{
          background: 'linear-gradient(120deg, #064e3b 0%, #0f172a 100%)',
          color: '#fff',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.12)'
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(16,185,129,0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Leaf size={22} color="#34d399" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>CCADRO Green Logistics Careers</div>
              <div style={{ fontSize: 12.5, color: '#cbd5e1' }}>
                Cổng Ứng Tuyển Đội Xe Điện EV, Shipper Hub & Kiểm Soát Nghiệp Vụ (Zero-Trust Onboarding)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              to="/"
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              Trang chủ
            </Link>
            <Link
              to="/login"
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#10b981',
                color: '#052e16',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700
              }}
            >
              Đăng nhập hệ thống
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '28px auto 0', padding: '0 20px' }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 20,
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: activeTab === 'apply' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: activeTab === 'apply' ? '#ecfdf5' : '#fff',
              color: activeTab === 'apply' ? '#065f46' : '#334155',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Briefcase size={17} /> Nộp Hồ Sơ Ứng Tuyển
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: activeTab === 'status' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: activeTab === 'status' ? '#eff6ff' : '#fff',
              color: activeTab === 'status' ? '#075985' : '#334155',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileSearch size={17} /> Tra Cứu Tiến Độ Hồ Sơ
          </button>
        </div>

        {activeTab === 'apply' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 380px) 1fr', gap: 20 }}>
            <section
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 18,
                alignSelf: 'start'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                1. Chọn Vị Trí Đang Tuyển ({openings.length})
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>
                Tài khoản nội bộ chỉ được cấp sau khi Admin/An toàn kiểm duyệt đủ chứng từ & phỏng vấn lái thử. Không mở đăng ký công khai cho quyền ADMIN.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openings.map((op) => {
                  const selected = form.roleCode === op.roleCode;
                  return (
                    <button
                      key={op.roleCode}
                      type="button"
                      onClick={() => handleSelectOpening(op)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 10,
                        border: selected ? '2px solid #059669' : '1px solid #e2e8f0',
                        background: selected ? '#ecfdf5' : '#f8fafc',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{op.title}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: selected ? '#059669' : '#e2e8f0',
                            color: selected ? '#fff' : '#334155',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {op.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#047857', fontWeight: 600, marginTop: 4 }}>
                        {op.salaryRangeVnd}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.45 }}>
                        {op.requirementsSummary}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: 22
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
                    Hồ Sơ Ứng Tuyển: {activeOpening?.title || STAFF_ROLE_LABELS[form.roleCode]}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    {activeOpening?.department} · Role nghiệp vụ: <strong>{form.roleCode}</strong>
                  </p>
                </div>
              </div>

              {receipt && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: 16,
                    borderRadius: 12,
                    background: '#ecfdf5',
                    border: '1px solid #6ee7b7',
                    color: '#065f46'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15 }}>
                    <CheckCircle2 size={20} /> Nộp hồ sơ thành công!
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6 }}>
                    <div>
                      Mã hồ sơ: <strong data-testid="receipt-app-code">{receipt.application?.applicationCode}</strong>
                    </div>
                    <div>
                      Mã PIN tra cứu 6 số: <strong data-testid="receipt-lookup-pin">{receipt.lookupPin}</strong>
                    </div>
                    <div>{receipt.message}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLookupCode(receipt.application?.applicationCode || '');
                      setLookupCredential(receipt.lookupPin || '');
                      setLookupResult(receipt.application || null);
                      setActiveTab('status');
                    }}
                    style={{
                      marginTop: 10,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#059669',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Tra cứu tiến độ hồ sơ ngay
                  </button>
                </div>
              )}

              {submitError && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#b91c1c',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Họ và tên ứng viên *
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="VD: Đỗ Văn Khải"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Email cá nhân *
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="khai.driver@gmail.com"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Số điện thoại *
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0912-345-678"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Số CCCD / CMND
                    <input
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      placeholder="079092004512"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Ngày sinh
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Chi nhánh mong muốn làm việc
                    <select
                      value={form.preferredBranchCode}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      style={inputStyle}
                    >
                      {branches.map((br) => (
                        <option key={br.branchCode} value={br.branchCode}>
                          {br.branchName} ({br.branchCode})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Số năm kinh nghiệm
                    <input
                      type="number"
                      min="0"
                      max="45"
                      value={form.experienceYears}
                      onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                    Mức lương kỳ vọng (VNĐ)
                    <input
                      type="number"
                      min="0"
                      step="500000"
                      value={form.expectedSalaryVnd}
                      onChange={(e) => setForm({ ...form, expectedSalaryVnd: e.target.value })}
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                  Địa chỉ hiện tại
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                    style={inputStyle}
                  />
                </label>

                {isDriverRole && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      display: 'grid',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#166534' }}>
                      <Truck size={18} /> Chứng Từ Pháp Lý Đội Xe / Giao Nhận (Bắt buộc trước khi Onboard)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Số Giấy phép lái xe (GPLX) *
                        <input
                          required
                          value={form.licenseNumber}
                          onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                          placeholder="790192004512"
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Hạng GPLX *
                        <select
                          value={form.licenseClass}
                          onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="FC">FC · GPLX cấp trước 01/01/2025</option>
                          <option value="CE">CE · Đầu kéo sơ mi rơ moóc</option>
                          <option value="C">C — Xe tải trên 3.5 tấn</option>
                          <option value="C1">C1 — Xe tải trung</option>
                          <option value="B2">B2 — Xe tải nhẹ / Van EV</option>
                          <option value="A1">A1 — Xe máy Last-Mile</option>
                        </select>
                      </label>
                      {form.roleCode === 'DRIVER' && (
                        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                          Ngày cấp GPLX *
                          <input required type="date" value={form.licenseIssueDate}
                            onChange={(event) => setForm({ ...form, licenseIssueDate: event.target.value })} style={inputStyle} />
                        </label>
                      )}
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Hạn GPLX *
                        <input
                          required
                          type="date"
                          value={form.licenseExpiryDate}
                          onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={form.healthCheckDeclared}
                          onChange={(e) => setForm({ ...form, healthCheckDeclared: e.target.checked })}
                        />
                        Đã có giấy khám sức khỏe lái xe hợp lệ
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={form.safetyTrainingDeclared}
                          onChange={(e) => setForm({ ...form, safetyTrainingDeclared: e.target.checked })}
                        />
                        Đã qua tập huấn An toàn Pin EV / PCCC
                      </label>
                    </div>
                  </div>
                )}

                {isControllerRole && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      display: 'grid',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#92400e' }}>
                      <ShieldCheck size={18} /> Chứng Chỉ Kiểm Soát & Hành Nghề (HSE / ESG / Hub Audit)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Mã chứng chỉ hành nghề *
                        <input
                          required
                          value={form.certificationCode}
                          onChange={(e) => setForm({ ...form, certificationCode: e.target.value })}
                          placeholder="HSE-VN-2026-309 / ISO14083..."
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Hiệu lực chứng chỉ *
                        <input
                          required
                          type="date"
                          value={form.certificateExpiryDate}
                          onChange={(e) => setForm({ ...form, certificateExpiryDate: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Cơ quan / Tổ chức cấp
                        <input
                          value={form.issuingAuthority}
                          onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })}
                          placeholder="Cục An Toàn Lao Động / Smart Freight Centre"
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                        Phạm vi kiểm soát nghiệp vụ *
                        <input
                          required
                          value={form.inspectionScope}
                          onChange={(e) => setForm({ ...form, inspectionScope: e.target.value })}
                          placeholder="AN_TOAN_KY_THUAT, KIEM_TOAN_CARBON"
                          style={inputStyle}
                        />
                      </label>
                    </div>
                  </div>
                )}

                <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
                  Kinh nghiệm thực tế & Ghi chú ứng tuyển
                  <textarea
                    rows={3}
                    value={form.candidateNotes}
                    onChange={(e) => setForm({ ...form, candidateNotes: e.target.value })}
                    placeholder="Tóm tắt kinh nghiệm chạy tuyến, chứng chỉ bổ sung hoặc thời gian có thể nhận việc..."
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '11px 22px',
                      borderRadius: 10,
                      border: 'none',
                      background: submitting ? '#94a3b8' : '#059669',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting ? 'Đang gửi hồ sơ...' : 'Gửi Hồ Sơ Ứng Tuyển'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === 'status' && (
          <section
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 24,
              maxWidth: 860
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800 }}>
              Tra Cứu Tiến Độ Phê Duyệt Hồ Sơ Ứng Tuyển
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
              Nhập Mã hồ sơ (VD: <code>APP-2026-0001</code>) cùng Email ứng tuyển hoặc Mã PIN 6 số (VD: <code>482910</code>).
            </p>

            <form
              onSubmit={handleLookup}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 16 }}
            >
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Mã hồ sơ (VD: APP-2026-0001)"
                style={inputStyle}
              />
              <input
                value={lookupCredential}
                onChange={(e) => setLookupCredential(e.target.value)}
                placeholder="Email hoặc Mã PIN 6 số"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={lookupLoading}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {lookupLoading ? 'Đang tra cứu...' : 'Kiểm Tra'}
              </button>
            </form>

            {lookupError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14
                }}
              >
                {lookupError}
              </div>
            )}

            {lookupResult && (
              <div style={{ display: 'grid', gap: 16, paddingTop: 8 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>
                      {lookupResult.fullName} — {lookupResult.applicationCode}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                      Vị trí: <strong>{STAFF_ROLE_LABELS[lookupResult.roleCode] || lookupResult.roleCode}</strong>
                      {' · '}
                      <MapPin size={13} style={{ verticalAlign: 'middle' }} />{' '}
                      {lookupResult.preferredBranchName || lookupResult.preferredBranchCode || 'Chưa chọn chi nhánh'}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 12.5,
                        background: '#ecfdf5',
                        color: APPLICATION_STATUS_META[lookupResult.applicationStatus]?.color || '#0f172a',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      {APPLICATION_STATUS_META[lookupResult.applicationStatus]?.label || lookupResult.applicationStatus}
                    </span>
                  </div>
                </div>

                {lookupResult.applicationStatus !== 'REJECTED' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    {STAGE_STEPS.map((st, idx) => {
                      const done = stageIdx >= idx;
                      return (
                        <div
                          key={st.code}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            border: done ? '1px solid #10b981' : '1px solid #e2e8f0',
                            background: done ? '#ecfdf5' : '#fff',
                            fontSize: 12,
                            fontWeight: done ? 700 : 500,
                            color: done ? '#065f46' : '#64748b'
                          }}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.65 }}>
                  {lookupResult.screeningNotes && (
                    <div>
                      <ClipboardCheck size={15} style={{ verticalAlign: 'middle' }} /> <strong>Ghi chú thẩm định:</strong>{' '}
                      {lookupResult.screeningNotes}
                    </div>
                  )}
                  {lookupResult.interviewScore != null && (
                    <div>
                      <strong>Điểm phỏng vấn / Lái thử:</strong> {lookupResult.interviewScore}/100{' '}
                      {lookupResult.driveTestPassed ? '(Đạt kiểm tra tay lái)' : ''}
                    </div>
                  )}
                  {lookupResult.rejectionReason && (
                    <div style={{ color: '#b91c1c', fontWeight: 600 }}>
                      <strong>Lý do từ chối:</strong> {lookupResult.rejectionReason}
                    </div>
                  )}
                  {lookupResult.applicationStatus === 'APPROVED_ONBOARDED' && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 10,
                        background: '#eff6ff',
                        border: '1px solid #93c5fd',
                        color: '#1e3a8a'
                      }}
                    >
                      <UserCheck size={16} style={{ verticalAlign: 'middle' }} />{' '}
                      Hồ sơ đã được tiếp nhận! Tài khoản nội bộ:{' '}
                      <strong>@{lookupResult.createdUsername || 'staff'}</strong>.{' '}
                      <KeyRound size={15} style={{ verticalAlign: 'middle' }} /> Liên hệ Admin/HR nhận mật khẩu tạm và đổi mật khẩu ở lần đăng nhập đầu tiên.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

const inputStyle = {
  ...sharedInputStyle,
  padding: '9px 12px',
  fontSize: 13.5,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a'
};
