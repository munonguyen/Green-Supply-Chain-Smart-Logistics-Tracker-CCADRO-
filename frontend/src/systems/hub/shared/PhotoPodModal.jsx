import React, { useState } from 'react';
import { Camera, CheckCircle2, ImagePlus, ShieldAlert, Upload, X } from 'lucide-react';
import { SAMPLE_POD_IMAGE_SVG, SAMPLE_POD_PRESETS } from './hubShipperSeedData';

export default function PhotoPodModal({
  item,
  policy,
  isDark,
  onClose,
  onConfirmPod
}) {
  const [proofImageUrl, setProofImageUrl] = useState(item?.proofImageUrl || SAMPLE_POD_IMAGE_SVG);
  const [proofImageCaption, setProofImageCaption] = useState(
    item?.proofImageCaption ||
      `Đã giao đủ ${item?.parcelCount || 1} kiện (${item?.itemCode}) tại ${item?.consigneeName}`
  );
  const [recipientPodName, setRecipientPodName] = useState(
    item?.recipientPodName || `${item?.consigneeName || 'Người nhận'} (Đã ký nhận POD)`
  );
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
      setErrorMsg('Chính sách Trụ sở yêu cầu bắt buộc có hình ảnh chụp thực tế kiện hàng trước khi hoàn tất!');
      return;
    }
    if (!recipientPodName?.trim()) {
      setErrorMsg('Vui lòng nhập tên người ký nhận hàng tại điểm giao.');
      return;
    }
    onConfirmPod({
      itemCode: item.itemCode,
      dispatchStatus: 'DELIVERED_POD',
      proofImageUrl: proofImageUrl.trim(),
      proofImageCaption: proofImageCaption.trim(),
      recipientPodName: recipientPodName.trim()
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
        zIndex: 95,
        background: 'rgba(2, 6, 23, 0.68)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: cardBg,
          color: textPrimary,
          borderRadius: 18,
          border,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)'
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
                Xác Thực Giao Hàng & Ảnh Bằng Chứng POD
              </div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                Mã kiện: {item.itemCode} • Trụ sở {item.hubCode}
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

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Policy Alert */}
          <div
            style={{
              padding: '10px 13px',
              borderRadius: 11,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              fontSize: '0.76rem',
              color: isDark ? '#a7f3d0' : '#065f46'
            }}
          >
            <strong>Chính sách Photo POD Trụ sở:</strong>{' '}
            {policy?.photoPodRule ||
              'Bắt buộc chụp ảnh thực tế kiện hàng tại điểm giao rõ tem mã kiện trước khi hoàn tất.'}
          </div>

          {/* Item Sender / Receiver Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10
            }}
          >
            <div style={{ padding: 10, borderRadius: 10, background: subtleBg, border, fontSize: '0.75rem' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: 800, color: textMuted }}>NGƯỜI GỬI</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>{item.senderName || 'Kho Chủ hàng CCADRO'}</div>
              <div style={{ color: textMuted }}>{item.senderAddress}</div>
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: subtleBg, border, fontSize: '0.75rem' }}>
              <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#059669' }}>NGƯỜI NHẬN & ĐỊA ĐIỂM</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>{item.consigneeName}</div>
              <div style={{ color: textMuted }}>{item.deliveryAddress}</div>
            </div>
          </div>

          {/* Photo Preview + Upload */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                Hình ảnh xác thực đã giao (Bắt buộc)
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
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
                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                />
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
                  padding: 20,
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

            {/* Quick Sample Camera Shots for Demo */}
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

          {/* Recipient Signer + Caption */}
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: 4 }}>
                Mô tả ảnh bằng chứng / Ghi chú hiện trường
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
              Hoàn tất Giao hàng & Lưu Ảnh POD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

