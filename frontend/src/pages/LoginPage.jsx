import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Lock, User, UserPlus } from 'lucide-react';
import { useAuth, getDefaultPortalPath } from '../context/AuthContext';
import CcadroLogo from '../components/ui/CcadroLogo';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(username.trim(), password);
      navigate(getDefaultPortalPath(loggedUser));
    } catch (err) {
      setError(err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
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
        isolation: 'isolate'
      }}
    >
      {/* Clear, High-Definition Logistics Background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -3,
          backgroundColor: '#0b1324'
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
            objectPosition: 'center center',
            filter: 'brightness(0.92) contrast(1.06) saturate(1.08)'
          }}
        />
      </div>

      {/* Balanced Clear Vignette Overlay (Keeps background crisp & visible) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -2,
          background:
            'radial-gradient(circle at 50% 45%, rgba(10, 18, 32, 0.38) 0%, rgba(7, 12, 22, 0.74) 100%), linear-gradient(180deg, rgba(7, 12, 22, 0.55) 0%, rgba(7, 12, 22, 0.35) 50%, rgba(7, 12, 22, 0.72) 100%)'
        }}
      />

      {/* Minimal Top Navigation Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: '#fff'
          }}
        >
          <CcadroLogo size={40} />
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}
            >
              CCADRO
            </div>
            <div
              style={{
                fontSize: '0.64rem',
                color: '#6ee7b7',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700
              }}
            >
              Green Supply Chain
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 999,
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              color: '#f8fafc',
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={15} /> Trang chủ
          </Link>

          <Link
            to="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.5)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700
            }}
          >
            <UserPlus size={15} /> Đăng ký
          </Link>
        </div>
      </header>

      {/* Centered Login Card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px 40px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'rgba(12, 19, 34, 0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '36px 34px',
            boxShadow: '0 28px 70px -16px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.16)'
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', marginBottom: 14 }}>
              <CcadroLogo size={48} />
            </div>
            <h1
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                marginBottom: 6
              }}
            >
              Đăng Nhập
            </h1>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#cbd5e1',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              Nhập thông tin tài khoản của bạn để tiếp tục
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="login-username"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: 8
                }}
              >
                Tên đăng nhập hoặc Email
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={17}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc email..."
                  autoComplete="username"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.32)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: 8
                }}
              >
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={17}
                  color="#94a3b8"
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn..."
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.32)',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fecaca',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  marginBottom: 18
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
                padding: '13px 20px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                boxShadow: '0 12px 28px -8px rgba(16, 185, 129, 0.6)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <Lock size={16} />
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Card Footer */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: '#cbd5e1'
            }}
          >
            Bạn chưa có tài khoản?{' '}
            <Link
              to="/register"
              style={{
                color: '#34d399',
                fontWeight: 700,
                marginLeft: 4
              }}
            >
              Đăng ký ngay
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Subtle Bottom Copyright */}
      <footer
        style={{
          textAlign: 'center',
          padding: '14px 20px',
          fontSize: '0.78rem',
          color: 'rgba(226, 232, 240, 0.7)'
        }}
      >
        © {new Date().getFullYear()} CCADRO Green Supply Chain Platform. All rights reserved.
      </footer>
    </div>
  );
}
