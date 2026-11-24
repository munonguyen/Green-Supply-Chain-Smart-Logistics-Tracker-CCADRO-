import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  IdCard,
  MapPin,
  PencilLine,
  Phone,
  Save,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Truck,
  Upload,
  UserCheck
} from 'lucide-react';
import { formatVnd } from '../../../../utils/formatters';
import ShipperAvatar, { SHIPPER_AVATAR_PRESETS } from './ShipperAvatar';
import './shipper-dossier.css';

function getDocumentHealth(dateStr) {
  if (!dateStr) return { tone: 'muted', label: 'Chưa cập nhật' };
  const ms = new Date(dateStr).getTime();
  if (!Number.isFinite(ms)) return { tone: 'muted', label: dateStr };
  const daysLeft = Math.ceil((ms - Date.now()) / (24 * 3600 * 1000));
  if (daysLeft < 0) return { tone: 'danger', label: `Quá hạn ${Math.abs(daysLeft)} ngày (${dateStr})` };
  if (daysLeft <= 30) return { tone: 'warn', label: `Còn ${daysLeft} ngày (${dateStr})` };
  return { tone: 'ok', label: `Hợp lệ đến ${dateStr}` };
}

function getKycBadge(status) {
  switch ((status || 'PENDING_REVIEW').toUpperCase()) {
    case 'VERIFIED':
      return {
        label: 'Đã xác thực eKYC & Pháp lý',
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.42)',
        color: '#059669'
      };
    case 'REJECTED':
      return {
        label: 'Cần bổ sung hồ sơ',
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.45)',
        color: '#dc2626'
      };
    default:
      return {
        label: 'Chờ duyệt xác thực',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.45)',
        color: '#d97706'
      };
  }
}

function computeProfileCompleteness(shipper) {
  const checks = [
    Boolean(shipper.fullName),
    Boolean(shipper.phone),
    Boolean(shipper.cccdMasked),
    Boolean(shipper.permanentAddress),
    Boolean(shipper.emergencyContactPhone),
    Boolean(shipper.criminalRecordCode),
    Boolean(shipper.driverLicenseClass && shipper.driverLicenseExpiryDate),
    Boolean(shipper.vehiclePlate && shipper.vehicleRegistrationNo),
    Boolean(shipper.inspectionExpiryDate && shipper.insuranceExpiryDate),
    Boolean(shipper.healthCheckExpiryDate)
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export default function ShipperDossierPanel({
  activeHub,
  hubShippers = [],
  activeShipperProfile,
  manifestItems = [],
  isHubShipper = false,
  canVerifyKyc = false,
  isReadOnlyAuditor = false,
  isDark = false,
  onSaveProfile,
  onVerifyKyc
}) {
  const fileInputRef = useRef(null);
  const [focusedCode, setFocusedCode] = useState(
    activeShipperProfile?.shipperCode || hubShippers[0]?.shipperCode || ''
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [kycNoteDraft, setKycNoteDraft] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (isHubShipper && activeShipperProfile?.shipperCode) {
      setFocusedCode(activeShipperProfile.shipperCode);
      return;
    }
    if (!hubShippers.some((s) => s.shipperCode === focusedCode)) {
      setFocusedCode(activeShipperProfile?.shipperCode || hubShippers[0]?.shipperCode || '');
    }
  }, [isHubShipper, activeShipperProfile, hubShippers, focusedCode]);

  const shipper = useMemo(
    () =>
      hubShippers.find((s) => s.shipperCode === focusedCode) ||
      activeShipperProfile ||
      hubShippers[0] ||
      null,
    [hubShippers, focusedCode, activeShipperProfile]
  );

  useEffect(() => {
    if (!shipper) return;
    setEditing(false);
    setAvatarError('');
    setKycNoteDraft(shipper.kycNote || '');
    setForm({
      fullName: shipper.fullName || '',
      avatarUrl: shipper.avatarUrl || '',
      phone: shipper.phone || '',
      permanentAddress: shipper.permanentAddress || '',
      emergencyContactName: shipper.emergencyContactName || '',
      emergencyContactPhone: shipper.emergencyContactPhone || '',
      cccdMasked: shipper.cccdMasked || '',
      cccdIssuedBy: shipper.cccdIssuedBy || 'Cục CSQLHC về TTXH',
      cccdIssuedDate: shipper.cccdIssuedDate || '',
      criminalRecordCode: shipper.criminalRecordCode || '',
      driverLicenseClass: shipper.driverLicenseClass || 'B2',
      driverLicenseMasked: shipper.driverLicenseMasked || '',
      driverLicenseExpiryDate: shipper.driverLicenseExpiryDate || '2030-12-31',
      coldChainCertified: Boolean(shipper.coldChainCertified),
      vehicleType: shipper.vehicleType || '',
      vehiclePlate: shipper.vehiclePlate || '',
      vehicleRegistrationNo: shipper.vehicleRegistrationNo || '',
      gpsDeviceCode: shipper.gpsDeviceCode || `GSHT-${shipper.shipperCode}`,
      inspectionExpiryDate: shipper.inspectionExpiryDate || '2027-06-30',
      insuranceExpiryDate: shipper.insuranceExpiryDate || '2027-06-30',
      healthCheckExpiryDate: shipper.healthCheckExpiryDate || '2027-06-30',
      shiftStatus: shipper.shiftStatus || 'AVAILABLE'
    });
  }, [shipper]);

  if (!shipper) {
    return (
      <section className="shipper-dossier" style={{ padding: 24 }}>
        Chưa có hồ sơ Shipper thuộc Trụ sở này.
      </section>
    );
  }

  const kycBadge = getKycBadge(shipper.kycStatus);
  const licenseHealth = getDocumentHealth(shipper.driverLicenseExpiryDate);
  const inspectionHealth = getDocumentHealth(shipper.inspectionExpiryDate);
  const insuranceHealth = getDocumentHealth(shipper.insuranceExpiryDate);
  const healthCheck = getDocumentHealth(shipper.healthCheckExpiryDate);
  const completenessPct = computeProfileCompleteness(shipper);

  const assignedItems = manifestItems.filter(
    (m) => !m.isDeleted && m.assignedShipperCode === shipper.shipperCode
  );
  const loadPct = Math.min(
    100,
    Math.round(((shipper.currentLoadKg || 0) / (shipper.maxCapacityKg || 1500)) * 100)
  );
  const canEditThisShipper =
    !isReadOnlyAuditor &&
    (canVerifyKyc ||
      (isHubShipper && activeShipperProfile?.shipperCode === shipper.shipperCode));

  const toneColor = (tone) =>
    tone === 'danger' ? '#dc2626' : tone === 'warn' ? '#d97706' : tone === 'ok' ? '#059669' : undefined;

  const previewShipper = editing ? { ...shipper, fullName: form.fullName || shipper.fullName, avatarUrl: form.avatarUrl } : shipper;

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 300 * 1024) {
      setAvatarError('Ảnh đại diện tối đa 300 KB để đồng bộ nhanh.');
      return;
    }
    setAvatarError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((p) => ({ ...p, avatarUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (busy || !onSaveProfile) return;
    setBusy(true);
    try {
      await onSaveProfile(shipper.shipperCode, form);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (nextStatus) => {
    if (busy || !onVerifyKyc) return;
    setBusy(true);
    try {
      await onVerifyKyc(shipper.shipperCode, {
        kycStatus: nextStatus,
        kycNote: kycNoteDraft
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Hồ sơ chi tiết và xác thực Shipper"
      className={`shipper-dossier${isDark ? ' is-dark' : ''}`}
    >
      {/* Selector strip for Hub Manager / Admin / Auditor */}
      {!isHubShipper && hubShippers.length > 1 && (
        <div className="sd-selector-bar">
          <span className="sd-selector-label">
            CHỌN HỒ SƠ SHIPPER ({activeHub?.hubCode}):
          </span>
          {hubShippers.map((item) => {
            const active = item.shipperCode === shipper.shipperCode;
            return (
              <button
                key={item.shipperCode}
                type="button"
                className={`sd-selector-chip${active ? ' is-active' : ''}`}
                onClick={() => setFocusedCode(item.shipperCode)}
              >
                <ShipperAvatar shipper={item} size={22} showBadge={false} />
                <span>{item.fullName}</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.72 }}>{item.shipperCode}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Hero Profile Card with Cover + Avatar + Completeness + KPIs + Dossier Quadrants */}
      <div className="sd-hero-card">
        <div className="sd-hero-cover">
          <span className="sd-hero-cover-tag">
            <ShieldCheck size={13} /> HỒ SƠ XÁC THỰC NHÂN SỰ &amp; PHƯƠNG TIỆN 3PL
          </span>
          <span style={{ fontSize: '0.73rem', fontWeight: 700, opacity: 0.75 }}>
            {activeHub?.hubCode || shipper.hubCode} · ★ {shipper.rating ?? 4.9}
          </span>
        </div>

        <div className="sd-hero-body">
          <div className="sd-hero-identity-row">
            <div className="sd-avatar-wrap">
              <div className="sd-avatar-frame">
                <ShipperAvatar shipper={previewShipper} size={82} showBadge />
                {canEditThisShipper && (
                  <button
                    type="button"
                    className="sd-avatar-camera-btn"
                    title="Đổi ảnh đại diện & cập nhật hồ sơ"
                    aria-label="Đổi ảnh đại diện"
                    onClick={() => setEditing(true)}
                  >
                    <Camera size={13} />
                  </button>
                )}
              </div>

              <div className="sd-identity-title-group">
                <div className="sd-identity-name-row">
                  <h2>{shipper.fullName}</h2>
                  <span className="sd-code-pill">{shipper.shipperCode}</span>
                  <span
                    data-testid="shipper-kyc-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: kycBadge.bg,
                      border: `1px solid ${kycBadge.border}`,
                      color: kycBadge.color
                    }}
                  >
                    <BadgeCheck size={13} />
                    {kycBadge.label}
                  </span>
                  {shipper.coldChainCapable && (
                    <span className="sd-cold-pill">
                      <Snowflake size={12} /> Chuyên tuyến Chuỗi Lạnh
                    </span>
                  )}
                </div>

                <div className="sd-meta-line">
                  <span>
                    <Phone size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                    {shipper.phone}
                  </span>
                  <span>Tài khoản: @{shipper.accountUsername || 'shipper'}</span>
                  <span>Trụ sở: {activeHub?.hubName || shipper.hubCode}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="sd-completeness-box" aria-label="Độ hoàn thiện hồ sơ xác thực">
                <div className="sd-completeness-top">
                  <span>Hoàn thiện hồ sơ</span>
                  <strong style={{ color: completenessPct >= 90 ? '#059669' : '#d97706' }}>
                    {completenessPct}%
                  </strong>
                </div>
                <div className="sd-completeness-track">
                  <div className="sd-completeness-fill" style={{ width: `${completenessPct}%` }} />
                </div>
              </div>

              {canEditThisShipper && (
                <button
                  type="button"
                  className={editing ? 'btn btn-secondary' : 'btn btn-primary'}
                  onClick={() => setEditing((v) => !v)}
                  style={{ fontSize: '0.78rem', padding: '9px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <PencilLine size={14} />
                  {editing ? 'Đóng chỉnh sửa' : 'Cập nhật hồ sơ & giấy tờ'}
                </button>
              )}
            </div>
          </div>

          {/* 4 Performance & SLA KPIs */}
          <div className="sd-kpi-grid">
            {[
              { label: 'Tỷ lệ giao đúng hẹn (OTD)', value: `${shipper.onTimeRatePct ?? 98.5}%`, color: '#059669' },
              { label: 'Chuẩn ảnh Photo POD', value: `${shipper.podCompliancePct ?? 100}%`, color: '#0284c7' },
              { label: 'Đơn hoàn tất trong tháng', value: `${shipper.completedOrdersMonth ?? 120} đơn`, color: '#7c3aed' },
              { label: 'Hạn mức ký quỹ COD', value: formatVnd(shipper.codLimitVnd ?? 20000000), color: '#d97706' }
            ].map((kpi) => (
              <div key={kpi.label} className="sd-kpi-card">
                <span>{kpi.label}</span>
                <strong style={{ color: kpi.color }}>{kpi.value}</strong>
              </div>
            ))}
          </div>

          {/* Comprehensive 3-Section Edit Form + Avatar Uploader */}
          {editing && (
            <form onSubmit={handleSave} aria-label="Form cập nhật hồ sơ Shipper" className="sd-edit-panel">
              {/* Avatar Picker & Upload */}
              <div className="sd-edit-section">
                <h4>0. Ảnh đại diện (Avatar Shipper)</h4>
                <div className="sd-avatar-picker">
                  <ShipperAvatar shipper={previewShipper} size={56} showBadge />
                  {SHIPPER_AVATAR_PRESETS.map((preset) => {
                    const selected = (form.avatarUrl || '') === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className="sd-avatar-choice"
                        aria-pressed={selected}
                        onClick={() => {
                          setAvatarError('');
                          setForm((p) => ({ ...p, avatarUrl: preset.url }));
                        }}
                      >
                        <ShipperAvatar
                          shipper={{ ...previewShipper, avatarUrl: preset.url }}
                          size={24}
                          showBadge={false}
                        />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Tải ảnh đại diện từ máy"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    className="sd-avatar-choice"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} /> Tải ảnh từ thiết bị
                  </button>
                </div>
                {avatarError && (
                  <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>{avatarError}</span>
                )}
              </div>

              {/* Group 1: Identity & Emergency Contact */}
              <div className="sd-edit-section">
                <h4>1. Định danh cá nhân &amp; Liên hệ khẩn cấp</h4>
                <div className="sd-edit-grid">
                  <label className="sd-field">
                    <span>Họ và tên Shipper</span>
                    <input value={form.fullName || ''} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Số điện thoại công vụ</span>
                    <input value={form.phone || ''} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Người liên hệ khẩn cấp</span>
                    <input value={form.emergencyContactName || ''} onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>SĐT khẩn cấp</span>
                    <input value={form.emergencyContactPhone || ''} onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))} />
                  </label>
                </div>
                <label className="sd-field">
                  <span>Địa chỉ thường trú (theo CCCD/Hộ khẩu)</span>
                  <input value={form.permanentAddress || ''} onChange={(e) => setForm((p) => ({ ...p, permanentAddress: e.target.value }))} />
                </label>
              </div>

              {/* Group 2: Legal, CCCD, Driver License */}
              <div className="sd-edit-section">
                <h4>2. Giấy tờ pháp lý, CCCD &amp; Giấy phép lái xe</h4>
                <div className="sd-edit-grid">
                  <label className="sd-field">
                    <span>Số CCCD gắn chip (ẩn giữa)</span>
                    <input value={form.cccdMasked || ''} onChange={(e) => setForm((p) => ({ ...p, cccdMasked: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Nơi cấp CCCD</span>
                    <input value={form.cccdIssuedBy || ''} onChange={(e) => setForm((p) => ({ ...p, cccdIssuedBy: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Ngày cấp CCCD</span>
                    <input type="date" value={form.cccdIssuedDate || ''} onChange={(e) => setForm((p) => ({ ...p, cccdIssuedDate: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Mã Phiếu Lý lịch tư pháp</span>
                    <input value={form.criminalRecordCode || ''} onChange={(e) => setForm((p) => ({ ...p, criminalRecordCode: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Hạn khám sức khỏe lái xe</span>
                    <input type="date" value={form.healthCheckExpiryDate || ''} onChange={(e) => setForm((p) => ({ ...p, healthCheckExpiryDate: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Hạng GPLX</span>
                    <select value={form.driverLicenseClass || 'B2'} onChange={(e) => setForm((p) => ({ ...p, driverLicenseClass: e.target.value }))}>
                      <option value="A1">Hạng A1 / Xe máy</option>
                      <option value="B1">Hạng B1</option>
                      <option value="B2">Hạng B2</option>
                      <option value="C">Hạng C (Tải nhẹ/Trung)</option>
                    </select>
                  </label>
                  <label className="sd-field">
                    <span>Số GPLX (ẩn giữa)</span>
                    <input value={form.driverLicenseMasked || ''} onChange={(e) => setForm((p) => ({ ...p, driverLicenseMasked: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Hạn GPLX</span>
                    <input type="date" value={form.driverLicenseExpiryDate || ''} onChange={(e) => setForm((p) => ({ ...p, driverLicenseExpiryDate: e.target.value }))} />
                  </label>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(form.coldChainCertified)}
                    onChange={(e) => setForm((p) => ({ ...p, coldChainCertified: e.target.checked }))}
                  />
                  Đã hoàn tất chứng chỉ Vận hành Chuỗi Lạnh (GDP / HACCP)
                </label>
              </div>

              {/* Group 3: Vehicle Compliance & Shift */}
              <div className="sd-edit-section">
                <h4>3. Hồ sơ phương tiện, đăng kiểm &amp; trạng thái ca</h4>
                <div className="sd-edit-grid">
                  <label className="sd-field">
                    <span>Loại phương tiện</span>
                    <input value={form.vehicleType || ''} onChange={(e) => setForm((p) => ({ ...p, vehicleType: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Biển kiểm soát xe</span>
                    <input value={form.vehiclePlate || ''} onChange={(e) => setForm((p) => ({ ...p, vehiclePlate: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Số đăng ký (Cà vẹt)</span>
                    <input value={form.vehicleRegistrationNo || ''} onChange={(e) => setForm((p) => ({ ...p, vehicleRegistrationNo: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Mã thiết bị GSHT (GPS)</span>
                    <input value={form.gpsDeviceCode || ''} onChange={(e) => setForm((p) => ({ ...p, gpsDeviceCode: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Hạn đăng kiểm kỹ thuật</span>
                    <input type="date" value={form.inspectionExpiryDate || ''} onChange={(e) => setForm((p) => ({ ...p, inspectionExpiryDate: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Hạn bảo hiểm TNDS</span>
                    <input type="date" value={form.insuranceExpiryDate || ''} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiryDate: e.target.value }))} />
                  </label>
                  <label className="sd-field">
                    <span>Trạng thái ca trực</span>
                    <select value={form.shiftStatus || 'AVAILABLE'} onChange={(e) => setForm((p) => ({ ...p, shiftStatus: e.target.value }))}>
                      <option value="AVAILABLE">Sẵn sàng nhận đơn (AVAILABLE)</option>
                      <option value="ON_DELIVERY">Đang đi giao tuyến (ON_DELIVERY)</option>
                      <option value="OFF_SHIFT">Hết ca / Nghỉ (OFF_SHIFT)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setEditing(false)}>
                  Hủy thay đổi
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <Save size={14} /> {busy ? 'Đang lưu…' : 'Lưu cập nhật hồ sơ'}
                </button>
              </div>
            </form>
          )}

          {/* 4 Structured Dossier Quadrants */}
          <div className="sd-quad-grid">
            <div className="sd-quad-card">
              <div className="sd-quad-head" style={{ color: '#059669' }}>
                <IdCard size={16} /> 1. ĐỊNH DANH eKYC &amp; LÝ LỊCH TƯ PHÁP
              </div>
              <div className="sd-kv-list">
                <div className="sd-kv-row"><span>Số CCCD gắn chip</span><strong>{shipper.cccdMasked || '027094****00'}</strong></div>
                <div className="sd-kv-row"><span>Nơi / Ngày cấp</span><strong>{shipper.cccdIssuedBy || 'Cục CSQLHC về TTXH'} {shipper.cccdIssuedDate ? `(${shipper.cccdIssuedDate})` : ''}</strong></div>
                <div className="sd-kv-row"><span>Địa chỉ thường trú</span><strong>{shipper.permanentAddress || 'Đang cập nhật'}</strong></div>
                <div className="sd-kv-row"><span>Lý lịch tư pháp</span><strong style={{ color: '#059669' }}>{shipper.criminalRecordCode || 'LLTP-2026-STD'} ({shipper.criminalRecordStatus || 'CLEAR'})</strong></div>
                <div className="sd-kv-row"><span>Khám sức khỏe</span><strong style={{ color: toneColor(healthCheck.tone) }}>{healthCheck.label}</strong></div>
                <div className="sd-kv-row"><span>Liên hệ khẩn cấp</span><strong>{shipper.emergencyContactName || 'Chưa khai báo'} · {shipper.emergencyContactPhone || '—'}</strong></div>
              </div>
            </div>

            <div className="sd-quad-card">
              <div className="sd-quad-head" style={{ color: '#0284c7' }}>
                <Award size={16} /> 2. GIẤY PHÉP LÁI XE &amp; CHỨNG CHỈ
              </div>
              <div className="sd-kv-list">
                <div className="sd-kv-row"><span>Hạng GPLX</span><strong>Hạng {shipper.driverLicenseClass || 'B2'} ({shipper.driverLicenseMasked || 'Đã ẩn 4 số'})</strong></div>
                <div className="sd-kv-row"><span>Hiệu lực GPLX</span><strong style={{ color: toneColor(licenseHealth.tone) }}>{licenseHealth.label}</strong></div>
                <div className="sd-kv-row"><span>Chuỗi lạnh GDP/HACCP</span><strong style={{ color: shipper.coldChainCertified ? '#059669' : undefined }}>{shipper.coldChainCertified ? 'Đã cấp chứng chỉ vận hành lạnh' : 'Chưa yêu cầu (Xe hàng khô)'}</strong></div>
                <div className="sd-kv-row"><span>Người duyệt eKYC</span><strong>{shipper.kycVerifiedBy || 'Chờ Trưởng Trụ sở duyệt'}</strong></div>
                {shipper.kycNote && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.85, padding: '8px 10px', borderRadius: 9, background: 'var(--sd-card)', border: '1px solid var(--sd-border)' }}>
                    {shipper.kycNote}
                  </div>
                )}
              </div>
            </div>

            <div className="sd-quad-card">
              <div className="sd-quad-head" style={{ color: '#7c3aed' }}>
                <Truck size={16} /> 3. PHƯƠNG TIỆN, ĐĂNG KIỂM &amp; BẢO HIỂM
              </div>
              <div className="sd-kv-list">
                <div className="sd-kv-row"><span>Phương tiện &amp; Biển số</span><strong>{shipper.vehicleType} · {shipper.vehiclePlate}</strong></div>
                <div className="sd-kv-row"><span>Số đăng ký (Cà vẹt)</span><strong>{shipper.vehicleRegistrationNo || 'Đang đồng bộ'}</strong></div>
                <div className="sd-kv-row"><span>Thiết bị GSHT (GPS)</span><strong>{shipper.gpsDeviceCode || `GSHT-${shipper.shipperCode}`}</strong></div>
                <div className="sd-kv-row"><span>Đăng kiểm kỹ thuật</span><strong style={{ color: toneColor(inspectionHealth.tone) }}>{inspectionHealth.label}</strong></div>
                <div className="sd-kv-row"><span>Bảo hiểm TNDS</span><strong style={{ color: toneColor(insuranceHealth.tone) }}>{insuranceHealth.label}</strong></div>
                <div className="sd-kv-row"><span>Tải trọng ca</span><strong>{shipper.currentLoadKg}/{shipper.maxCapacityKg} kg ({loadPct}%)</strong></div>
              </div>
            </div>

            <div className="sd-quad-card">
              <div className="sd-quad-head" style={{ color: '#d97706' }}>
                <MapPin size={16} /> 4. PHẠM VI PHÂN CÔNG &amp; ĐƠN ĐANG GIỮ
              </div>
              <div className="sd-kv-list">
                <div className="sd-kv-row"><span>Tuyến phụ trách</span><strong>{shipper.assignedZoneName}</strong></div>
                <div className="sd-kv-row"><span>Phạm vi hôm nay</span><strong>{shipper.todayDeliveryScope || activeHub?.districtZone}</strong></div>
                <div className="sd-kv-row"><span>Dải mã được giao</span><strong style={{ color: '#0284c7' }}>{shipper.assignedCodeRangeFrom ? `${shipper.assignedCodeRangeFrom} → ${shipper.assignedCodeRangeTo || shipper.assignedCodeRangeFrom}` : 'Chưa gán dải'}</strong></div>
                <div className="sd-kv-row"><span>Tọa độ chốt trực</span><strong>({shipper.assignedLat?.toFixed(4)}, {shipper.assignedLng?.toFixed(4)}) · R={shipper.coverageRadiusKm}km</strong></div>
                <div className="sd-kv-row"><span>Trạng thái ca trực</span><strong>{shipper.shiftStatus || 'AVAILABLE'} · {assignedItems.length} kiện đang giữ</strong></div>
              </div>
            </div>
          </div>

          {/* Manager / Admin KYC Review Actions */}
          {canVerifyKyc && !isReadOnlyAuditor && (
            <div
              style={{
                padding: '13px 16px',
                borderRadius: 13,
                background: 'var(--sd-subtle)',
                border: '1px solid var(--sd-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: '1 1 280px', display: 'grid', gap: 5 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  <UserCheck size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  PHÊ DUYỆT XÁC THỰC HỒ SƠ SHIPPER (TRƯỞNG TRỤ SỞ / ADMIN)
                </span>
                <input
                  className="input"
                  placeholder="Ghi chú kiểm tra CCCD, GPLX, đăng kiểm trước khi duyệt..."
                  value={kycNoteDraft}
                  onChange={(e) => setKycNoteDraft(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => handleVerify('REJECTED')}
                  style={{ color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  <ShieldAlert size={14} /> Yêu cầu bổ sung
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => handleVerify('VERIFIED')}
                >
                  <ShieldCheck size={14} /> Phê duyệt đạt chuẩn eKYC
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Directory with Avatars */}
      {hubShippers.length > 0 && (
        <div className="sd-hero-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, opacity: 0.72, marginBottom: 12 }}>
            <FileCheck2 size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            TÌNH TRẠNG XÁC THỰC ĐỘI NGŨ SHIPPER TẠI {activeHub?.hubCode} ({hubShippers.length} NHÂN SỰ)
          </div>
          <div className="sd-team-grid">
            {hubShippers.map((item) => {
              const b = getKycBadge(item.kycStatus);
              const active = item.shipperCode === shipper.shipperCode;
              return (
                <div key={item.shipperCode} className={`sd-team-card${active ? ' is-active' : ''}`}>
                  <ShipperAvatar shipper={item} size={46} showBadge />
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.fullName}
                      </strong>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: b.color }}>{item.shipperCode}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', opacity: 0.75 }}>
                      {item.vehicleType} · {item.vehiclePlate} · Hạng {item.driverLicenseClass || 'B2'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: '0.69rem', fontWeight: 800, color: b.color }}>
                        {item.kycStatus === 'VERIFIED' ? (
                          <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                        ) : item.kycStatus === 'REJECTED' ? (
                          <AlertTriangle size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                        ) : (
                          <Clock size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                        )}
                        {b.label}
                      </span>
                      {!isHubShipper && (
                        <button
                          type="button"
                          onClick={() => setFocusedCode(item.shipperCode)}
                          style={{ border: 'none', background: 'transparent', color: '#059669', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                        >
                          Xem hồ sơ →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
