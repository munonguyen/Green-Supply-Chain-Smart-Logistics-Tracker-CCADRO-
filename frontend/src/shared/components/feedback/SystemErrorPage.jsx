import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Headphones,
  Home,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import CcadroLogo from '../ui/CcadroLogo';
import ErrorReportModal from './ErrorReportModal';

export default function SystemErrorPage({
  errorCode = '500',
  errorTitle = 'Dịch Vụ Tạm Thời Gián Đoạn Kết Nối',
  errorSubtitle = 'Hệ thống đang được bảo trì định kỳ hoặc kết nối máy chủ tạm thời không ổn định. Quý khách vui lòng thử kết nối lại hoặc quay về trang chủ.'
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const handleRetryConnection = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/actuator/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
      });
      if (res.ok) {
        setCheckResult({ success: true, message: 'Kết nối máy chủ đã phục hồi thành công!' });
        setTimeout(() => {
          navigate(user ? '/portal' : '/');
        }, 1200);
      } else {
        setCheckResult({ success: false, message: 'Máy chủ đang trong quá trình khởi động lại. Vui lòng chờ trong giây lát.' });
      }
    } catch (_) {
      setCheckResult({ success: false, message: 'Đường truyền chưa ổn định. Vui lòng thử lại sau ít phút.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      role="main"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        background: isDark
          ? 'radial-gradient(circle at 50% 20%, #111827 0%, #070a13 65%, #03050a 100%)'
          : 'radial-gradient(circle at 50% 20%, #f8fafc 0%, #edf2f7 70%)',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <header
        style={{
          width: '100%',
          maxWidth: 1080,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
          <CcadroLogo size={36} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>CCADRO</div>
            <div style={{ fontSize: '0.62rem', color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Green Supply Chain
            </div>
          </div>
        </Link>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#f59e0b',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
        >
          <Clock size={14} />
          <span>HỆ THỐNG ĐANG BẢO TRÌ TẠM THỜI</span>
        </div>
      </header>

      {/* Main Friendly Status Hub */}
      <main
        style={{
          maxWidth: 760,
          width: '100%',
          margin: '36px auto',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.04) 70%)',
            border: '1px solid rgba(16, 185, 129, 0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 0 35px -8px rgba(16, 185, 129, 0.4)'
          }}
        >
          <ShieldCheck size={42} color="#10b981" />
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.6rem, 3.8vw, 2.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 12,
            color: isDark ? '#ffffff' : '#0f172a'
          }}
        >
          {errorTitle}
        </h1>

        <p
          style={{
            fontSize: '0.98rem',
            color: isDark ? '#cbd5e1' : '#475569',
            maxWidth: 580,
            lineHeight: 1.65,
            marginBottom: 28
          }}
        >
          {errorSubtitle}
        </p>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
          <button
            type="button"
            aria-label="Kiểm tra lại kết nối"
            onClick={handleRetryConnection}
            disabled={checking}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: checking ? 'not-allowed' : 'pointer',
              opacity: checking ? 0.75 : 1,
              boxShadow: '0 10px 24px -6px rgba(16, 185, 129, 0.45)',
              transition: 'transform 0.15s ease'
            }}
          >
            <RefreshCw size={16} className={checking ? 'spin-anim' : ''} />
            <span>{checking ? 'Đang kiểm tra kết nối...' : 'Kiểm tra lại kết nối'}</span>
          </button>

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 12,
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              color: 'inherit',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(0, 0, 0, 0.12)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            <Home size={16} /> Về trang chủ
          </Link>

          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 12,
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <LifeBuoy size={16} /> Báo cáo sự cố
          </button>
        </div>

        {/* Retry Result Feedback */}
        {checkResult && (
          <div
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: checkResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: checkResult.success ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
              color: checkResult.success ? '#10b981' : '#f59e0b'
            }}
          >
            {checkResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{checkResult.message}</span>
          </div>
        )}

        {/* User-Friendly Operational Assurance Cards (NO technical code or ports!) */}
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            marginTop: 12
          }}
        >
          <div
            style={{
              padding: '18px 16px',
              borderRadius: 14,
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#10b981' }}>
              <ShieldCheck size={20} />
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                Bảo Mật Dữ Liệu
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
              Mọi vận đơn, dữ liệu hành trình và chứng từ ePOD được bảo vệ và mã hóa toàn vẹn.
            </p>
          </div>

          <div
            style={{
              padding: '18px 16px',
              borderRadius: 14,
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#38bdf8' }}>
              <Clock size={20} />
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                Tự Động Phục Hồi
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
              Tiến trình đồng bộ đang được khôi phục tự động trong ít phút. Quý khách vui lòng thử lại sau.
            </p>
          </div>

          <div
            style={{
              padding: '18px 16px',
              borderRadius: 14,
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#f59e0b' }}>
              <Headphones size={20} />
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                Hỗ Trợ Khẩn Cấp
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.5 }}>
              Nếu cần hỗ trợ điều xe gấp, vui lòng sử dụng nút Báo cáo sự cố hoặc liên hệ quản trị viên.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          maxWidth: 1080,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 16,
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          fontSize: '0.75rem',
          color: isDark ? '#64748b' : '#94a3b8'
        }}
      >
        <div>CCADRO Green Supply Chain • Nền Tảng Quản Trị Chuỗi Cung Ứng & Vận Tải Xanh</div>
        <div>Mã tham chiếu: #{errorCode}-SUPPORT</div>
      </footer>

      {/* Error Report Modal */}
      <ErrorReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        initialCategory="GATEWAY_500"
        contextPath={typeof window !== 'undefined' ? window.location.pathname : '/'}
      />
    </div>
  );
}
