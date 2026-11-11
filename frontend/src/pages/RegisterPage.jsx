import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CcadroLogo from '../components/ui/CcadroLogo';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';

const INDUSTRIES = [
  'Sản xuất & Chế biến Thực phẩm / Đồ uống',
  'Điện tử, Bán dẫn & Công nghệ cao',
  'Dược phẩm & Chuỗi cung ứng lạnh',
  'Bán lẻ, Thương mại điện tử & FMCG',
  'Dệt may, Da giày & Xuất nhập khẩu',
  'Nông sản, Thủy sản & Logistics Cảng biển',
  'Lĩnh vực khác'
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    username: '',
    email: '',
    phone: '',
    industry: INDUSTRIES[0],
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(formData);
      navigate('/customer');
    } catch (err) {
      setError(err?.message || 'Không thể đăng ký tài khoản. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px 11px 40px',
    borderRadius: 12,
    background: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid rgba(148, 163, 184, 0.32)',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 6
  };

  const iconStyle = {
    position: 'absolute',
    left: 13,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none'
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

      {/* Balanced Clear Vignette Overlay */}
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
            to="/login"
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
            <Lock size={14} /> Đăng nhập
          </Link>
        </div>
      </header>

      {/* Centered Register Card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 20px 36px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'rgba(12, 19, 34, 0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '32px 32px',
            boxShadow: '0 28px 70px -16px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(16, 185, 129, 0.16)'
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', marginBottom: 12 }}>
              <CcadroLogo size={46} />
            </div>
            <h1
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                marginBottom: 6
              }}
            >
              Đăng Ký Tài Khoản
            </h1>
            <p
              style={{
                fontSize: '0.88rem',
                color: '#cbd5e1',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              Điền thông tin bên dưới để tạo tài khoản mới trên hệ thống CCADRO
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 14
              }}
            >
              <div>
                <label htmlFor="reg-fullname" style={labelStyle}>
                  Họ và tên *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-company" style={labelStyle}>
                  Tên doanh nghiệp / Đơn vị *
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-company"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Công ty TNHH ABC"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 14
              }}
            >
              <div>
                <label htmlFor="reg-username" style={labelStyle}>
                  Tên đăng nhập *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-username"
                    type="text"
                    required
                    minLength={3}
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="Nhập username..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-phone" style={labelStyle}>
                  Số điện thoại *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="0909 123 456"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 14
              }}
            >
              <div>
                <label htmlFor="reg-email" style={labelStyle}>
                  Email liên hệ *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@company.vn"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-industry" style={labelStyle}>
                  Lĩnh vực hoạt động
                </label>
                <select
                  id="reg-industry"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 14
                  }}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 20
              }}
            >
              <div>
                <label htmlFor="reg-password" style={labelStyle}>
                  Mật khẩu (&ge; 6 ký tự) *
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    style={{
                      ...inputStyle,
                      paddingRight: 40
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    style={{
                      position: 'absolute',
                      right: 10,
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm" style={labelStyle}>
                  Xác nhận mật khẩu *
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#94a3b8" style={iconStyle} />
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    style={inputStyle}
                  />
                </div>
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
              <UserPlus size={16} />
              <span>{loading ? 'Đang khởi tạo tài khoản...' : 'Đăng Ký Tài Khoản'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Card Footer */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              fontSize: '0.88rem',
              color: '#cbd5e1'
            }}
          >
            Bạn đã có tài khoản?{' '}
            <Link
              to="/login"
              style={{
                color: '#34d399',
                fontWeight: 700,
                marginLeft: 4
              }}
            >
              Đăng nhập ngay
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
