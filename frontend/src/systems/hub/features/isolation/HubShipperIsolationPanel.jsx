import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  EyeOff,
  Lock,
  MapPin,
  ShieldCheck,
  ThermometerSnowflake,
  UserCheck
} from 'lucide-react';

export default function HubShipperIsolationPanel({
  activeHub,
  policy,
  activeShipper,
  hubShippers,
  manifestItems,
  rangeAssignments,
  strictHubIsolationEnforced,
  currentUsername,
  canAssignCodeRange = true,
  isReadOnlyAuditor = false,
  isDark,
  onAssignCodeRange
}) {
  const sortedCodes = useMemo(
    () =>
      [...manifestItems]
        .filter((m) => m.hubCode === activeHub?.hubCode)
        .sort((a, b) => a.itemCode.localeCompare(b.itemCode))
        .map((m) => m.itemCode),
    [manifestItems, activeHub]
  );

  const [targetShipperCode, setTargetShipperCode] = useState(
    activeShipper?.shipperCode || hubShippers[0]?.shipperCode || ''
  );
  const [fromCode, setFromCode] = useState(sortedCodes[0] || '');
  const [toCode, setToCode] = useState(sortedCodes[Math.min(2, sortedCodes.length - 1)] || sortedCodes[0] || '');
  const [rangeError, setRangeError] = useState('');

  useEffect(() => {
    setTargetShipperCode(activeShipper?.shipperCode || hubShippers[0]?.shipperCode || '');
  }, [activeShipper, hubShippers, activeHub]);

  useEffect(() => {
    if (sortedCodes.length > 0) {
      setFromCode(sortedCodes[0]);
      setToCode(sortedCodes[Math.min(2, sortedCodes.length - 1)]);
    } else {
      setFromCode('');
      setToCode('');
    }
    setRangeError('');
  }, [activeHub, sortedCodes]);

  const cardBg = isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff';
  const subtleBg = isDark ? 'rgba(30, 41, 59, 0.55)' : '#f8fafc';
  const border = isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!targetShipperCode || !fromCode || !toCode) {
      setRangeError('Vui lòng chọn đầy đủ Shipper, Từ mã hàng và Tới mã hàng.');
      return;
    }
    if (fromCode.localeCompare(toCode) > 0) {
      setRangeError('Mã bắt đầu không được lớn hơn mã kết thúc.');
      return;
    }
    setRangeError('');
    onAssignCodeRange({
      hubCode: activeHub.hubCode,
      shipperCode: targetShipperCode,
      fromItemCode: fromCode,
      toItemCode: toCode
    });
  };

  const hubBatches = useMemo(
    () => rangeAssignments.filter((b) => b.hubCode === activeHub?.hubCode),
    [rangeAssignments, activeHub]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top 2 Columns: Account Isolation + Delivery Scope | Role-Specific Shipper Policy */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16
        }}
      >
        {/* Left: Strict Hub Isolation & Today's Delivery Scope */}
        <section
          style={{
            background: cardBg,
            border,
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={17} color="#059669" />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                CÔ LẬP DỮ LIỆU THEO TRỤ SỞ (HUB ISOLATION)
              </span>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 999,
                background: strictHubIsolationEnforced
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(2, 132, 199, 0.14)',
                color: strictHubIsolationEnforced ? '#059669' : '#0284c7'
              }}
            >
              {strictHubIsolationEnforced
                ? `Đã khóa tài khoản @${currentUsername} → ${activeHub?.hubCode}`
                : `Giám sát Trụ sở • Đang xem ${activeHub?.hubCode}`}
            </span>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.28)'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> PHẠM VI GIAO HÀNG HÔM NAY TẠI TRỤ SỞ
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', marginTop: 4 }}>
              {activeShipper
                ? `${activeShipper.fullName} (${activeShipper.shipperCode}) • ${activeShipper.vehiclePlate}`
                : activeHub?.hubName}
            </div>
            <div style={{ fontSize: '0.8rem', color: textPrimary, marginTop: 4, lineHeight: 1.45 }}>
              {activeShipper?.todayDeliveryScope || activeHub?.districtZone}
            </div>
            {activeShipper?.assignedCodeRangeFrom && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 8,
                    background: 'rgba(2, 132, 199, 0.14)',
                    color: '#0284c7'
                  }}
                >
                  Dải mã được giao: {activeShipper.assignedCodeRangeFrom} → {activeShipper.assignedCodeRangeTo}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 8,
                    background: subtleBg,
                    border,
                    color: textMuted
                  }}
                >
                  Bán kính tối đa: {policy?.maxDailyRadiusKm ?? 2.5} km • SLA {policy?.slaDeliveryMinutes ?? 90} phút
                </span>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.77rem', color: textMuted, lineHeight: 1.5 }}>
            {policy?.dataIsolationRule}
          </div>
        </section>

        {/* Right: Role-Appropriate Shipper Policy Only */}
        <section
          style={{
            background: cardBg,
            border,
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={17} color="#0284c7" />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                CHÍNH SÁCH DÀNH RIÊNG CHO SHIPPER • {policy?.policyCode}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.69rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(100, 116, 139, 0.14)',
                color: textMuted,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <EyeOff size={11} /> Ẩn giá hợp đồng B2B
            </span>
          </div>

          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{policy?.policyTitle}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.77rem' }}>
            <div style={{ padding: '8px 11px', borderRadius: 10, background: subtleBg, border, display: 'flex', gap: 8 }}>
              <Camera size={15} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Quy định Ảnh xác thực POD:</strong> {policy?.photoPodRule}
              </div>
            </div>
            <div style={{ padding: '8px 11px', borderRadius: 10, background: subtleBg, border, display: 'flex', gap: 8 }}>
              <ThermometerSnowflake size={15} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Cam kết Nhiệt độ & Thời gian SLA:</strong> {policy?.temperatureSlaRule}
              </div>
            </div>
            <div style={{ padding: '8px 11px', borderRadius: 10, background: subtleBg, border, display: 'flex', gap: 8 }}>
              <UserCheck size={15} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Phân quyền Dữ liệu:</strong> {policy?.codAndPricingRule}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Panel: Task Assignment by Code Range (From Item Code -> To Item Code) */}
      <section
        style={{
          background: cardBg,
          border,
          borderRadius: 16,
          padding: '18px 20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14
          }}
        >
          <div>
            <div style={{ fontSize: '0.71rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
              GIAO NHIỆM VỤ THEO DẢI MÃ SỐ KIỆN HÀNG (TỪ MÃ → TỚI MÃ)
            </div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, marginTop: 2 }}>
              Chọn Shipper trực thuộc {activeHub?.hubCode} & Dải mã đơn bàn giao trong ca
            </div>
          </div>
        </div>

        {canAssignCodeRange ? (
          <form
            onSubmit={handleAssignSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
              gap: 10,
              alignItems: 'end',
              padding: 14,
              borderRadius: 12,
              background: subtleBg,
              border,
              marginBottom: 14
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: 4 }}>
                Shipper trong Trụ sở
              </label>
              <select
                data-testid="select-range-shipper"
                value={targetShipperCode}
                onChange={(e) => setTargetShipperCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 9,
                  border,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                {hubShippers.map((s) => (
                  <option key={s.shipperCode} value={s.shipperCode}>
                    {s.fullName} ({s.shipperCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: 4 }}>
                Giao từ mã số
              </label>
              <select
                data-testid="select-range-from"
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 9,
                  border,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                {sortedCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: 4 }}>
                Đến mã số
              </label>
              <select
                data-testid="select-range-to"
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 9,
                  border,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                {sortedCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              data-testid="btn-assign-code-range"
              style={{
                padding: '9px 14px',
                borderRadius: 9,
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 36
              }}
            >
              <ClipboardList size={15} /> Giao nhiệm vụ Dải mã
            </button>
          </form>
        ) : (
          <div
            data-testid="code-range-rbac-notice"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: subtleBg,
              border,
              marginBottom: 14,
              fontSize: '0.78rem',
              color: textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Lock size={15} color="#d97706" />
            <span>
              {isReadOnlyAuditor
                ? 'Tài khoản Kiểm tra viên (HUB_AUDITOR) ở chế độ Chỉ Đọc — chỉ thẩm định Phiếu giao Dải mã & Ảnh POD, không được sửa phân công.'
                : 'Chỉ Trưởng Trụ sở (HUB_MANAGER) hoặc Quản trị viên (ADMIN) mới có quyền giao nhiệm vụ theo Dải mã số. Tài khoản Shipper chỉ xem dải mã mình phụ trách bên dưới.'}
            </span>
          </div>
        )}

        {rangeError && (
          <div style={{ color: '#ef4444', fontSize: '0.76rem', fontWeight: 700, marginBottom: 10 }}>
            {rangeError}
          </div>
        )}

        {/* Active Range Assignments Ledger */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {hubBatches.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: textMuted }}>
              Chưa có phiếu giao theo dải mã cho trụ sở {activeHub?.hubCode}. Bạn có thể tạo ngay bằng form phía trên.
            </div>
          ) : (
            hubBatches.map((batch) => (
              <div
                key={batch.batchCode}
                style={{
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: subtleBg,
                  border,
                  fontSize: '0.76rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#0284c7' }}>{batch.batchCode}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#059669',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <CheckCircle2 size={11} /> {batch.totalItems} kiện • {batch.totalWeightKg} kg
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', marginTop: 4 }}>
                  {batch.shipperName} ({batch.shipperCode})
                </div>
                <div style={{ fontWeight: 800, color: '#059669', marginTop: 2 }}>
                  Dải mã: {batch.fromItemCode} → {batch.toItemCode}
                </div>
                <div style={{ color: textMuted, marginTop: 4, lineHeight: 1.4 }}>
                  Phạm vi: {batch.assignedZoneScope}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

