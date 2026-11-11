import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileCheck2, Scale } from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import CarbonSavingsHub from '../components/landing/CarbonSavingsHub';
import Reveal from '../components/ui/Reveal';
import { CountingNumber } from '../components/ui/CountingNumber';
import { CARBON_SUMMARY, IMAGES, VIDEOS } from '../components/landing/landingContent';

const AUDIT_METRICS = [
  {
    code: 'WTW = WTT + TTW',
    title: 'Hạch Toán Toàn Trình Nhiên Liệu',
    desc: 'Tính toán đầy đủ cả lượng phát thải từ quá trình khai thác, lọc dầu/sản xuất điện (Well-to-Tank) và phát thải trực tiếp tại ống xả phương tiện (Tank-to-Wheel).'
  },
  {
    code: 'GLEC v3 & ISO 14083',
    title: 'Tách Biệt Dự Báo & Quyết Toán Thực Tế',
    desc: 'Phát thải khi lập kế hoạch (Planning Carbon) được tách biệt hoàn toàn với phát thải quyết toán sau chuyến đi (Post-trip Accounting) dựa trên quãng đường GPS và tải trọng thực.'
  },
  {
    code: 'Corridor Benchmark (UC13)',
    title: 'Định Mức Phát Thải Theo Hành Lang',
    desc: 'So sánh cường độ carbon (gCO2e/tấn.km) giữa các tuyến cảng biển – khu công nghiệp để ưu tiên phân bổ xe tải điện vào các hành lang có mật độ hàng hóa cao nhất.'
  }
];

export default function CarbonStatsPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      <LandingNavbar />

      {/* ── 1. SUBPAGE AMBIENT VIDEO HERO ── */}
      <section className="lp-subhero">
        <div className="lp-subhero__media">
          <video src={VIDEOS.carbonHarbor} poster={IMAGES.hero} autoPlay muted loop playsInline />
        </div>
        <div className="lp-subhero__overlay" />

        <div className="lp-container lp-subhero__grid">
          <div>
            <Reveal>
              <span className="lp-eyebrow">Sổ Cái Kiểm Toán Khí Nhà Kính Quốc Tế</span>
              <h1 className="lp-h2" style={{ color: '#fff', marginTop: 14 }}>
                Thống Kê &amp; Chứng Nhận{' '}
                <em>{CARBON_SUMMARY.savedKg.toLocaleString('vi-VN')} kg CO2e</em> Đã Tiết Kiệm
              </h1>
              <p className="lp-lead" style={{ color: 'rgba(255,255,255,0.82)' }}>
                Dữ liệu phát thải được thu thập tự động từ thiết bị định vị GPS và cân tải trọng
                điện tử trên từng chuyến hàng, chuẩn hóa theo khung GLEC v3 phục vụ kiểm toán ESG
                độc lập.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                <a href="#thong-ke-carbon" className="lp-btn lp-btn--primary">
                  Mở Công Cụ Ước Tính CO2e <ArrowRight size={16} />
                </a>
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost"
                  onClick={() => navigate('/login')}
                >
                  Truy Cập Sổ Cái Nội Bộ (UC12)
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="lp-live">
              <div className="lp-live__head">
                <span>GLEC v3 LEDGER • ISO 14083</span>
                <span className="radar-dot" />
              </div>
              <div className="lp-live__value">
                -<CountingNumber value={24.8} decimals={1} locale="vi-VN" />
                <span className="lp-live__unit">% CO2e</span>
              </div>
              <p className="lp-live__sub">Tỷ lệ cắt giảm so với mốc diesel tiêu chuẩn</p>
              <div className="lp-live__rows">
                <div className="lp-live__row">
                  <span>Phát thải mốc đối chứng (Baseline)</span>
                  <strong>
                    <CountingNumber value={1284.1} decimals={1} suffix=" tấn" />
                  </strong>
                </div>
                <div className="lp-live__row">
                  <span>Phát thải thực tế CCADRO</span>
                  <strong>
                    <CountingNumber value={965.6} decimals={1} suffix=" tấn" />
                  </strong>
                </div>
                <div className="lp-live__row">
                  <span>Chứng nhận ISO 14083 đã cấp</span>
                  <strong>
                    <CountingNumber value={648} suffix=" chứng nhận" />
                  </strong>
                </div>
                <div className="lp-live__row">
                  <span>Kỳ báo cáo kiểm kê</span>
                  <strong>{CARBON_SUMMARY.periodLabel}</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. INTERACTIVE CARBON SAVINGS HUB ── */}
      <CarbonSavingsHub />

      {/* ── 3. GLEC v3 METHODOLOGY EXPLAINER ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Phương Pháp Luận Kiểm Toán</span>
                <h2 className="lp-h2">
                  Chuẩn Mực Hạch Toán <em>GLEC Framework v3</em> Tại CCADRO
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Đảm bảo tính chính xác, minh bạch và khả năng truy xuất nguồn gốc đến từng vận đơn
                  khi doanh nghiệp thực hiện báo cáo phát thải Scope 3.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="lp-quotes">
            {AUDIT_METRICS.map((item, idx) => (
              <Reveal key={item.code} delay={idx * 0.1}>
                <div className="lp-panel" style={{ height: '100%' }}>
                  <span
                    className="lp-chip is-active"
                    style={{ cursor: 'default', marginBottom: 14 }}
                  >
                    <Scale size={14} /> {item.code}
                  </span>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: 800, marginBottom: 10 }}>
                    {item.title}
                  </h3>
                  <p className="lp-panel__desc">{item.desc}</p>
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.78rem',
                      color: 'var(--accent-green)'
                    }}
                  >
                    <FileCheck2 size={15} /> Sẵn sàng thẩm định bởi tổ chức độc lập
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
