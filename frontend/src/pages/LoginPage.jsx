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
  UserCog,
  UserPlus
} from 'lucide-react';
import { useAuth, getDefaultPortalPath } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CcadroLogo from '../components/ui/CcadroLogo';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';
import '../styles/landing.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [portalMode, setPortalMode] = useState('CUSTOMER'); // 'CUSTOMER' | 'INTERNAL'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePortalSwitch = (mode) => {
    setPortalMode(mode);
    setError(null);
    setUsername('');
    setPassword('');
  };

  const handleFillRootAdmin = () => {
    setPortalMode('INTERNAL');
    setUsername('admin');
    setPassword('ccadro@123');
    setError(null);
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
            filter: 'saturate(1.05) contrast(1.04) brightness(0.55)'
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
        {/* Left Column: Governance Policy */}
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
            <span className="radar-dot" /> QUẢN TRỊ ĐỊNH DANH &amp; PHÂN QUYỀN TẬP TRUNG (IAM)
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
            Cổng Đăng Nhập{' '}
            <span style={{ color: '#6ee7b7', fontStyle: 'italic' }}>Khách Hàng B2B</span> &amp;{' '}
            <span style={{ color: '#38bdf8' }}>Hệ Thống Giám Sát Nội Bộ</span>
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(226, 232, 240, 0.84)',
              lineHeight: 1.65,
              marginBottom: 24
            }}
          >
            Hệ thống tuân thủ cơ chế bảo mật doanh nghiệp nghiêm ngặt: người dùng bên ngoài (Khách
            hàng / Chủ hàng) có thể tự đăng ký tài khoản mới, trong khi{' '}
            <strong>
              toàn bộ tài khoản thuộc các vai trò nội bộ đều do ADMIN trực tiếp khởi tạo và phân
              quyền
            </strong>
            .
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
                  1. Dành Cho User / Khách Hàng Doanh Nghiệp (/customer)
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.55 }}>
                Người dùng tự đăng ký tài khoản mới tại trang <strong>Đăng ký</strong> để đặt lịch
                vận chuyển xanh, theo dõi GPS đơn hàng riêng và tải chứng nhận CO2e ISO 14083.
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
                  2. Dành Cho Nhân Sự Giám Sát Nội Bộ (/portal &amp; /governance)
                </strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0, lineHeight: 1.55 }}>
                Hệ thống <strong>không tạo sẵn tài khoản mặc định</strong> cho các role nội bộ
                (Dispatcher, Safety Manager, Driver, ESG Auditor). Quản trị viên (<code>ADMIN</code>
                ) là người tạo tài khoản, gán vai trò và phân quyền chi tiết cho từng nhân sự.
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
              <CheckCircle2 size={15} color="#34d399" /> Khách hàng tự đăng ký tài khoản mới
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#38bdf8" /> Nhân sự nội bộ do Admin cấp phát &amp; phân
              quyền
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
              <Building2 size={15} /> Cổng Khách Hàng (User)
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
              <Radar size={15} /> Hệ Thống Nội Bộ
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {portalMode === 'CUSTOMER'
                ? 'Đăng Nhập Tài Khoản Khách Hàng'
                : 'Đăng Nhập Hệ Thống Giám Sát Nội Bộ'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              {portalMode === 'CUSTOMER'
                ? 'Nhập tài khoản khách hàng bạn đã đăng ký để truy cập Cổng Khách Hàng (/customer).'
                : 'Đăng nhập bằng tài khoản Quản trị viên (Admin) hoặc tài khoản nội bộ đã được Admin cấp phát.'}
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
                  ? 'Tên đăng nhập hoặc Email đã đăng ký'
                  : 'Tên đăng nhập nội bộ (do Admin cấp)'}
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
                      ? 'Nhập username hoặc email của bạn...'
                      : 'Nhập username nội bộ (VD: admin)...'
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
                Mật khẩu
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
                  placeholder="Nhập mật khẩu..."
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
                  lineHeight: 1.5,
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
                  ? 'Đang xác thực tài khoản...'
                  : portalMode === 'CUSTOMER'
                    ? 'Đăng Nhập Cổng Khách Hàng'
                    : 'Đăng Nhập Hệ Thống Nội Bộ'}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Contextual Guidance Box */}
          {portalMode === 'CUSTOMER' ? (
            <div
              style={{
                marginTop: 18,
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px dashed rgba(52, 211, 153, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 700 }}>
                Chưa có tài khoản Khách hàng / Chủ hàng?
              </div>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                Khách hàng mới vui lòng đăng ký tài khoản doanh nghiệp để được cấp không gian quản
                lý vận đơn và chứng chỉ CO2e riêng biệt.
              </p>
              <Link
                to="/register"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 4,
                  padding: '8px 14px',
                  borderRadius: 9,
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  color: '#6ee7b7',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <UserPlus size={14} /> Tạo tài khoản Khách hàng mới ngay
              </Link>
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#bae6fd',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <UserCog size={16} color="#38bdf8" />
                <span>Chính sách Quản trị Tài khoản Nội bộ (Admin IAM)</span>
              </div>
              <p style={{ fontSize: '0.77rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                Các vai trò nội bộ (<code>DISPATCHER</code>, <code>SAFETY_MANAGER</code>,{' '}
                <code>DRIVER</code>, <code>ESG_AUDITOR</code>) không có tài khoản mặc định. Hãy đăng
                nhập bằng tài khoản <strong>Root Admin</strong> để vào hệ thống tạo tài khoản và
                phân quyền cho nhân sự nội bộ:
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 4,
                  padding: '8px 11px',
                  borderRadius: 9,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(168, 85, 247, 0.4)'
                }}
              >
                <span style={{ fontSize: '0.76rem', color: '#e9d5ff' }}>
                  Root Admin: <code>admin</code> / Mật khẩu: <code>ccadro@123</code>
                </span>
                <button
                  type="button"
                  onClick={handleFillRootAdmin}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 7,
                    border: '1px solid #a855f7',
                    background: 'rgba(168, 85, 247, 0.22)',
                    color: '#f3e8ff',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Điền tài khoản Admin
                </button>
              </div>
            </div>
          )}
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
