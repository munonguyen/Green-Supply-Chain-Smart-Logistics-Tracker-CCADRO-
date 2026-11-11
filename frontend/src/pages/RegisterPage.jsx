import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  KeyRound,
  Leaf,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CcadroLogo from '../components/ui/CcadroLogo';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';
import '../styles/landing.css';

const INDUSTRIES = [
  'Thực phẩm & Chuỗi cung ứng lạnh (FMCG)',
  'Điện tử, Bán dẫn & Công nghệ cao',
  'Sản xuất Công nghiệp & Xuất nhập khẩu',
  'Dược phẩm & Thiết bị Y tế',
  'Bán lẻ, Thương mại điện tử & Phân phối',
  'Khai thác Cảng biển & Kho bãi ICD'
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    customerCode: '',
    email: '',
    phone: '',
    industry: INDUSTRIES[0],
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!form.agreeTerms) {
      setError('Vui lòng đồng ý với quy chuẩn bảo mật dữ liệu và tiêu chuẩn ESG.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser(form);
      navigate(result.redirectTo || '/customer');
    } catch (err) {
      setError(err.message || 'Không thể hoàn tất đăng ký. Vui lòng thử lại.');
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
      {/* Ambient Video Background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      >
        <video
          src={VIDEOS.evFleetDepot}
          poster={IMAGES.evTruck}
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.05) contrast(1.04) brightness(0.5)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(125deg, rgba(4, 18, 14, 0.93) 0%, rgba(6, 28, 22, 0.85) 50%, rgba(4, 18, 14, 0.95) 100%)'
          }}
        />
      </div>

      {/* Top Header */}
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
          <Link
            to="/login"
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
            <Lock size={14} /> Đã có tài khoản? Đăng nhập
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

      {/* Main Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1220,
          width: '100%',
          margin: '0 auto',
          padding: '8px 24px 36px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 36,
          alignItems: 'start'
        }}
      >
        {/* Left Info Column */}
        <div style={{ paddingTop: 12 }}>
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
              marginBottom: 16
            }}
          >
            <UserPlus size={14} /> CỔNG ĐĂNG KÝ KHÁCH HÀNG &amp; ĐỐI TÁC CHỦ HÀNG B2B
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.85rem, 3vw, 2.45rem)',
              fontWeight: 800,
              lineHeight: 1.24,
              letterSpacing: '-0.02em',
              marginBottom: 16,
              color: '#fff'
            }}
          >
            Khởi Tạo Không Gian Quản Trị <span style={{ color: '#6ee7b7' }}>Vận Tải Xanh</span> Dành
            Riêng Cho Doanh Nghiệp
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(241, 245, 249, 0.9)',
              lineHeight: 1.7,
              marginBottom: 24
            }}
          >
            Sau khi đăng ký, doanh nghiệp của bạn được cấp quyền truy cập ngay vào{' '}
            <strong>Cổng Khách Hàng B2B</strong> — tách biệt hoàn toàn với hệ thống điều độ nội bộ,
            bảo vệ tuyệt đối dữ liệu chuỗi cung ứng và lô hàng.
          </p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            {[
              {
                icon: Leaf,
                title: 'Đặt lịch vận chuyển xanh & ước tính CO2e tức thì',
                desc: 'Tạo yêu cầu vận chuyển container/hàng lạnh với đội xe điện EV và Euro 5, xem trước lượng khí thải cắt giảm theo chuẩn GLEC v3.'
              },
              {
                icon: ShieldCheck,
                title: 'Giám sát hành trình trực tuyến & cô lập dữ liệu (BRULE-16)',
                desc: 'Theo dõi vị trí GPS, tốc độ, nhiệt độ thùng lạnh và thời gian dự kiến đến (ETA) của riêng các vận đơn thuộc mã doanh nghiệp bạn.'
              },
              {
                icon: FileCheck2,
                title: 'Chứng nhận phát thải số ISO 14083 & biên bản ePOD',
                desc: 'Tự động tổng hợp sổ cái carbon Scope 3 và xuất chứng nhận giảm phát thải phục vụ kiểm toán ESG và cơ chế CBAM châu Âu.'
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  style={{
                    padding: '15px 18px',
                    borderRadius: 16,
                    background: 'rgba(15, 23, 42, 0.68)',
                    border: '1px solid rgba(110, 231, 183, 0.18)',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start'
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.16)',
                      color: '#34d399',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={19} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: 4 }}>
                      {item.title}
                    </strong>
                    <span style={{ fontSize: '0.81rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Form Card */}
        <div
          style={{
            background: 'rgba(9, 22, 18, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(110, 231, 183, 0.26)',
            borderRadius: 24,
            padding: '28px',
            boxShadow: '0 28px 70px rgba(0, 0, 0, 0.55)'
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              Đăng Ký Tài Khoản Khách Hàng B2B
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
              Điền thông tin doanh nghiệp để kích hoạt tài khoản trên Cổng Khách Hàng CCADRO.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Họ và tên người đại diện *
                </label>
                <div style={{ position: 'relative' }}>
                  <UserCheck
                    size={15}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="VD: Trần Minh Hoàng"
                    value={form.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 35px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#fff',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Tên doanh nghiệp / Chủ hàng *
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2
                    size={15}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="VD: Công ty CP Logistics Nam Việt"
                    value={form.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 35px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#fff',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Email doanh nghiệp *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="scm@doanhnghiep.vn"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 35px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#fff',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Số điện thoại điều phối *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={15}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="tel"
                    required
                    placeholder="0909 123 456"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 35px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#fff',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Ngành hàng vận chuyển chính
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.84rem'
                  }}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Mã định danh Chủ hàng (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: NAMVIET_SCM (Tự tạo nếu trống)"
                  value={form.customerCode}
                  onChange={(e) => handleChange('customerCode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                marginBottom: 14
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  placeholder="VD: namviet_b2b"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.86rem'
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Mật khẩu (&ge; 6 ký tự) *
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound
                    size={14}
                    color="#64748b"
                    style={{
                      position: 'absolute',
                      left: 11,
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 32px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#fff',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: 5
                  }}
                >
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    color: '#fff',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                fontSize: '0.78rem',
                color: '#cbd5e1',
                marginBottom: 16,
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                style={{ marginTop: 3, accentColor: '#10b981' }}
              />
              <span>
                Tôi xác nhận đăng ký tài khoản Doanh nghiệp trên hệ thống CCADRO và đồng ý áp dụng
                quy chuẩn hạch toán phát thải <strong>ISO 14083 / GLEC Framework v3</strong> cùng
                chính sách cô lập dữ liệu chủ hàng (BRULE-16).
              </span>
            </label>

            {error && (
              <div
                style={{
                  padding: '10px 13px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  marginBottom: 14
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
                background: 'linear-gradient(135deg, #34d399 0%, #10b981 60%, #059669 100%)',
                color: '#042f2e',
                boxShadow: '0 10px 26px -6px rgba(16, 185, 129, 0.5)'
              }}
            >
              <CheckCircle2 size={17} />
              <span>
                {loading
                  ? 'Đang khởi tạo không gian doanh nghiệp...'
                  : 'Hoàn Tất Đăng Ký & Truy Cập Hệ Thống Khách Hàng'}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: '#94a3b8'
            }}
          >
            <span>Đã có tài khoản Khách hàng hoặc Nội bộ?</span>
            <Link
              to="/login"
              style={{
                color: '#6ee7b7',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Đăng nhập ngay →
            </Link>
          </div>
        </div>
      </main>

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
        © 2026 CCADRO Green Supply Chain &amp; Smart Logistics Tracker • Bảo mật dữ liệu doanh
        nghiệp B2B
      </footer>
    </div>
  );
}
