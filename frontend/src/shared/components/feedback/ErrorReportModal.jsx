import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Send,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import CcadroLogo from '../ui/CcadroLogo';

const INCIDENT_CATEGORIES = [
  { id: 'ROUTE_404', label: 'Mất tín hiệu điều hướng / Trang 404 (Route Deviation)', priority: 'P2' },
  { id: 'AUTH_EXPIRY', label: 'Lỗi phiên đăng nhập / Token hết hạn hoặc Blacklist', priority: 'P2' },
  { id: 'ROLE_MISMATCH', label: 'Cảnh báo cô lập vai trò / Không có quyền truy cập', priority: 'P3' },
  { id: 'GPS_SIGNAL', label: 'Mất tọa độ GPS / Cảm biến nhiệt độ IoT cont lạnh', priority: 'P1' },
  { id: 'CONTAINER_POD', label: 'Sự cố bàn giao hàng / Ký nhận ePOD & ảnh hiện trường', priority: 'P1' },
  { id: 'GATEWAY_500', label: 'Trục trặc máy chủ nội bộ / Gián đoạn kết nối Gateway', priority: 'P1' },
  { id: 'OTHER', label: 'Vấn đề giao diện hoặc nghiệp vụ khác', priority: 'P3' }
];

export default function ErrorReportModal({
  isOpen,
  onClose,
  initialCategory = 'ROUTE_404',
  initialError = null,
  contextPath = typeof window !== 'undefined' ? window.location.pathname : '/'
}) {
  let user = null;
  let token = null;
  try {
    const auth = useAuth();
    user = auth?.user;
    token = auth?.token;
  } catch (_) {
    // An toàn khi mở modal từ bên ngoài AuthProvider (ví dụ AppErrorBoundary)
    try {
      user = JSON.parse(window.localStorage.getItem('ccadro_user') || 'null');
      token = window.localStorage.getItem('ccadro_token') || null;
    } catch (_) { /* Diagnostic copy is optional. */ }
  }

  let isDark = true;
  try {
    const theme = useTheme();
    isDark = theme?.isDark ?? true;
  } catch (_) {
    isDark = true;
  }

  const [category, setCategory] = useState(initialCategory);
  const [urgency, setUrgency] = useState('P2');
  const [title, setTitle] = useState(
    initialError?.message ? `Sự cố: ${initialError.message.slice(0, 80)}` : 'Báo cáo sự cố điều hướng / phân hệ'
  );
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(user?.email || user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const diagnosticPayload = {
    ticketId: submittedTicket || `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: new Date().toISOString(),
    vnTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    url: typeof window !== 'undefined' ? window.location.href : contextPath,
    path: contextPath,
    category,
    urgency,
    account: {
      username: user?.username || 'ANONYMOUS',
      role: user?.role || 'UNAUTHENTICATED',
      portalType: user?.portalType || 'PUBLIC',
      hasToken: Boolean(token)
    },
    clientEnvironment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
      onlineStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE'
    },
    errorStack: initialError?.stack || initialError?.message || null
  };

  const handleCopyTelemetry = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      // ignore
    }
  };

  const handleDownloadDiagnostic = () => {
    try {
      const blob = new Blob([JSON.stringify(diagnosticPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ccadro-incident-${diagnosticPayload.ticketId.toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      // ignore
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const generatedId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const savedReport = {
        ...diagnosticPayload,
        ticketId: generatedId,
        title,
        description,
        contactInfo
      };

      try {
        const stored = JSON.parse(window.localStorage.getItem('ccadro_incident_reports_v1') || '[]');
        stored.unshift(savedReport);
        window.localStorage.setItem('ccadro_incident_reports_v1', JSON.stringify(stored.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('ccadro-incident-reported', { detail: savedReport }));
      } catch (_) {
        // ignore
      }

      setSubmittedTicket(generatedId);
      setSubmitting(false);
    }, 600);
  };

  const handleResetAndClose = () => {
    setSubmittedTicket(null);
    setDescription('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(3, 7, 18, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 22,
          background: isDark
            ? 'linear-gradient(165deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 14, 26, 0.98) 100%)'
            : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 100%)',
          border: isDark ? '1px solid rgba(16, 185, 129, 0.32)' : '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: isDark
            ? '0 28px 70px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.12)'
            : '0 25px 60px -12px rgba(15, 23, 42, 0.18)',
          color: isDark ? '#f8fafc' : '#0f172a',
          padding: '28px 24px'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CcadroLogo size={36} />
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#10b981',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}
              >
                CCADRO SOC • INCIDENT DISPATCH
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {submittedTicket ? 'Phiếu Báo Cáo Sự Cố Đã Gửi' : 'Báo Cáo Sự Cố & Trục Trặc Hệ Thống'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {submittedTicket ? (
          /* Submission Success View */
          <div style={{ textAlign: 'center', padding: '16px 8px 12px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>
              Báo Cáo Sự Cố Tiếp Nhận Thành Công!
            </h3>
            <p style={{ fontSize: '0.88rem', color: isDark ? '#cbd5e1' : '#475569', margin: '0 0 18px' }}>
              Mã hồ sơ sự cố của bạn đã được chuyển tới Trung tâm Điều hành Vận tải & An ninh Mạng CCADRO (SOC):
            </p>

            <div
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                borderRadius: 12,
                background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                border: '1px solid rgba(16, 185, 129, 0.38)',
                color: '#10b981',
                fontSize: '1.1rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                fontFamily: 'ui-monospace, monospace',
                marginBottom: 20
              }}
            >
              {submittedTicket}
            </div>

            <p style={{ fontSize: '0.82rem', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 24px' }}>
              Đội kỹ thuật và điều phối viên đang xử lý. Dữ liệu chẩn đoán telemetry đã được đính kèm tự động.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleDownloadDiagnostic}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} /> Tải Gói Chẩn Đoán (.JSON)
              </button>

              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 22px',
                  borderRadius: 10,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.5)'
                }}
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        ) : (
          /* Report Submission Form */
          <form onSubmit={handleSubmit}>
            {/* Auto-Captured Telemetry Banner */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: isDark ? 'rgba(15, 23, 42, 0.72)' : '#f8fafc',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(15, 23, 42, 0.08)',
                fontSize: '0.78rem',
                display: 'grid',
                gap: 6,
                marginBottom: 18,
                fontFamily: 'ui-monospace, monospace'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>● TELEMETRY TỰ ĐỘNG GHI NHẬN:</span>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{diagnosticPayload.vnTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>Đường dẫn (URL Route):</span>
                <strong style={{ color: '#38bdf8' }}>{contextPath}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span>Tài khoản / Vai trò:</span>
                <span>
                  @{user?.username || 'khách'} ({user?.role || 'Chưa đăng nhập'})
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label
                  htmlFor="incident-category"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}
                >
                  Phân Loại Sự Cố <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="incident-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isDark ? '#0b1324' : '#ffffff',
                    border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                >
                  {INCIDENT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                <div>
                  <label
                    htmlFor="incident-title"
                    style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}
                  >
                    Tiêu Đề Tóm Tắt <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="incident-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mô tả ngắn gọn sự cố..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isDark ? '#0b1324' : '#ffffff',
                      border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                      color: isDark ? '#ffffff' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="incident-urgency"
                    style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}
                  >
                    Mức Độ Ưu Tiên
                  </label>
                  <select
                    id="incident-urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isDark ? '#0b1324' : '#ffffff',
                      border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                      color: urgency === 'P1' ? '#ef4444' : isDark ? '#ffffff' : '#0f172a',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  >
                    <option value="P3">P3 • Bình thường</option>
                    <option value="P2">P2 • Quan trọng</option>
                    <option value="P1">P1 • Khẩn cấp SOS</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="incident-description"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}
                >
                  Mô Tả Chi Tiết Vấn Đề Gặp Phải
                </label>
                <textarea
                  id="incident-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Đang di chuyển container trên cung đường thì màn hình báo 404 mất link, hoặc không đăng nhập được tài xế..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isDark ? '#0b1324' : '#ffffff',
                    border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="incident-contact"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}
                >
                  Thông Tin Liên Hệ (SĐT hoặc Email phản hồi)
                </label>
                <input
                  id="incident-contact"
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="09xx xxx xxx hoặc email..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isDark ? '#0b1324' : '#ffffff',
                    border: isDark ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid #cbd5e1',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 22,
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={handleCopyTelemetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 14px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                  color: isDark ? '#f8fafc' : '#334155',
                  cursor: 'pointer'
                }}
              >
                <Copy size={14} /> {copied ? 'Đã sao chép gói tin!' : 'Sao chép gói chẩn đoán JSON'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'transparent',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                    color: isDark ? '#cbd5e1' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.5)'
                  }}
                >
                  <Send size={15} /> {submitting ? 'Đang gửi...' : 'Gửi Tới Trung Tâm SOC'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
