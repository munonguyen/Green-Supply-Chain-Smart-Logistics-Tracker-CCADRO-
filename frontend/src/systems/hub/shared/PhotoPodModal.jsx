import React, { useState } from 'react';
import {
  Banknote,
  Camera,
  CheckCircle2,
  ImagePlus,
  KeyRound,
  PenTool,
  QrCode,
  ShieldAlert,
  Snowflake,
  Upload,
  UserCheck,
  X
} from 'lucide-react';
import { formatVnd } from '../../../utils/formatters';
import { SAMPLE_POD_IMAGE_SVG, SAMPLE_POD_PRESETS } from './hubShipperSeedData';

const HANDOVER_METHODS = [
  { id: 'DIRECT_CONSIGNEE', label: 'Người nhận trực tiếp / Thủ kho' },
  { id: 'RECEPTION_SECURITY', label: 'Lễ tân / Bảo vệ (Khách đồng ý)' },
  { id: 'COLD_DOCK_GATE', label: 'Cửa nhập Kho lạnh / Điểm tập kết' }
];

const RECIPIENT_RELATIONSHIPS = [
  { id: 'SELF', label: 'Chính chủ (Người đặt hàng)' },
  { id: 'FAMILY', label: 'Người thân trong gia đình' },
  { id: 'RECEPTIONIST', label: 'Lễ tân / Nhân viên tiếp nhận' },
  { id: 'COLLEAGUE', label: 'Đồng nghiệp / Nhân viên cùng công ty' },
  { id: 'SECURITY', label: 'Bảo vệ / Nhân viên an ninh' },
  { id: 'WAREHOUSE', label: 'Thủ kho / Nhân viên kho' }
];

export default function PhotoPodModal({
  item,
  policy,
  isDark,
  onClose,
  onConfirmPod
}) {
  const codAmount = Number(item?.codAmountVnd || 0);
  const [proofImageUrl, setProofImageUrl] = useState(item?.proofImageUrl || SAMPLE_POD_IMAGE_SVG);
  const [proofImageCaption, setProofImageCaption] = useState(
    item?.proofImageCaption ||
      `Đã giao đủ ${item?.parcelCount || 1} kiện (${item?.itemCode}) tại ${item?.consigneeName}`
  );
  const [recipientPodName, setRecipientPodName] = useState(
    item?.recipientPodName || `${item?.consigneeName || 'Người nhận'} (Đã ký nhận POD)`
  );
  const [handoverMethod, setHandoverMethod] = useState(
    item?.requiresColdChain ? 'COLD_DOCK_GATE' : 'DIRECT_CONSIGNEE'
  );
  const [measuredTempC, setMeasuredTempC] = useState(
    item?.requiresColdChain ? String(item?.requiredTempC ?? 4) : ''
  );
  const [codCollectionMethod, setCodCollectionMethod] = useState('COLLECTED_CASH');
  const [recipientOtpInput, setRecipientOtpInput] = useState('');
  const [eSigned, setESigned] = useState(true);
  const [recipientRelationship, setRecipientRelationship] = useState('SELF');
  const [errorMsg, setErrorMsg] = useState('');

  if (!item) return null;

  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const subtleBg = isDark ? 'rgba(30, 41, 59, 0.72)' : '#f8fafc';
  const border = isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImageUrl(reader.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((policy?.requirePhotoPod ?? true) && !proofImageUrl?.trim()) {
      setErrorMsg('Quy định Bưu cục: Bắt buộc chụp ảnh thực tế kiện hàng rõ mã vận đơn trước khi hoàn tất!');
      return;
    }
    if (!recipientPodName?.trim()) {
      setErrorMsg('Vui lòng nhập họ tên người ký nhận hàng tại điểm giao.');
      return;
    }
    if (item.requiresColdChain && measuredTempC.trim() === '') {
      setErrorMsg('Kiện hàng Chuỗi lạnh bắt buộc ghi nhận nhiệt độ thùng bảo ôn (°C) khi bàn giao.');
      return;
    }
    if (
      recipientOtpInput.trim() !== '' &&
      item.recipientOtpCode &&
      recipientOtpInput.trim() !== String(item.recipientOtpCode).trim()
    ) {
      setErrorMsg(`Mã OTP không chính xác! Vui lòng đối chiếu lại mã OTP 4 số từ người nhận.`);
      return;
    }

    const methodLabel =
      HANDOVER_METHODS.find((m) => m.id === handoverMethod)?.label || HANDOVER_METHODS[0].label;
    const tempSuffix = item.requiresColdChain
      ? ` • Nhiệt độ bàn giao: ${measuredTempC.trim()}°C (chuẩn ${item.requiredTempC}°C)`
      : '';
    const codSuffix =
      codAmount > 0
        ? codCollectionMethod === 'COLLECTED_QR'
          ? ` • Đã thu COD QR động: ${formatVnd(codAmount)}`
          : ` • Đã thu tiền mặt COD: ${formatVnd(codAmount)}`
        : ' • Đơn 0đ (Đã thanh toán trước)';

    const baseCaption = proofImageCaption.trim();
    const enrichedCaption = baseCaption.includes('[Bàn giao:')
      ? baseCaption
      : `${baseCaption} [Bàn giao: ${methodLabel}${codSuffix}${tempSuffix}]`;

    onConfirmPod({
      itemCode: item.itemCode,
      dispatchStatus: 'DELIVERED_POD',
      proofImageUrl: proofImageUrl.trim(),
      proofImageCaption: enrichedCaption,
      recipientPodName: recipientPodName.trim(),
      recipientRelationship,
      handoverMethod,
      measuredTempC: item.requiresColdChain ? Number(measuredTempC) : null,
      codCollectionMethod: codAmount > 0 ? codCollectionMethod : 'NONE',
      recipientOtpInput: recipientOtpInput.trim() || undefined,
      podSignatureNote: eSigned ? `Đã ký điện tử xác nhận bởi ${recipientPodName.trim()}` : undefined
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xác thực Giao hàng & Ảnh POD - ${item.itemCode}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        isolation: 'isolate',
        background: 'rgba(2, 6, 23, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 650,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: cardBg,
          color: textPrimary,
          borderRadius: 18,
          border,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.48)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '15px 20px',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={20} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                Xác Thực Giao Hàng Thành Công, Thu COD &amp; Ảnh Chứng Từ POD
              </div>
              <div style={{ fontSize: '0.74rem', opacity: 0.92 }}>
                Mã vận đơn: {item.itemCode} • Lần phát {item.deliveryAttemptCount || 1}/{item.maxDeliveryAttempts || 3} • Bưu cục {item.hubCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ Photo POD"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: 8,
              width: 30,
              height: 30,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
          {/* STEP A: SPX COD COLLECTION GATE (Mandatory before handing over parcel!) */}
          {codAmount > 0 ? (
            <div
              data-testid="pod-cod-collection-box"
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                display: 'grid',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '0.77rem', fontWeight: 850, color: '#d97706' }}>
                  <Banknote size={15} style={{ verticalAlign: '-3px', marginRight: 5 }} />
                  ĐƠN THU HỘ TIỀN HÀNG (COD) — BẮT BUỘC THU ĐỦ TRƯỚC KHI GIAO KIỆN
                </span>
                <strong style={{ fontSize: '1.08rem', fontWeight: 900, color: '#b45309' }}>
                  {formatVnd(codAmount)}
                </strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                <button
                  type="button"
                  data-testid="btn-cod-method-cash"
                  aria-pressed={codCollectionMethod === 'COLLECTED_CASH'}
                  onClick={() => setCodCollectionMethod('COLLECTED_CASH')}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 10,
                    border: codCollectionMethod === 'COLLECTED_CASH' ? '2px solid #d97706' : border,
                    background: codCollectionMethod === 'COLLECTED_CASH' ? 'rgba(245, 158, 11, 0.16)' : cardBg,
                    color: textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 850 }}>💵 Thu tiền mặt trực tiếp</div>
                  <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: 2 }}>
                    Cộng +{formatVnd(codAmount)} vào quỹ tiền mặt phải nộp Thủ quỹ cuối ca
                  </div>
                </button>

                <button
                  type="button"
                  data-testid="btn-cod-method-qr"
                  aria-pressed={codCollectionMethod === 'COLLECTED_QR'}
                  onClick={() => setCodCollectionMethod('COLLECTED_QR')}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 10,
                    border: codCollectionMethod === 'COLLECTED_QR' ? '2px solid #0284c7' : border,
                    background: codCollectionMethod === 'COLLECTED_QR' ? 'rgba(2, 132, 199, 0.14)' : cardBg,
                    color: textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 850 }}>📱 Quét Mã QR Động (VietQR / Chuyển khoản)</div>
                  <div style={{ fontSize: '0.68rem', color: textMuted, marginTop: 2 }}>
                    Tiền vào thẳng hệ thống công ty • Shipper không phải giữ tiền mặt
                  </div>
                </button>
              </div>

              {codCollectionMethod === 'COLLECTED_QR' && (
                <div
                  data-testid="spx-dynamic-qr-box"
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: cardBg,
                    border: '1px dashed #0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <QrCode size={34} />
                  </div>
                  <div style={{ fontSize: '0.73rem' }}>
                    <div style={{ fontWeight: 850, color: '#0284c7' }}>
                      Mã QR Động Định Danh Vận Đơn: {item.itemCode}
                    </div>
                    <div style={{ color: textMuted }}>
                      Số tiền khớp tự động: <strong>{formatVnd(codAmount)}</strong> • Nội dung CK: <code>COD {item.itemCode}</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '9px 13px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#059669'
              }}
            >
              ✓ ĐƠN ĐÃ THANH TOÁN TRƯỚC (KHÔNG THU TIỀN COD — 0 ₫) • Chỉ cần chụp ảnh POD &amp; xác nhận người nhận
            </div>
          )}

          {/* Item Sender / Receiver Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 10, background: subtleBg, border, fontSize: '0.75rem' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: 800, color: textMuted }}>NGƯỜI GỬI</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>{item.senderName || 'Kho Chủ hàng CCADRO'}</div>
              <div style={{ color: textMuted }}>{item.senderAddress}</div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: subtleBg, border, fontSize: '0.75rem' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#059669' }}>NGƯỜI NHẬN &amp; ĐỊA ĐIỂM</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>{item.consigneeName}</div>
              <div style={{ color: textMuted }}>{item.deliveryAddress}</div>
            </div>
          </div>

          {/* Photo Preview + Upload with SPX Guidelines and Geotag Watermark */}
          <div>
            {/* SPX Photo Compliance Guideline Banner */}
            <div
              style={{
                padding: '7px 11px',
                borderRadius: 8,
                background: 'rgba(2, 132, 199, 0.09)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                color: '#0284c7',
                fontSize: '0.71rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8
              }}
            >
              <ShieldAlert size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Quy chuẩn ảnh chứng từ POD:</strong> 1) Chụp rõ nhãn mã vạch vận đơn PKG-* • 2) Chụp toàn cảnh kiện hàng tại điểm bàn giao (Kho / Cổng KCN / Bàn lễ tân).
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                Ảnh chụp thực tế kiện hàng rõ mã vận đơn &amp; điểm giao (Bắt buộc)
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 8,
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  background: 'rgba(2, 132, 199, 0.12)',
                  color: '#0284c7',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Upload size={13} /> Tải ảnh thực tế từ máy
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>

            {proofImageUrl ? (
              <div
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border,
                  background: '#020617',
                  position: 'relative'
                }}
              >
                <img
                  src={proofImageUrl}
                  alt={`Ảnh xác thực giao hàng ${item.itemCode}`}
                  style={{ width: '100%', maxHeight: 195, objectFit: 'cover', display: 'block' }}
                />
                {/* Geotag Watermark Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 10px',
                    background: 'linear-gradient(transparent, rgba(2, 6, 23, 0.92))',
                    color: '#ffffff',
                    fontSize: '0.67rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    pointerEvents: 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>📍 GPS: {item.deliveryLat ? `${item.deliveryLat.toFixed(5)}, ${item.deliveryLng.toFixed(5)}` : '21.11680, 105.96120'}</div>
                    <div style={{ opacity: 0.85 }}>Mã: {item.itemCode} • Bưu cục: {item.hubCode}</div>
                  </div>
                  <div style={{ textAlign: 'right', opacity: 0.85 }}>
                    <div>{new Date().toLocaleTimeString('vi-VN')} · {new Date().toLocaleDateString('vi-VN')}</div>
                    <div style={{ color: '#34d399', fontWeight: 800 }}>✓ Geotag Timestamp Valid</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProofImageUrl('')}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '4px 9px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#f8fafc',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Xóa ảnh để chụp lại
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: 18,
                  borderRadius: 12,
                  border: '1px dashed #ef4444',
                  background: 'rgba(239, 68, 68, 0.08)',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#ef4444'
                }}
              >
                <ImagePlus size={22} style={{ margin: '0 auto 6px' }} />
                Chưa có ảnh xác thực giao hàng. Chọn mẫu chụp bên dưới hoặc tải ảnh từ điện thoại Shipper.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {SAMPLE_POD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setProofImageUrl(preset.url);
                    setProofImageCaption(preset.caption);
                    setErrorMsg('');
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    border,
                    background: subtleBg,
                    color: textPrimary,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📷 {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Handover Method + Cold-Chain Temp + OTP & e-Signature */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: 6 }}>
                <UserCheck size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#059669' }} />
                Hình thức bàn giao tại điểm nhận
              </label>
              <div data-testid="pod-handover-methods" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {HANDOVER_METHODS.map((m) => {
                  const active = handoverMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setHandoverMethod(m.id)}
                      style={{
                        padding: '6px 11px',
                        borderRadius: 9,
                        border: active ? '1.5px solid #059669' : border,
                        background: active ? 'rgba(16, 185, 129, 0.14)' : subtleBg,
                        color: active ? '#059669' : textPrimary,
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {item.requiresColdChain && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(2, 132, 199, 0.09)',
                  border: '1px solid rgba(2, 132, 199, 0.35)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div style={{ fontSize: '0.75rem' }}>
                  <div style={{ fontWeight: 800, color: '#0284c7' }}>
                    <Snowflake size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                    Kiểm tra nhiệt độ thùng bảo ôn khi mở niêm phong (°C)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: textMuted }}>
                    Ngưỡng yêu cầu của chủ hàng: {item.requiredTempC}°C (±2°C)
                  </div>
                </div>
                <input
                  type="number"
                  step="0.1"
                  data-testid="input-pod-temp-c"
                  aria-label="Nhiệt độ kiểm tra khi bàn giao (°C)"
                  value={measuredTempC}
                  onChange={(e) => setMeasuredTempC(e.target.value)}
                  style={{
                    width: 96,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(2, 132, 199, 0.45)',
                    background: cardBg,
                    color: textPrimary,
                    fontSize: '0.84rem',
                    fontWeight: 800
                  }}
                />
              </div>
            )}

            {/* OTP + Electronic Signature Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, marginBottom: 4 }}>
                  <KeyRound size={12} style={{ verticalAlign: '-2px', marginRight: 4, color: '#7c3aed' }} />
                  Mã OTP người nhận (Đơn giá trị cao / Y tế)
                </label>
                <input
                  type="text"
                  data-testid="input-pod-otp"
                  placeholder={item.recipientOtpCode ? `Nhập mã OTP (Mã đối chiếu: ${item.recipientOtpCode})` : 'Nhập OTP 4 số (nếu có)'}
                  value={recipientOtpInput}
                  onChange={(e) => setRecipientOtpInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 11px',
                    borderRadius: 9,
                    border,
                    background: subtleBg,
                    color: textPrimary,
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, marginBottom: 4 }}>
                  <PenTool size={12} style={{ verticalAlign: '-2px', marginRight: 4, color: '#059669' }} />
                  Chữ ký điện tử người nhận (e-Signature)
                </label>
                <button
                  type="button"
                  aria-pressed={eSigned}
                  onClick={() => setESigned((v) => !v)}
                  style={{
                    width: '100%',
                    padding: '8px 11px',
                    borderRadius: 9,
                    border: eSigned ? '1.5px solid #10b981' : border,
                    background: eSigned ? 'rgba(16, 185, 129, 0.12)' : subtleBg,
                    color: eSigned ? '#059669' : textMuted,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {eSigned ? '✓ Khách đã ký xác nhận điện tử trên màn hình' : 'Nhấn để thu chữ ký điện tử khách hàng'}
                </button>
              </div>
            </div>
          </div>

          {/* Recipient Signer + Relationship + Caption */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: 4 }}>
                Người ký nhận hàng tại điểm giao
              </label>
              <input
                type="text"
                value={recipientPodName}
                onChange={(e) => setRecipientPodName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 9,
                  border,
                  background: subtleBg,
                  color: textPrimary,
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: 6 }}>
                <UserCheck size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#7c3aed' }} />
                Mối quan hệ người nhận với chủ đơn hàng
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RECIPIENT_RELATIONSHIPS.map((r) => {
                  const active = recipientRelationship === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRecipientRelationship(r.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: active ? '1.5px solid #7c3aed' : border,
                        background: active ? 'rgba(124, 58, 237, 0.14)' : subtleBg,
                        color: active ? '#7c3aed' : textPrimary,
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: 4 }}>
                Ghi chú bàn giao hiện trường
              </label>
              <input
                type="text"
                value={proofImageCaption}
                onChange={(e) => setProofImageCaption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 9,
                  border,
                  background: subtleBg,
                  color: textPrimary,
                  fontSize: '0.82rem'
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 9,
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                fontSize: '0.76rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 7
              }}
            >
              <ShieldAlert size={16} />
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border,
                background: subtleBg,
                color: textPrimary,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              data-testid="btn-confirm-photo-pod"
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CheckCircle2 size={15} />
              {codAmount > 0
                ? `Xác nhận Đã thu ${formatVnd(codAmount)} & Hoàn tất POD`
                : 'Hoàn tất Giao hàng & Lưu Ảnh POD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
