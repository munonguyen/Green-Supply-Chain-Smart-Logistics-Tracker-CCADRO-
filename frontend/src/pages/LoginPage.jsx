import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Lock,
  User,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import ShimmeringText from '../components/ui/ShimmeringText';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DEMO_ACCOUNTS = [
  {
    username: 'admin',
    roleLabel: 'Quản Trị Viên',
    name: 'System Admin',
    desc: 'Toàn quyền cấu hình & giám sát'
  },
  {
    username: 'dispatcher',
    roleLabel: 'Điều Phối Viên',
    name: 'Nguyễn Văn Nam',
    desc: 'Lập tuyến & duyệt đổi lộ trình'
  },
  {
    username: 'safety',
    roleLabel: 'Quản Lý An Toàn',
    name: 'Phạm Văn An Toàn',
    desc: 'Kiểm định xe & phát cảnh báo'
  },
  {
    username: 'auditor',
    roleLabel: 'Kiểm Toán ESG',
    name: 'Lê Thị Kiểm Toán',
    desc: 'Hạch toán GLEC v3 & chứng nhận'
  },
  {
    username: 'driver',
    roleLabel: 'Tài Xế Hạm Đội',
    name: 'Trần Văn Test',
    desc: 'Nhận lệnh & báo cáo hành trình'
  },
  {
    username: 'shipper',
    roleLabel: 'Chủ Hàng B2B',
    name: 'Vinamilk Logistics',
    desc: 'Tra cứu vận đơn & vết carbon'
  }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const [username, setUsername] = useState(user?.username || 'admin');
  const [password, setPassword] = useState('ccadro@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/portal');
    } catch (err) {
      setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelectDemo = (acc) => {
    setUsername(acc.username);
    setPassword('ccadro@123');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 32px',
        position: 'relative'
      }}
    >
      <div className="ambient-gradient-mesh" />

      {/* Top Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Về Trang Chủ Công Ty</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {isDark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#0ea5e9" />}
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          margin: '20px auto',
          position: 'relative',
          zIndex: 10
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="card glass-card-interactive"
          style={{ padding: '36px 32px' }}
        >
          {/* Logo & Headline */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.3rem',
                color: '#fff',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
                marginBottom: '14px'
              }}
            >
              C
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--accent-green-light)',
                background: 'var(--accent-green-dim)',
                padding: '3px 10px',
                borderRadius: '999px',
                marginBottom: '8px'
              }}
            >
              <ShimmeringText text="CỔNG ĐIỀU HÀNH DOANH NGHIỆP CCADRO" />
            </div>

            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '6px'
              }}
            >
              Đăng Nhập Hệ Thống
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Nhập thông tin định danh do Ban Điều Hành cấp phát để tiếp tục
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'var(--accent-red-dim)',
                border: '1px solid var(--accent-red)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#f87171',
                fontSize: '0.84rem',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Standard Form */}
          <form
            onSubmit={handleFormSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '8px'
                }}
              >
                Tên đăng nhập / Email doanh nghiệp
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: admin, dispatcher, shipper..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px 12px 42px',
                    color: 'var(--text-main)',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}
              >
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-main)'
                  }}
                >
                  Mật khẩu
                </label>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--accent-green-light)',
                    cursor: 'pointer'
                  }}
                >
                  Quên mật khẩu?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 42px 12px 42px',
                    color: 'var(--text-main)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}
            >
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ cursor: 'pointer' }}>
                Ghi nhớ phiên đăng nhập trên thiết bị này
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.96rem',
                fontWeight: 700,
                marginTop: '4px'
              }}
            >
              {loading ? (
                <span>Đang kết nối hệ thống điều hành...</span>
              ) : (
                <>
                  <span>Đăng Nhập Cổng Điều Hành</span>
                  <ArrowRight size={17} />
                </>
              )}
            </motion.button>
          </form>

          {/* Quick Demo Switcher (Discrete & Elegant) */}
          <div
            style={{
              marginTop: '26px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-color)'
            }}
          >
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={13} color="var(--accent-green)" />
              <span>Chọn nhanh tài khoản mẫu thử nghiệm:</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickSelectDemo(acc)}
                  style={{
                    background:
                      username === acc.username
                        ? 'var(--accent-green-dim)'
                        : 'var(--bg-card-hover)',
                    border:
                      username === acc.username
                        ? '1px solid var(--border-highlight)'
                        : '1px solid var(--border-color)',
                    color:
                      username === acc.username ? 'var(--accent-green-light)' : 'var(--text-main)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{acc.roleLabel}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    @{acc.username}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-dim)',
          position: 'relative',
          zIndex: 10
        }}
      >
        CCADRO Green Logistics Tracker Corporation • Cổng bảo mật doanh nghiệp ISO 14083 / GLEC v3
      </footer>
    </div>
  );
}
