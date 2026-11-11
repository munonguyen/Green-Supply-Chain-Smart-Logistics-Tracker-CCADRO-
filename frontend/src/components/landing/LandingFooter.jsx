import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, MapPin, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import CcadroLogo from '../ui/CcadroLogo';
import { NAV_LINKS } from './landingContent';

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          {/* Col 1: brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <CcadroLogo size={38} />
              <span style={{ fontSize: '1.18rem', fontWeight: 800 }}>CCADRO Ecosystem</span>
            </div>
            <p className="lp-footer__about">
              Tổng công ty Giải pháp Công nghệ Chuỗi Cung Ứng Xanh &amp; Giám Sát Vận Tải Đa Phương
              Thức CCADRO. Phân tách độc lập giữa Cổng Khách Hàng B2B và Trung Tâm Giám Sát Nội Bộ.
            </p>
            <span className="lp-chip is-active" style={{ cursor: 'default', fontSize: '0.72rem' }}>
              <ShieldCheck size={13} /> GLEC v3 &amp; ISO 14083
            </span>
          </div>

          {/* Col 2: navigation pages */}
          <div>
            <h4>Chuyên Trang</h4>
            <ul>
              {NAV_LINKS.map((item) => (
                <li key={item.id}>
                  <Link to={item.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: contact */}
          <div>
            <h4>Trụ Sở Doanh Nghiệp</h4>
            <ul>
              <li>
                <MapPin size={15} />
                <span>Khu Công Nghệ Cao, TP. Thủ Đức, TP. HCM</span>
              </li>
              <li>
                <Phone size={15} />
                <span>(+84) 28 3888 9999</span>
              </li>
              <li>
                <Mail size={15} />
                <span>contact@ccadro.com</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Dual Portals */}
          <div>
            <h4>Hệ Thống Khách Hàng &amp; Nội Bộ</h4>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                marginBottom: 12
              }}
            >
              Truy cập không gian dành riêng cho Khách hàng B2B hoặc Trung tâm Giám sát Nội bộ
              CCADRO.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block"
                onClick={() => navigate('/login')}
              >
                <Lock size={14} /> Đăng Nhập Hệ Thống
              </button>
              <button
                type="button"
                className="lp-btn lp-btn--ghost lp-btn--sm lp-btn--block"
                onClick={() => navigate('/register')}
                style={{ color: 'var(--text-main)' }}
              >
                <UserPlus size={14} /> Đăng Ký Tài Khoản Khách Hàng
              </button>
            </div>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <span>© 2026 CCADRO Green Logistics Tracker Corporation. All rights reserved.</span>
          <div>
            <span>Chính sách bảo mật</span>
            <span>Điều khoản dịch vụ</span>
            <span>Quy chuẩn ESG ISO 14083</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
