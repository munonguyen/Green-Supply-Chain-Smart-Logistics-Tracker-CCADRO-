import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Leaf,
  QrCode,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X
} from 'lucide-react';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUS_META,
  calculateGreenInvoiceBreakdown
} from '../../utils/paymentSync';

function DeterministicQrSvg({ seed = 'CCADRO-QR', size = 148 }) {
  const cells = 15;
  const grid = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const matrix = [];
    for (let r = 0; r < cells; r += 1) {
      const row = [];
      for (let c = 0; c < cells; c += 1) {
        const inTopLeft = r < 4 && c < 4;
        const inTopRight = r < 4 && c >= cells - 4;
        const inBottomLeft = r >= cells - 4 && c < 4;
        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = r < 4 ? r : r - (cells - 4);
          const lc = c < 4 ? c : c - (cells - 4);
          const border = lr === 0 || lr === 3 || lc === 0 || lc === 3;
          const center = lr >= 1 && lr <= 2 && lc >= 1 && lc <= 2 && (inTopLeft || inTopRight || inBottomLeft);
          row.push(border || (center && lr === 1 && lc === 1) || (lr === 2 && lc === 2));
        } else {
          h ^= (r * 31 + c * 17) + 0x9e3779b9;
          h = Math.imul(h, 0x85ebca6b);
          row.push((Math.abs(h) % 10) < 5);
        }
      }
      matrix.push(row);
    }
    return matrix;
  }, [seed]);

  const cellSize = size / cells;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        background: '#ffffff',
        padding: 8,
        borderRadius: 12,
        border: '1px solid rgba(16, 185, 129, 0.35)',
        flexShrink: 0
      }}
      aria-label="Mã QR Thanh Toán VietQR"
    >
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              rx={1.5}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function CustomerPaymentModal({
  isOpen,
  onClose,
  isDark = false,
  targetOrder = null,
  targetPayment = null,
  user,
  onCreateAndConfirm,
  onConfirmExisting,
  onRefundExisting,
  onWebhookConfirm
}) {
  const [selectedMethod, setSelectedMethod] = useState('VIETQR_NAPAS');
  const [cardLast4, setCardLast4] = useState('8842');
  const [payerName, setPayerName] = useState('Doanh Nghiệp Đối Tác B2B');
  const [txNotes, setTxNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMethod(
      targetPayment?.paymentMethod || targetOrder?.preferredPaymentMethod || 'VIETQR_NAPAS'
    );
    setCardLast4(targetPayment?.cardLast4 || '8842');
    setPayerName(
      targetPayment?.payerName || user?.companyName || user?.fullName || 'Doanh Nghiệp Đối Tác B2B'
    );
    setTxNotes(targetPayment?.notes || '');
    setCopiedMsg('');
    setErrorMsg('');
  }, [
    isOpen,
    targetPayment?.transactionCode,
    targetPayment?.paymentMethod,
    targetPayment?.cardLast4,
    targetPayment?.payerName,
    targetPayment?.notes,
    targetOrder?.shipmentCode,
    targetOrder?.preferredPaymentMethod,
    user?.companyName,
    user?.fullName
  ]);

  if (!isOpen || (!targetOrder && !targetPayment)) return null;

  const shipmentCode = targetPayment?.shipmentCode || targetOrder?.shipmentCode || 'SHP-NEW';
  const containerCode = targetPayment?.containerCode || targetOrder?.containerCode || 'MSKU-000000-0';
  const routeLabel =
    targetPayment?.originName && targetPayment?.destinationName
      ? `${targetPayment.originName} → ${targetPayment.destinationName}`
      : `${targetOrder?.originName || ''} → ${targetOrder?.destinationName || ''}`;

  const breakdown = targetPayment
    ? {
        baseFreightVnd: targetPayment.baseFreightVnd,
        greenEsgDiscountVnd: targetPayment.greenEsgDiscountVnd,
        vatAmountVnd: targetPayment.vatAmountVnd,
        totalAmountVnd: targetPayment.totalAmountVnd,
        discountRatePct: targetPayment.baseFreightVnd
          ? Math.round((targetPayment.greenEsgDiscountVnd / targetPayment.baseFreightVnd) * 100)
          : 5
      }
    : calculateGreenInvoiceBreakdown(
        targetOrder?.estimatedCostVnd || 1850000,
        targetOrder?.powertrainId || 'ev'
      );

  const statusMeta =
    PAYMENT_STATUS_META[targetPayment?.paymentStatus] || PAYMENT_STATUS_META.PENDING;
  const isAlreadyPaid = targetPayment?.paymentStatus === 'PAID';
  const isRefunded = targetPayment?.paymentStatus === 'REFUNDED';
  const isQrMethod = ['VIETQR_NAPAS', 'VNPAY_QR', 'MOMO_WALLET'].includes(selectedMethod);
  const qrSeed =
    targetPayment?.qrPayload ||
    `VIETQR|BANK=VCB|ACC=1038889999|AMT=${breakdown.totalAmountVnd}|SHIP=${shipmentCode}`;

  const handleCopy = (value, label) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedMsg(`Đã sao chép ${label}`);
    setTimeout(() => setCopiedMsg(''), 2200);
  };

  const handleDownloadInvoice = () => {
    const invoicePayload = {
      platform: 'CCADRO Smart Green Logistics Payment Service',
      invoiceNumber: targetPayment?.invoiceNumber || `INV-DRAFT-${shipmentCode}`,
      transactionCode: targetPayment?.transactionCode || 'PENDING_ISSUANCE',
      shipmentCode,
      containerCode,
      route: routeLabel,
      customer: {
        customerId: user?.customerId || 'DOANH_NGHIEP_B2B',
        companyName: payerName
      },
      financialsVnd: breakdown,
      paymentMethod: selectedMethod,
      paymentStatus: targetPayment?.paymentStatus || 'PENDING',
      co2SavedKg: targetPayment?.co2SavedKg ?? targetOrder?.co2SavedKg ?? 0,
      issuedAt: targetPayment?.createdAt || new Date().toISOString(),
      paidAt: targetPayment?.paidAt || null
    };
    const blob = new Blob([JSON.stringify(invoicePayload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoicePayload.invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrimarySubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (
        targetPayment &&
        (targetPayment.paymentStatus === 'PENDING' || targetPayment.paymentStatus === 'NET30_CREDIT')
      ) {
        await onConfirmExisting(targetPayment.transactionCode, {
          paymentMethod: selectedMethod,
          payerName,
          cardLast4: selectedMethod === 'CORPORATE_CARD' ? cardLast4 : undefined,
          notes: txNotes || `Thanh toán qua ${selectedMethod}`
        });
      } else if (!targetPayment && targetOrder) {
        await onCreateAndConfirm(targetOrder, {
          paymentMethod: selectedMethod,
          payerName,
          cardLast4: selectedMethod === 'CORPORATE_CARD' ? cardLast4 : undefined,
          notes: txNotes,
          instantConfirm: selectedMethod !== 'GREEN_CREDIT_NET30'
        });
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Không thể xử lý giao dịch thanh toán. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isDark ? '#071318' : '#ffffff';
  const subtleBg = isDark ? 'rgba(15, 23, 42, 0.72)' : '#f8fafc';
  const borderCol = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)';
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(2, 6, 23, 0.76)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cổng Thanh Toán & Hóa Đơn Điện Tử CCADRO"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 22,
          background: cardBg,
          color: isDark ? '#e2e8f0' : '#0f172a',
          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(15, 23, 42, 0.12)'}`,
          boxShadow: '0 28px 72px rgba(0, 0, 0, 0.45)',
          padding: 0
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${borderCol}`,
            background: isDark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(56,189,248,0.06))'
              : 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(56,189,248,0.04))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12
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
              <ShieldCheck size={14} /> CCADRO B2B PAYMENT GATEWAY • PORT 8088
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                {isAlreadyPaid
                  ? `Hóa Đơn Điện Tử ${targetPayment?.invoiceNumber}`
                  : `Thanh Toán Vận Đơn ${shipmentCode}`}
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
              {routeLabel} • Container: <strong>{containerCode}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ thanh toán"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${borderCol}`,
              background: subtleBg,
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

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.42)',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              {errorMsg}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
              gap: 18
            }}
          >
            {/* Left: Invoice Waterfall + VietQR Card + Transaction Ledger */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 15,
                  background: subtleBg,
                  border: `1px solid ${borderCol}`
                }}
              >
                <div
                  style={{
                    fontSize: '0.77rem',
                    fontWeight: 800,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Receipt size={15} color="#10b981" /> Bảng Kê Cước &amp; Ưu Đãi Cước Xanh ESG
                </div>

                <div style={{ display: 'grid', gap: 9, fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Cước vận tải gốc</span>
                    <strong>{Number(breakdown.baseFreightVnd || 0).toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Leaf size={13} /> Chiết khấu Đội xe Xanh ({breakdown.discountRatePct || 5}%)
                    </span>
                    <strong>
                      -{Number(breakdown.greenEsgDiscountVnd || 0).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Thuế GTGT (VAT 8%)</span>
                    <strong>+{Number(breakdown.vatAmountVnd || 0).toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div
                    style={{
                      borderTop: `1px dashed ${borderCol}`,
                      paddingTop: 10,
                      marginTop: 4,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline'
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>Tổng thanh toán thực thu</span>
                    <span style={{ fontSize: '1.26rem', fontWeight: 900, color: '#10b981' }}>
                      {Number(breakdown.totalAmountVnd || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              </div>

              {isQrMethod && !isAlreadyPaid && !isRefunded && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 15,
                    background: isDark ? 'rgba(6, 78, 59, 0.22)' : '#ecfdf5',
                    border: '1px solid rgba(16, 185, 129, 0.32)',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center'
                  }}
                >
                  <DeterministicQrSvg seed={qrSeed} size={132} />
                  <div style={{ flex: 1, fontSize: '0.76rem', display: 'grid', gap: 6 }}>
                    <div style={{ fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <QrCode size={14} /> Quét VietQR / NAPAS 24/7
                    </div>
                    <div>
                      Ngân hàng: <strong>Vietcombank (VCB)</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>
                        STK: <strong>1038889999</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('1038889999', 'Số tài khoản')}
                        style={{
                          border: 'none',
                          background: 'rgba(16,185,129,0.18)',
                          color: '#10b981',
                          borderRadius: 6,
                          padding: '2px 6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}
                      >
                        <Copy size={11} /> Copy STK
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>
                        Nội dung: <strong>CCADRO {shipmentCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`CCADRO ${shipmentCode}`, 'Nội dung CK')}
                        style={{
                          border: 'none',
                          background: 'rgba(56,189,248,0.16)',
                          color: '#38bdf8',
                          borderRadius: 6,
                          padding: '2px 6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontSize: '0.68rem',
                          fontWeight: 700
                        }}
                      >
                        <Copy size={11} /> Copy ND
                      </button>
                    </div>
                    {copiedMsg && (
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.72rem' }}>
                        ✓ {copiedMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {targetPayment && (
                <div
                  style={{
                    padding: 13,
                    borderRadius: 13,
                    background: subtleBg,
                    border: `1px solid ${borderCol}`,
                    fontSize: '0.75rem',
                    display: 'grid',
                    gap: 5
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Mã giao dịch</span>
                    <code>{targetPayment.transactionCode}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: mutedText }}>Số hóa đơn VAT</span>
                    <strong>{targetPayment.invoiceNumber}</strong>
                  </div>
                  {targetPayment.gatewayReference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: mutedText }}>Tham chiếu cổng TT</span>
                      <code>{targetPayment.gatewayReference}</code>
                    </div>
                  )}
                  {targetPayment.paidAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                      <span>Quyết toán hoàn tất</span>
                      <strong>{new Date(targetPayment.paidAt).toLocaleString('vi-VN')}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Method Selector & Payer Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                Chọn Kênh Thanh Toán &amp; Đối Soát Doanh Nghiệp
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {PAYMENT_METHODS.map((m) => {
                  const active = selectedMethod === m.id;
                  const Icon =
                    m.id === 'CORPORATE_CARD'
                      ? CreditCard
                      : m.id === 'GREEN_CREDIT_NET30'
                        ? Building2
                        : m.id === 'MOMO_WALLET'
                          ? Wallet
                          : Landmark;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isAlreadyPaid || isRefunded}
                      onClick={() => setSelectedMethod(m.id)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: active ? 'rgba(16, 185, 129, 0.14)' : subtleBg,
                        border: active ? '1.5px solid #10b981' : `1px solid ${borderCol}`,
                        color: 'inherit',
                        cursor: isAlreadyPaid || isRefunded ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          border: active ? '5px solid #10b981' : `1.5px solid ${mutedText}`,
                          flexShrink: 0
                        }}
                      />
                      <Icon size={17} color={active ? '#10b981' : '#94a3b8'} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.8rem', color: active ? '#10b981' : 'inherit' }}>
                            {m.label}
                          </strong>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'rgba(16, 185, 129, 0.14)',
                              color: '#10b981',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {m.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.71rem', color: mutedText, marginTop: 2 }}>
                          {m.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 4 }}>
                    Đơn vị / Pháp nhân nhận Hóa đơn VAT
                  </label>
                  <input
                    type="text"
                    disabled={isAlreadyPaid || isRefunded}
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 11px',
                      borderRadius: 9,
                      border: `1px solid ${borderCol}`,
                      background: isDark ? '#0f172a' : '#f8fafc',
                      color: 'inherit',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                {selectedMethod === 'CORPORATE_CARD' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 4 }}>
                      4 số cuối thẻ doanh nghiệp Visa / Mastercard
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      disabled={isAlreadyPaid || isRefunded}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: 9,
                        border: `1px solid ${borderCol}`,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        color: 'inherit',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 4 }}>
                    Ghi chú đối soát kế toán
                  </label>
                  <input
                    type="text"
                    disabled={isAlreadyPaid || isRefunded}
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="VD: Xuất hóa đơn đỏ kèm chứng nhận ISO 14083..."
                    style={{
                      width: '100%',
                      padding: '8px 11px',
                      borderRadius: 9,
                      border: `1px solid ${borderCol}`,
                      background: isDark ? '#0f172a' : '#f8fafc',
                      color: 'inherit',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${borderCol}`,
            background: subtleBg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="lp-btn lp-btn--ghost lp-btn--sm"
              style={{
                color: isDark ? '#e2e8f0' : '#0f172a',
                borderColor: borderCol
              }}
            >
              <Download size={14} /> Tải Hóa Đơn VAT (.JSON)
            </button>

            {targetPayment && isAlreadyPaid && onRefundExisting && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => onRefundExisting(targetPayment.transactionCode)}
                className="lp-btn lp-btn--ghost lp-btn--sm"
                style={{
                  color: '#f87171',
                  borderColor: 'rgba(248, 113, 113, 0.35)'
                }}
              >
                <RotateCcw size={14} /> Yêu Cầu Hoàn Tiền
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              className="lp-btn lp-btn--ghost lp-btn--sm"
            >
              Đóng
            </button>

            {!isAlreadyPaid && !isRefunded && targetPayment && onWebhookConfirm && (
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  setErrorMsg('');
                  try {
                    await onWebhookConfirm(selectedMethod, {
                      transactionCode: targetPayment.transactionCode,
                      gatewayReference: `WH-${selectedMethod}-${Date.now().toString().slice(-6)}`,
                      signature: 'ccadro-vnpay-vietqr-hmac-secret',
                      paidAmountVnd: breakdown.totalAmountVnd,
                      payerName
                    });
                  } catch (err) {
                    setErrorMsg(err?.message || 'Lỗi xác thực Webhook ngân hàng.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="lp-btn lp-btn--ghost lp-btn--sm"
                style={{
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)'
                }}
              >
                <QrCode size={14} /> Webhook Đối Soát 24/7
              </button>
            )}

            {!isAlreadyPaid && !isRefunded && (
              <button
                type="button"
                disabled={submitting}
                onClick={handlePrimarySubmit}
                className="lp-btn lp-btn--primary lp-btn--sm"
              >
                {selectedMethod === 'GREEN_CREDIT_NET30' && !targetPayment ? (
                  <>
                    <FileText size={14} /> {submitting ? 'Đang tạo...' : 'Ghi Nợ Công Nợ Net-30'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />{' '}
                    {submitting
                      ? 'Đang xử lý...'
                      : `Xác Nhận Thanh Toán ${Number(breakdown.totalAmountVnd || 0).toLocaleString('vi-VN')} ₫`}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
