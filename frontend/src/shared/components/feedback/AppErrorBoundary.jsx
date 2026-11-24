import React, { Component } from 'react';
import {
  Home,
  LifeBuoy,
  LogIn,
  RefreshCw,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import CcadroLogo from '../ui/CcadroLogo';
import ErrorReportModal from './ErrorReportModal';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReportModalOpen: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Ghi nhận nội bộ ra console dev, không bao giờ in ra màn hình người dùng
    if (process.env.NODE_ENV !== 'production') {
      console.error('CCADRO Boundary Captured Exception:', error, errorInfo);
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleResetAndLogin = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('ccadro_token');
        window.localStorage.removeItem('ccadro_refresh_token');
        window.localStorage.removeItem('ccadro_user');
      } catch (_) {
        // ignore
      }
      window.location.href = '/login';
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, isReportModalOpen } = this.state;

    return (
      <div
        role="alert"
        aria-label="Lỗi hệ thống bất thường"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          background: 'radial-gradient(circle at 50% 20%, #161226 0%, #0a0814 60%, #05030a 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Subtle background ambient aura */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'radial-gradient(circle at 50% 15%, rgba(239, 68, 68, 0.1) 0%, transparent 60%)',
            zIndex: 0
          }}
        />

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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <CcadroLogo size={36} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fff' }}>
                CCADRO
              </div>
              <div style={{ fontSize: '0.62rem', color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                Green Supply Chain
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}
          >
            <ShieldAlert size={14} style={{ color: '#ef4444' }} />
            <span>TẠM DỪNG TIẾN TRÌNH AN TOÀN</span>
          </div>
        </header>

        {/* Center Critical Crash HUD */}
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
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0.04) 70%)',
              border: '1px solid rgba(239, 68, 68, 0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 0 35px -8px rgba(239, 68, 68, 0.45)'
            }}
          >
            <ShieldAlert size={42} color="#ef4444" />
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              marginBottom: 12,
              color: '#ffffff'
            }}
          >
            Hệ Thống Đã Kích Hoạt Chế Độ Cách Ly An Toàn
          </h1>

          <p
            style={{
              fontSize: '0.96rem',
              color: '#94a3b8',
              maxWidth: 580,
              lineHeight: 1.65,
              marginBottom: 28
            }}
          >
            Ứng dụng vừa ghi nhận gián đoạn hiển thị tạm thời. Để bảo vệ dữ liệu phiên làm việc và bảo toàn tính toàn vẹn của hệ thống điều phối, tiến trình đã được dừng an toàn. Quý khách vui lòng tải lại trang hoặc đăng nhập lại.
          </p>

          {/* Action Button Strip */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'center',
              marginBottom: 28
            }}
          >
            <button
              type="button"
              onClick={this.handleReload}
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
                cursor: 'pointer',
                boxShadow: '0 10px 24px -6px rgba(16, 185, 129, 0.45)'
              }}
            >
              <RefreshCw size={16} /> Tải lại trang an toàn
            </button>

            <button
              type="button"
              onClick={this.handleResetAndLogin}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <LogIn size={16} /> Xóa phiên & Đăng nhập lại
            </button>

            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none'
              }}
            >
              <Home size={16} /> Về trang chủ
            </a>

            <button
              type="button"
              onClick={() => this.setState({ isReportModalOpen: true })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <LifeBuoy size={16} /> Báo cáo sự cố
            </button>
          </div>

          {/* User Reassurance Card - NO code or stack traces exposed! */}
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={28} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#f8fafc', marginBottom: 4 }}>
                Dữ Liệu Khách Hàng Luôn Được Bảo Vệ
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Tất cả chứng từ số, tọa độ GPS và thông tin tài khoản được lưu trữ phân tán an toàn trên cụm máy chủ bảo mật.
              </div>
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
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.75rem',
            color: '#64748b',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div>CCADRO Green Supply Chain Platform • Hệ Thống Quản Trị Chuỗi Cung Ứng Xanh</div>
          <div>Mã hỗ trợ kỹ thuật: #REC-SEC-SAFE</div>
        </footer>

        {/* Incident Reporting Modal */}
        <ErrorReportModal
          isOpen={isReportModalOpen}
          onClose={() => this.setState({ isReportModalOpen: false })}
          initialCategory="GATEWAY_500"
          initialError={error}
          contextPath={typeof window !== 'undefined' ? window.location.pathname : '/'}
        />
      </div>
    );
  }
}
