import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileSignature,
  Navigation,
  ShieldCheck,
  Thermometer,
  Truck,
  X
} from 'lucide-react';
import { CONTRACT_STATUS_META, loadContractSlaEvents } from '../../utils/paymentSync';

const LIFECYCLE_STEPS = [
  { key: 'DRAFT', label: 'Khởi tạo Dự thảo', desc: 'Điều khoản & SLA' },
  { key: 'SIGNED_ACTIVE', label: 'Ký số SHA-256', desc: 'Kích hoạt hiệu lực' },
  { key: 'MONITORING', label: 'Giám sát IoT & SLA', desc: 'Đúng giờ & Nhiệt độ' },
  { key: 'SETTLED', label: 'Nghiệm thu ePOD', desc: 'Chốt cước & Hóa đơn' }
];

export default function CustomerContractModal({
  isOpen,
  onClose,
  isDark = false,
  contract = null,
  shipment = null,
  user,
  onSignContract,
  onRecordSlaEvent,
  onSettleWithEpod,
  onOpenPayment,
  onTrack3D
}) {
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const contractNumber = contract?.contractNumber || (shipment ? `HD-${shipment.shipmentCode}` : '');

  useEffect(() => {
    setFeedback(null);
    setCopiedHash(false);
  }, [isOpen, contractNumber]);

  useEffect(() => {
    if (!isOpen || !contractNumber) return;
    let active = true;
    loadContractSlaEvents(contractNumber).then((list) => {
      if (active) setEvents(list || []);
    });
    return () => {
      active = false;
    };
  }, [isOpen, contractNumber, contract?.slaPenaltyDeductionVnd, contract?.contractStatus]);

  if (!isOpen || (!contract && !shipment)) return null;

  const isMsa = contract?.contractType === 'MASTER_MSA';
  const statusKey = contract?.contractStatus || 'SIGNED_ACTIVE';
  const statusMeta = CONTRACT_STATUS_META[statusKey] || CONTRACT_STATUS_META.SIGNED_ACTIVE;
  const contractVal = Number(contract?.contractValueVnd ?? shipment?.estimatedCostVnd ?? 1850000);
  const penaltyDeduction = Number(contract?.slaPenaltyDeductionVnd || 0);
  const finalSettlement = Number(
    contract?.finalSettlementVnd ?? Math.max(0, contractVal - penaltyDeduction)
  );
  const creditLimit = Number(contract?.creditLimitVnd || 500000000);
  const usedCredit = Number(contract?.usedCreditVnd || 0);
  const availableCredit = Math.max(0, creditLimit - usedCredit);
  const creditPct = creditLimit > 0 ? Math.min(100, Math.round((usedCredit / creditLimit) * 100)) : 0;

  const activeStageIndex =
    statusKey === 'SETTLED' ? 3 : statusKey === 'SIGNED_ACTIVE' ? 2 : 0;

  const cardBg = isDark ? '#071318' : '#ffffff';
  const surfaceBg = isDark ? 'rgba(15, 23, 42, 0.72)' : '#f8fafc';
  const elevBg = isDark ? 'rgba(30, 41, 59, 0.55)' : '#f1f5f9';
  const borderCol = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)';
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  const handleCopyHash = () => {
    if (!contract?.customerSignatureHash) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(contract.customerSignatureHash).catch(() => {});
    }
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadJson = () => {
    const payload = {
      platform: 'CCADRO Smart Green Logistics B2B Contract Ledger',
      contractNumber,
      contractType: contract?.contractType || 'SPOT_TRIP',
      parentContractNumber: contract?.parentContractNumber || null,
      shipmentCode: contract?.shipmentCode || shipment?.shipmentCode || null,
      parties: {
        customerId: contract?.customerId || shipment?.customerId || user?.customerId,
        customerName: contract?.customerName || shipment?.customerName || user?.companyName,
        providerName: contract?.providerName || 'CCADRO GREEN LOGISTICS ALLIANCE'
      },
      digitalSignature: {
        signedBy: contract?.signedByCustomerUser || user?.username,
        sha256Hash: contract?.customerSignatureHash || 'PENDING_SIGNATURE',
        signedAt: contract?.signedAt || null
      },
      slaTerms: {
        onTimeRatePct: contract?.slaOnTimeRatePct ?? 98.5,
        maxTempDeviationC: contract?.slaMaxTempDeviationC ?? 2.0,
        penaltyPctPerBreach: contract?.slaPenaltyPctPerBreach ?? 5.0,
        minCo2ReductionKg: contract?.minCo2ReductionKg ?? shipment?.co2SavedKg ?? 0
      },
      settlementVnd: {
        contractValueVnd: contractVal,
        slaPenaltyDeductionVnd: penaltyDeduction,
        finalSettlementVnd: finalSettlement
      },
      slaEvents: events
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contractNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      if (contractNumber) {
        const refreshed = await loadContractSlaEvents(contractNumber);
        setEvents(refreshed || []);
      }
      if (successMsg) {
        setFeedback({ type: 'success', text: successMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err?.message || 'Không thể xử lý thao tác hợp đồng.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1180,
        background: 'rgba(2, 6, 23, 0.76)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chi Tiết Hợp Đồng Điện Tử & Đối Soát SLA"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 22,
          background: cardBg,
          color: isDark ? '#f8fafc' : '#0f172a',
          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(15, 23, 42, 0.12)'}`,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45)',
          padding: 0
        }}
      >
        {/* Top Accent Strip + Header */}
        <div
          style={{
            padding: '20px 24px 18px',
            borderBottom: `1px solid ${borderCol}`,
            background: isDark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.06))'
              : 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.04))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 14,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              <ShieldCheck size={14} />{' '}
              {isMsa
                ? 'MASTER SERVICE AGREEMENT (MSA • NET-30)'
                : 'SMART LOGISTICS E-CONTRACT & SLA LEDGER'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                {contractNumber}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: '0.71rem',
                  fontWeight: 800,
                  color: statusMeta.color,
                  background: statusMeta.bg,
                  border: `1px solid ${statusMeta.color}40`
                }}
              >
                {statusMeta.label}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: mutedText, marginTop: 4 }}>
              {contract?.parentContractNumber
                ? `Trực thuộc Hợp đồng khung: ${contract.parentContractNumber} • `
                : ''}
              {contract?.corridorScope || `${shipment?.originName || ''} → ${shipment?.destinationName || ''}`}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hợp đồng"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${borderCol}`,
              background: surfaceBg,
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 4-Stage Legal Lifecycle Stepper */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: `1px solid ${borderCol}`,
            background: surfaceBg,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
            gap: 10
          }}
        >
          {LIFECYCLE_STEPS.map((step, idx) => {
            const done = idx < activeStageIndex || statusKey === 'SETTLED';
            const current = idx === activeStageIndex && statusKey !== 'SETTLED';
            const accent = done ? '#10b981' : current ? '#38bdf8' : mutedText;
            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 10px',
                  borderRadius: 11,
                  background: current
                    ? 'rgba(56, 189, 248, 0.1)'
                    : done
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'transparent',
                  border: `1px solid ${current ? 'rgba(56, 189, 248, 0.35)' : done ? 'rgba(16, 185, 129, 0.25)' : borderCol}`
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: done ? '#10b981' : current ? '#38bdf8' : elevBg,
                    color: done || current ? '#ffffff' : mutedText,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {done ? <Check size={13} /> : idx + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: accent }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: mutedText }}>{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Body */}
        <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>
          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 11,
                background:
                  feedback.type === 'error'
                    ? 'rgba(239, 68, 68, 0.14)'
                    : 'rgba(16, 185, 129, 0.14)',
                border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                color: feedback.type === 'error' ? '#f87171' : '#10b981',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <CheckCircle2 size={15} /> {feedback.text}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 16,
              alignItems: 'start'
            }}
          >
            {/* Left Column: Legal Parties, SHA-256 Certificate, Asset & SLA Clauses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Parties */}
              <div
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: surfaceBg,
                  border: `1px solid ${borderCol}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: mutedText, textTransform: 'uppercase' }}>
                    Bên A • Chủ Hàng Thuê Vận Tải
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', marginTop: 4 }}>
                    {contract?.customerName || shipment?.customerName || user?.companyName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: mutedText, marginTop: 2 }}>
                    Tenant ID: <code>{contract?.customerId || shipment?.customerId || user?.customerId}</code>
                  </div>
                </div>
                <div style={{ borderLeft: `1px solid ${borderCol}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: mutedText, textTransform: 'uppercase' }}>
                    Bên B • Liên Minh Vận Tải Xanh
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', marginTop: 4 }}>
                    {contract?.providerName || 'CCADRO GREEN ALLIANCE'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                    Chuẩn GLEC v3 &amp; ISO 14083
                  </div>
                </div>
              </div>

              {/* Cryptographic SHA-256 Seal */}
              <div
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: contract?.customerSignatureHash
                    ? isDark
                      ? 'rgba(6, 78, 59, 0.24)'
                      : '#ecfdf5'
                    : isDark
                      ? 'rgba(120, 53, 15, 0.2)'
                      : '#fffbeb',
                  border: `1px solid ${
                    contract?.customerSignatureHash
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(245, 158, 11, 0.38)'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileSignature size={15} color={contract?.customerSignatureHash ? '#10b981' : '#f59e0b'} />
                    Chứng Thực Chữ Ký Số Điện Tử (SHA-256)
                  </div>
                  {contract?.customerSignatureHash && (
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      style={{
                        border: 'none',
                        background: 'rgba(16, 185, 129, 0.16)',
                        color: '#10b981',
                        borderRadius: 7,
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {copiedHash ? <Check size={11} /> : <Copy size={11} />}
                      {copiedHash ? 'Đã sao chép' : 'Copy Hash'}
                    </button>
                  )}
                </div>

                {contract?.customerSignatureHash ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#10b981' }}>
                      ✓ Đã ký xác thực bởi @{contract.signedByCustomerUser || user?.username}
                      {contract.signedAt ? ` • ${new Date(contract.signedAt).toLocaleString('vi-VN')}` : ''}
                    </div>
                    <code
                      style={{
                        display: 'block',
                        marginTop: 5,
                        padding: '6px 8px',
                        borderRadius: 7,
                        background: isDark ? 'rgba(2, 6, 23, 0.55)' : 'rgba(255,255,255,0.8)',
                        fontSize: '0.67rem',
                        wordBreak: 'break-all',
                        border: `1px solid ${borderCol}`
                      }}
                    >
                      {contract.customerSignatureHash}
                    </code>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.77rem', color: '#f59e0b', fontWeight: 700, marginTop: 6 }}>
                    Hợp đồng đang ở trạng thái Dự thảo — cần ký số SHA-256 để kích hoạt hiệu lực pháp lý.
                  </div>
                )}
              </div>

              {/* Technical SLA & Asset Spec Matrix */}
              <div
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: surfaceBg,
                  border: `1px solid ${borderCol}`,
                  display: 'grid',
                  gap: 10
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Truck size={15} color="#10b981" /> Thông Số Cam Kết SLA &amp; Tài Sản Vận Tải
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: elevBg }}>
                    <div style={{ fontSize: '0.67rem', color: mutedText }}>Cam kết Đúng giờ (OTIF)</div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', marginTop: 2 }}>
                      ≥ {contract?.slaOnTimeRatePct ?? 98.5}%
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: elevBg }}>
                    <div style={{ fontSize: '0.67rem', color: mutedText }}>Ngưỡng Lệch Nhiệt Độ</div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#10b981', marginTop: 2 }}>
                      ±{contract?.slaMaxTempDeviationC ?? 2.0}°C (Phạt {contract?.slaPenaltyPctPerBreach ?? 5}%)
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: elevBg }}>
                    <div style={{ fontSize: '0.67rem', color: mutedText }}>
                      {isMsa ? 'Đội xe áp dụng' : 'Container & E-Seal ISO'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem', marginTop: 2 }}>
                      {isMsa
                        ? contract?.vehicleType || 'EV & LNG Fleet'
                        : `${contract?.containerCode || shipment?.containerCode || '—'} • ${contract?.eSealNumber || shipment?.eSealNumber || 'ISO-17712'}`}
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: elevBg }}>
                    <div style={{ fontSize: '0.67rem', color: mutedText }}>Cam Kết Giảm Phát Thải</div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981', marginTop: 2 }}>
                      -{contract?.minCo2ReductionKg ?? shipment?.co2SavedKg ?? 0} kg CO2e
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Settlement / Net-30 Meter + Audit Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {isMsa ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'grid',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                      HẠN MỨC TÍN DỤNG CÔNG NỢ NET-30
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: creditPct >= 85 ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)',
                        color: creditPct >= 85 ? '#f87171' : '#10b981'
                      }}
                    >
                      Đã dùng {creditPct}%
                    </span>
                  </div>

                  <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.25)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${creditPct}%`,
                        height: '100%',
                        background: creditPct > 85 ? '#ef4444' : creditPct > 60 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.35s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.76rem' }}>
                    <div>
                      <div style={{ color: mutedText }}>Dư nợ đang ghi sổ</div>
                      <strong style={{ fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                        {usedCredit.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: mutedText }}>Hạn mức khả dụng</div>
                      <strong style={{ fontSize: '0.95rem', color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                        {availableCredit.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: isDark ? 'rgba(6, 78, 59, 0.2)' : '#f0fdf4',
                    border: '1px solid rgba(16, 185, 129, 0.32)',
                    display: 'grid',
                    gap: 8,
                    fontSize: '0.82rem',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} /> Bảng Đối Soát Quyết Toán Hợp Đồng
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Giá trị hợp đồng gốc ({contract?.paymentTerms || 'PREPAID'})</span>
                    <strong>{contractVal.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: penaltyDeduction > 0 ? '#f87171' : '#10b981' }}>
                    <span>Giảm trừ vi phạm SLA tích lũy</span>
                    <strong>-{penaltyDeduction.toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div
                    style={{
                      borderTop: `1px dashed ${borderCol}`,
                      paddingTop: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline'
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>Giá trị đối soát sau ePOD</span>
                    <strong style={{ fontSize: '1.16rem', color: '#10b981' }}>
                      {finalSettlement.toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                </div>
              )}

              {/* Vertical Telemetry & Audit Event Timeline */}
              <div
                style={{
                  padding: 15,
                  borderRadius: 14,
                  background: surfaceBg,
                  border: `1px solid ${borderCol}`
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={15} color="#38bdf8" /> Nhật Ký SLA &amp; Sự Kiện Pháp Lý
                  </span>
                  <span style={{ fontSize: '0.71rem', color: mutedText }}>{events.length} sự kiện</span>
                </div>

                {events.length === 0 ? (
                  <div style={{ fontSize: '0.76rem', color: mutedText, padding: '8px 0' }}>
                    Chưa có sự kiện giám sát SLA nào được ghi nhận.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8, maxHeight: 225, overflowY: 'auto', paddingRight: 4 }}>
                    {events.map((ev) => {
                      const isBreach = ev.severity === 'BREACH' || Number(ev.penaltyAmountVnd || 0) > 0;
                      const isSettled = ev.eventType === 'SETTLED';
                      const accent = isBreach ? '#f87171' : isSettled ? '#38bdf8' : '#10b981';
                      return (
                        <div
                          key={ev.id}
                          style={{
                            padding: '9px 11px',
                            borderRadius: 10,
                            background: isDark ? 'rgba(2, 6, 23, 0.55)' : '#ffffff',
                            border: `1px solid ${borderCol}`,
                            borderLeft: `3px solid ${accent}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', lineHeight: 1.45 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: `${accent}20`,
                                  color: accent
                                }}
                              >
                                {ev.eventType}
                              </span>
                              <span style={{ fontSize: '0.69rem', color: mutedText }}>
                                {ev.recordedBy}
                              </span>
                            </div>
                            <div style={{ marginTop: 3 }}>{ev.description}</div>
                            {ev.createdAt && (
                              <div style={{ fontSize: '0.67rem', color: mutedText, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={10} /> {new Date(ev.createdAt).toLocaleString('vi-VN')}
                              </div>
                            )}
                          </div>
                          {Number(ev.penaltyAmountVnd || 0) > 0 && (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#f87171',
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            >
                              -{Number(ev.penaltyAmountVnd).toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${borderCol}`,
            background: surfaceBg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="lp-btn lp-btn--ghost lp-btn--sm"
              style={{ color: 'inherit', borderColor: borderCol }}
            >
              <Download size={14} /> Xuất Hồ Sơ (.JSON)
            </button>

            {statusKey === 'SIGNED_ACTIVE' && onRecordSlaEvent && !isMsa && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      () =>
                        onRecordSlaEvent(contractNumber, {
                          eventType: 'TEMP_BREACH',
                          severity: 'BREACH',
                          recordedBy: 'IOT_REEFER_SENSOR',
                          description:
                            'Cảnh báo nhiệt độ container vượt ngưỡng +2.4°C (> 2.0°C SLA) — tự động giảm trừ 5%'
                        }),
                      'Đã ghi nhận vi phạm nhiệt độ & khấu trừ 5% giá trị hợp đồng!'
                    )
                  }
                  className="lp-btn lp-btn--ghost lp-btn--sm"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.42)' }}
                >
                  <Thermometer size={14} /> Mô Phỏng Lệch Nhiệt (-5%)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      () =>
                        onRecordSlaEvent(contractNumber, {
                          eventType: 'SLA_ON_TIME_OK',
                          severity: 'INFO',
                          recordedBy: 'GPS_CORRIDOR_GATE',
                          description: 'Phương tiện qua trạm kiểm soát đúng hành lang xanh & đúng ETA'
                        }),
                      'Đã xác nhận mốc hành trình đạt chuẩn SLA 100%.'
                    )
                  }
                  className="lp-btn lp-btn--ghost lp-btn--sm"
                  style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  <CheckCircle2 size={14} /> Xác Nhận Đạt SLA
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusKey === 'DRAFT' && onSignContract && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(
                    () =>
                      onSignContract(contractNumber, {
                        signedByUsername: user?.username || 'customer',
                        notes: 'Chủ hàng ký số SHA-256 kích hoạt hiệu lực hợp đồng'
                      }),
                    'Đã ký số SHA-256 và kích hoạt hợp đồng thành công!'
                  )
                }
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <FileSignature size={14} /> Ký Số SHA-256 Kích Hoạt
              </button>
            )}

            {!isMsa && statusKey === 'SIGNED_ACTIVE' && onSettleWithEpod && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(
                    () =>
                      onSettleWithEpod(contractNumber, {
                        epodSignerName: user?.fullName || user?.companyName || 'Customer B2B',
                        notes: 'Nghiệm thu ePOD & đối soát SLA sang hóa đơn thanh toán'
                      }),
                    'Đã nghiệm thu ePOD và đồng bộ số tiền chốt sang hóa đơn thanh toán!'
                  )
                }
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                <CheckCircle2 size={14} /> Nghiệm Thu ePOD &amp; Chốt Đối Soát
              </button>
            )}

            {!isMsa && onOpenPayment && (shipment || contract?.shipmentCode) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(
                    shipment || {
                      shipmentCode: contract.shipmentCode,
                      estimatedCostVnd: finalSettlement
                    }
                  );
                }}
                className="lp-btn lp-btn--ghost lp-btn--sm"
                style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.45)' }}
              >
                <CreditCard size={14} /> Mở Thanh Toán Hóa Đơn
              </button>
            )}

            {shipment?.shipmentCode && onTrack3D && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTrack3D(shipment.shipmentCode);
                }}
                className="lp-btn lp-btn--ghost lp-btn--sm"
                style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
              >
                <Navigation size={14} /> Theo Dõi 3D
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
