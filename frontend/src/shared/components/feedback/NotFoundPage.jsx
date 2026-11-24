import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Home,
  LifeBuoy,
  LogIn,
  Navigation,
  Radio,
  Truck,
  Building2,
  Package,
  BarChart3,
} from 'lucide-react';
import { useAuth, getDefaultPortalPath } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import CcadroLogo from '../ui/CcadroLogo';
import ErrorReportModal from './ErrorReportModal';
import SearchField from '../search/SearchField';

const QUICK_PORTALS = [
  { path: '/driver', icon: Truck, label: 'Khoang Lái Tài Xế', role: 'DRIVER', color: '#10b981' },
  { path: '/customer', icon: Building2, label: 'Cổng Khách Hàng B2B', role: 'CUSTOMER', color: '#0ea5e9' },
  { path: '/shipper', icon: Package, label: 'Cổng Hub & Shipper', role: 'SHIPPER', color: '#f59e0b' },
  { path: '/portal', icon: BarChart3, label: 'Trung Tâm Điều Hành SOC', role: 'INTERNAL', color: '#a855f7' }
];

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const myPortalPath = user ? getDefaultPortalPath(user) : '/login';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (q.includes('driver') || q.includes('tài xế') || q.includes('lai')) {
      navigate('/driver');
    } else if (q.includes('cust') || q.includes('khach') || q.includes('b2b')) {
      navigate('/customer');
    } else if (q.includes('ship') || q.includes('hub')) {
      navigate('/shipper');
    } else if (q.includes('admin') || q.includes('portal') || q.includes('dieu hanh')) {
      navigate('/portal');
    } else if (q.includes('carbon') || q.includes('phat thai')) {
      navigate('/thong-ke-carbon');
    } else if (q.includes('login') || q.includes('dang nhap')) {
      navigate('/login');
    } else {
      navigate('/');
    }
  };

  return (
    <main
      data-testid="not-found-page"
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        background: isDark
          ? 'radial-gradient(circle at 50% 25%, #0f1c33 0%, #070a13 65%, #03060d 100%)'
          : 'radial-gradient(circle at 50% 25%, #f1f5f9 0%, #ffffff 70%)',
        color: isDark ? '#f8fafc' : '#0f172a',
        overflow: 'hidden'
      }}
    >
      {/* Decorative High-Tech Grid & Radar Radar Sweep */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: isDark
            ? 'linear-gradient(to right, rgba(16, 185, 129, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.04) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
          zIndex: 0
        }}
      />

      {/* Top Brand Navigation */}
      <header
        style={{
          width: '100%',
          maxWidth: 1120,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <CcadroLogo size={38} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.08rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              CCADRO
            </div>
            <div style={{ fontSize: '0.62rem', color: '#10b981', letterSpacing: '0.1em', fontWeight: 800 }}>
              GREEN SUPPLY CHAIN PLATFORM
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: '0.82rem',
              fontWeight: 700,
              background: isDark ? 'rgba(239, 68, 68, 0.14)' : '#fee2e2',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fca5a5',
              color: isDark ? '#fca5a5' : '#b91c1c',
              cursor: 'pointer'
            }}
          >
            <LifeBuoy size={14} /> Báo cáo sự cố (SOC)
          </button>

          {user ? (
            <Link
              to={myPortalPath}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 700,
                background: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.38)' : '1px solid #a7f3d0',
                color: isDark ? '#6ee7b7' : '#047857',
                textDecoration: 'none'
              }}
            >
              Về Phân Hệ ({user.role})
            </Link>
          ) : (
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: '0.82rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <LogIn size={14} /> Đăng nhập
            </Link>
          )}
        </div>
      </header>

      {/* Main Radar 404 Hero Visual & Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 880,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* Animated Sonar / Radar Graphic */}
        <div
          style={{
            position: 'relative',
            width: 170,
            height: 170,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Pulsing Sonar Rings */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(16, 185, 129, 0.25)',
              animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 24,
              borderRadius: '50%',
              border: '1.5px dashed rgba(16, 185, 129, 0.45)',
              background: isDark ? 'rgba(6, 78, 59, 0.15)' : 'rgba(16, 185, 129, 0.08)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 48,
              borderRadius: '50%',
              border: '1px solid rgba(14, 165, 233, 0.5)',
              background: isDark ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Compass size={38} color="#10b981" />
          </div>

          {/* Floating Beacon Tag */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 4,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#f87171',
              fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Radio size={11} /> SIGNAL_LOST
          </div>
        </div>

        {/* 404 Header & Telemetry Tags */}
        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 'clamp(4.2rem, 11vw, 7.5rem)',
              fontWeight: 900,
              lineHeight: 0.9,
              margin: 0,
              letterSpacing: '-0.05em',
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 45%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: isDark ? 'drop-shadow(0 10px 28px rgba(16, 185, 129, 0.35))' : 'none'
            }}
          >
            404
          </p>
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 2.1rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 10px',
            color: isDark ? '#ffffff' : '#0f172a'
          }}
        >
          Không tìm thấy trang
        </h1>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 999,
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #fde68a',
            color: isDark ? '#fbbf24' : '#b45309',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: 16
          }}
        >
          <Navigation size={13} /> Lệch Tuyến Vận Tải (Route Deviation Detected)
        </div>

        <p
          style={{
            maxWidth: 620,
            fontSize: '0.96rem',
            lineHeight: 1.6,
            color: isDark ? '#cbd5e1' : '#475569',
            margin: '0 0 24px'
          }}
        >
          Đường dẫn <code>{currentPath}</code> không tồn tại trên hải đồ điều vận CCADRO hoặc đã được cấu hình sang phân
          hệ bảo mật khác. Vui lòng kiểm tra lại địa chỉ hoặc chọn phân hệ bên dưới để tiếp tục hành trình.
        </p>

        {/* Real-time Telemetry HUD Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            padding: '16px 20px',
            borderRadius: 16,
            background: isDark ? 'rgba(15, 23, 42, 0.82)' : '#ffffff',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: isDark
              ? '0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
              : '0 12px 30px -8px rgba(15, 23, 42, 0.08)',
            marginBottom: 28,
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.8rem',
            display: 'grid',
            gap: 8,
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>● HỆ THỐNG ĐIỀU PHỐI LOGISTICS XANH:</span>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>GLEC v3 • ISO 14083 NET-ZERO</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Tọa độ tham chiếu cảng:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>10.7769° N, 106.7009° E (Cảng Cát Lái, TP.HCM)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Trạng thái xác thực phiên:</span>
            <span>
              {user ? (
                <strong style={{ color: '#10b981' }}>ĐÃ XÁC THỰC (@{user.username} • {user.role})</strong>
              ) : (
                <strong style={{ color: '#f59e0b' }}>CHƯA ĐĂNG NHẬP (KHÁCH VÔ DANH)</strong>
              )}
            </span>
          </div>
        </div>

        {/* Quick Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            width: '100%',
            maxWidth: 540,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 28
          }}
        >
          <SearchField
            label="Tìm phân hệ"
            hideLabel
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Tài xế, khách hàng, carbon hoặc hub…"
            style={{ flex: '1 1 240px' }}
          />
          <button
            type="submit"
            style={{
              minHeight: 46,
              padding: '7px 14px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Đi Tới
          </button>
        </form>

        {/* Primary Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 32
          }}
        >
          {user ? (
            <Link
              to={myPortalPath}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 12,
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 22px -4px rgba(16, 185, 129, 0.5)'
              }}
            >
              <Navigation size={17} /> Về Phân Hệ Làm Việc Của Tôi ({user.role})
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 12,
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 22px -4px rgba(16, 185, 129, 0.5)'
              }}
            >
              <LogIn size={17} /> Đăng Nhập Hệ Thống
            </Link>
          )}

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: '0.92rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            <Home size={17} /> Về Trang Chủ
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
              fontSize: '0.92rem',
              fontWeight: 600,
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fca5a5',
              color: isDark ? '#fca5a5' : '#b91c1c',
              cursor: 'pointer'
            }}
          >
            <LifeBuoy size={17} /> Báo Cáo Sự Cố Cho SOC
          </button>
        </div>

        {/* Quick Portal Switcher Grid */}
        <div style={{ width: '100%', maxWidth: 780 }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: 12
            }}
          >
            Cổng Truy Cập Trực Tiếp Các Phân Hệ Vận Hành
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12
            }}
          >
            {QUICK_PORTALS.map((item) => {
              const IconComp = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isDark ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                    color: 'inherit',
                    textDecoration: 'none',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${item.color}20`,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <IconComp size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b' }}>{item.path}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modern Footer with Technical Status */}
      <footer
        style={{
          width: '100%',
          maxWidth: 1120,
          margin: '30px auto 0',
          paddingTop: 16,
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: isDark ? '#94a3b8' : '#64748b',
          flexWrap: 'wrap',
          gap: 12,
          position: 'relative',
          zIndex: 1
        }}
      >
        <div>© {new Date().getFullYear()} CCADRO Smart Logistics Tracker. Tất cả các quyền được bảo lưu.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            Mạng Lưới IoT & Fleet Hoạt Động Bình Thường
          </span>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#10b981',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Trung Tâm Hỗ Trợ Kỹ Thuật
          </button>
        </div>
      </footer>

      {/* Incident / Error Reporting Modal */}
      <ErrorReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        initialCategory="ROUTE_404"
        contextPath={currentPath}
      />
    </main>
  );
}
