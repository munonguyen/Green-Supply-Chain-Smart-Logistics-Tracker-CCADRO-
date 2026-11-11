import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Moon,
  Radar,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { useAuth, ENTERPRISE_ROLES, getDefaultPortalPath } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CcadroLogo from '../components/ui/CcadroLogo';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';
import '../styles/landing.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, registeredUsers } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [portalMode, setPortalMode] = useState('CUSTOMER'); // 'CUSTOMER' | 'INTERNAL'
  const [username, setUsername] = useState('shipper');
  const [password, setPassword] = useState('ccadro@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePortalSwitch = (mode) => {
    setPortalMode(mode);
    setError(null);
    if (mode === 'CUSTOMER') {
      setUsername('shipper');
      setPassword('ccadro@123');
    } else {
      setUsername('dispatcher');
      setPassword('ccadro@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      const destination = result?.redirectTo || getDefaultPortalPath(result?.user);
      navigate(destination);
    } catch (err) {
      setError(err.message || 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickAccount = (accUsername, accPassword = 'ccadro@123') => {
    setUsername(accUsername);
    setPassword(accPassword);
    setError(null);
  };

  const internalRoles = Object.values(ENTERPRISE_ROLES).filter((r) => r.portalType === 'INTERNAL');

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#f8fafc',
        overflow: 'hidden',
        background: '#04120e'
      }}
    >
      {/* Ambient video background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      >
        <video
          src={VIDEOS.portCorridor}
          poster={IMAGES.hero}
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: ' saturate(1.05) contrast(1.04) brightness(0.55)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(125deg, rgba(4, 18, 14, 0.92) 0%, rgba(6, 28, 22, 0.84) 50%, rgba(4, 18, 14, 0.94) 100%)'
          }}
        />
      </div>

      {/* Top Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1240,
          width: '100%',
          margin: '0 auto',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <CcadroLogo size={42} showText title="CCADRO" subtitle="GREEN SUPPLY CHAIN" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Chuyển chế độ giao diện"
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Link
            to="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 999,
              border: '1px solid rgba(110, 231, 183, 0.4)',
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#a7f3d0',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <UserPlus size={15} /> Đăng ký Khách hàng
          </Link>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Trang chủ
          </button>
        </div>
      </header>

      {/* Main Content Split Layout */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '12px 24px 36px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 36,
          alignItems: 'center'
        }}
      >
        {/* Left Column: Dual-System Overview */}
        <div style={{ paddingRight: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(110, 231, 183, 0.3)',
              color: '#6ee7b7',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 18
            }}
          >
            <span className="radar-dot" /> KIẾN TRÚC PHÂN TÁCH 2 HỆ THỐNG ĐỘC LẬP
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.85rem, 3.2vw, 2.65rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: 16,
              color: '#fff'
            }}
          >
            Cổng Xác Thực Tập Trung{' '}
            <span style={{ color: '#6ee7b7', fontStyle: 'italic' }}>Khách Hàng B2B</span> &amp;{' '}
            <span style={{ color: '#38bdf8' }}>Giám Sát Nội Bộ</span>
          </h1>

          <p
            style={{
              fontSize: '0.96rem',
              color: 'rgba(226, 232, 240, 0.82)',
              lineHeight: 1.65,
              marginBottom: 24
            }}
          >
            Hệ thống CCADRO phân tách hoàn toàn không gian làm việc giữa{' '}
            <strong>Khách hàng / Chủ hàng (Customer Portal)</strong> và{' '}
            <strong>Trung tâm Giám sát &amp; Điều độ Nội bộ (Internal Operations Center)</strong>{' '}
            nhằm đảm bảo bảo mật dữ liệu theo quy chuẩn ISO 27001 &amp; BRULE-16.
          </p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            <div
              onClick={() => handlePortalSwitch('CUSTOMER')}
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                background:
                  portalMode === 'CUSTOMER' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(15, 23, 42, 0.65)',
                border:
                  portalMode === 'CUSTOMER'
                    ? '1.5px solid #10b981'
                    : '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Building2 size={19} color="#34d399" />
                <strong style={{ fontSize: '0.96rem', color: '#fff' }}>
                  1. Hệ Thống Dành Riêng Cho Khách Hàng (/customer)
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.55 }}>
                Đặt lịch vận chuyển xanh trực tuyến, theo dõi GPS đơn hàng của riêng doanh nghiệp,
                tải chứng nhận phát thải CO2e chuẩn ISO 14083 và biên bản giao nhận điện tử ePOD.
              </p>
            </div>

            <div
              onClick={() => handlePortalSwitch('INTERNAL')}
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                background:
                  portalMode === 'INTERNAL' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 23, 42, 0.65)',
                border:
                  portalMode === 'INTERNAL'
                    ? '1.5px solid #38bdf8'
                    : '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Radar size={19} color="#38bdf8" />
                <strong style={{ fontSize: '0.96rem', color: '#fff' }}>
                  2. Hệ Thống Giám Sát &amp; Điều Hành Nội Bộ (/portal)
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.55 }}>
                Dành cho Điều phối viên NOC, Quản trị viên, Thanh tra An toàn &amp; Kiểm toán viên:
                giám sát lệch tuyến 50m/200m, phê duyệt lộ trình động, kiểm định xe Pre-trip và quản
                lý tài khoản đối tác.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              fontSize: '0.8rem',
              color: '#94a3b8'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} color="#34d399" /> Cô lập dữ liệu chủ hàng (BRULE-16)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#38bdf8" /> Xác thực phân quyền đa tầng RBAC
            </span>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div
          style={{
            background: 'rgba(9, 22, 18, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(110, 231, 183, 0.24)',
            borderRadius: 24,
            padding: '30px 28px',
            boxShadow: '0 28px 70px rgba(0, 0, 0, 0.55)'
          }}
        >
          {/* Portal Switch Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              padding: 5,
              borderRadius: 14,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 22
            }}
          >
            <button
              type="button"
              onClick={() => handlePortalSwitch('CUSTOMER')}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background:
                  portalMode === 'CUSTOMER'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'transparent',
                color: portalMode === 'CUSTOMER' ? '#042f2e' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              <Building2 size={15} /> Cổng Khách Hàng
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch('INTERNAL')}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background:
                  portalMode === 'INTERNAL'
                    ? 'linear-gradient(135deg, #38bdf8, #0284c7)'
                    : 'transparent',
                color: portalMode === 'INTERNAL' ? '#082f49' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              <Radar size={15} /> Giám Sát Nội Bộ
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {portalMode === 'CUSTOMER'
                ? 'Đăng Nhập Hệ Thống Khách Hàng'
                : 'Đăng Nhập Trung Tâm Giám Sát'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              {portalMode === 'CUSTOMER'
                ? 'Truy cập không gian quản lý vận đơn, đặt lịch xe xanh và chứng chỉ CO2e của doanh nghiệp bạn.'
                : 'Dành cho cán bộ vận hành nội bộ CCADRO (NOC, Quản trị, An toàn, Tài xế, Kiểm toán).'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: 6
                }}
              >
                {portalMode === 'CUSTOMER'
                  ? 'Tên đăng nhập hoặc Email doanh nghiệp'
                  : 'Mã định danh cán bộ nội bộ'}
              </label>
              <div style={{ position: 'relative' }}>
                <UserCheck
                  size={16}
                  color="#64748b"
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    portalMode === 'CUSTOMER'
                      ? 'VD: shipper hoặc email@doanhnghiep.vn'
                      : 'VD: admin, dispatcher, safety...'
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 11,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: 6
                }}
              >
                Mật khẩu bảo mật
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  color="#64748b"
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 11,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 13px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  marginBottom: 16
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 18px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background:
                  portalMode === 'CUSTOMER'
                    ? 'linear-gradient(135deg, #34d399 0%, #10b981 60%, #059669 100%)'
                    : 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 60%, #0284c7 100%)',
                color: '#042f2e',
                boxShadow: '0 10px 26px -6px rgba(16, 185, 129, 0.5)'
              }}
            >
              <Lock size={16} />
              <span>
                {loading
                  ? 'Đang xác thực phiên làm việc...'
                  : portalMode === 'CUSTOMER'
                    ? 'Vào Hệ Thống Khách Hàng (/customer)'
                    : 'Vào Hệ Thống Giám Sát Nội Bộ (/portal)'}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Register Callout */}
          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px dashed rgba(52, 211, 153, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Doanh nghiệp chưa có tài khoản?
            </span>
            <Link
              to="/register"
              style={{
                color: '#6ee7b7',
                fontWeight: 700,
                fontSize: '0.82rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <UserPlus size={14} /> Đăng ký tài khoản mới
            </Link>
          </div>

          {/* Quick Account Switcher based on selected portal mode */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div
              style={{
                fontSize: '0.73rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 10
              }}
            >
              {portalMode === 'CUSTOMER'
                ? 'Chọn nhanh tài khoản Khách hàng B2B mẫu:'
                : 'Chọn nhanh vai trò Giám sát Nội bộ (RBAC):'}
            </div>

            {portalMode === 'CUSTOMER' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {registeredUsers.slice(0, 4).map((acc) => {
                  const active = username.toLowerCase() === acc.username.toLowerCase();
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() =>
                        handleSelectQuickAccount(acc.username, acc.password || 'ccadro@123')
                      }
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                        border: active ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                        color: '#f8fafc',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7' }}>
                        {acc.customerId || acc.username}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#cbd5e1',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        @{acc.username} • {acc.companyName}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {internalRoles.map((role) => {
                  const active = username.toLowerCase() === role.username.toLowerCase();
                  return (
                    <button
                      key={role.role}
                      type="button"
                      onClick={() => handleSelectQuickAccount(role.username, 'ccadro@123')}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: active ? role.bgDim : 'rgba(15, 23, 42, 0.7)',
                        border: active
                          ? `1px solid ${role.color}`
                          : '1px solid rgba(255,255,255,0.08)',
                        color: '#f8fafc',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: role.color }}>
                        {role.role}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#cbd5e1',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        @{role.username} • {role.fullName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer note */}
      <footer
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '14px 24px',
          fontSize: '0.76rem',
          color: 'rgba(148, 163, 184, 0.8)'
        }}
      >
        © 2026 CCADRO Green Supply Chain &amp; Smart Logistics Tracker • ISO 14083 &amp; GLEC
        Framework v3
      </footer>
    </div>
  );
}
