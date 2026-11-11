import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Film, Leaf, PlayCircle, ShieldCheck } from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import HeroTrackingWidget from '../components/landing/HeroTrackingWidget';
import Reveal from '../components/ui/Reveal';
import { CountingNumber } from '../components/ui/CountingNumber';
import {
  ENTERPRISE_METRICS,
  IMAGES,
  NAV_LINKS,
  PARTNERS,
  TESTIMONIALS,
  VIDEOS
} from '../components/landing/landingContent';

export default function LandingPage() {
  const navigate = useNavigate();
  const subPages = NAV_LINKS.filter((item) => item.path !== '/');

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <LandingNavbar />

      {/* ── 1. CINEMATIC VIDEO HERO ── */}
      <section id="tong-quan" className="lp-hero">
        <div className="lp-hero__media">
          <video src={VIDEOS.portCorridor} poster={IMAGES.hero} autoPlay muted loop playsInline />
        </div>
        <div className="lp-hero__overlay" />
        <div className="lp-hero__grid" />

        <div className="lp-container lp-hero__content">
          {/* Left: headlines */}
          <div>
            <Reveal>
              <div className="lp-hero__badge">
                <span className="radar-dot" />
                NỀN TẢNG ĐIỀU HÀNH LOGISTICS XANH &amp; KIỂM TOÁN CARBON SỐ
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="lp-hero__title">
                Giám Sát Vận Tải Thông Minh &amp; Cắt Giảm <em>Phát Thải</em> Chuỗi Cung Ứng
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="lp-hero__lead">
                CCADRO hợp nhất điều độ vận tải đa phương thức, lập lộ trình xanh đa tiêu chí
                Pareto, giám sát lệch tuyến GPS thời gian thực và hạch toán khí nhà kính tự động
                theo chuẩn <strong>ISO 14083</strong> &amp; <strong>GLEC Framework v3</strong>.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="lp-hero__ctas">
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={() => navigate('/login')}
                >
                  Truy Cập Cổng Điều Hành <ArrowRight size={17} />
                </button>
                <Link to="/thong-ke-carbon" className="lp-btn lp-btn--ghost">
                  <Leaf size={17} /> Dữ Liệu CO2 Tiết Kiệm
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="lp-hero__checks">
                <span>
                  <CheckCircle2 size={15} color="#6ee7b7" /> Độ trễ GPS dưới 2 giây
                </span>
                <span>
                  <CheckCircle2 size={15} color="#6ee7b7" /> Tiết kiệm 15 – 28% CO2e
                </span>
                <span>
                  <CheckCircle2 size={15} color="#6ee7b7" /> Chứng nhận số ePOD tức thì
                </span>
              </div>
            </Reveal>
          </div>

          {/* Right: live carbon panel */}
          <Reveal delay={0.35} y={40}>
            <div className="lp-live">
              <div className="lp-live__head">
                <span>CARBON DASHBOARD • LIVE</span>
                <span className="radar-dot" />
              </div>
              <div className="lp-live__value">
                <CountingNumber value={318460} />
                <span className="lp-live__unit">kg CO2e</span>
              </div>
              <p className="lp-live__sub">Tổng lượng phát thải đã tránh (12 tháng qua)</p>
              <div className="lp-live__rows">
                <div className="lp-live__row">
                  <span>Chuyến hàng xanh</span>
                  <strong>12.450</strong>
                </div>
                <div className="lp-live__row">
                  <span>Đội xe phát thải thấp</span>
                  <strong>42%</strong>
                </div>
                <div className="lp-live__row">
                  <span>Giao hàng đúng hẹn</span>
                  <strong>98,6%</strong>
                </div>
                <div className="lp-live__row">
                  <span>Chứng nhận ISO 14083</span>
                  <strong>648</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. TRACKING CONSOLE (overlaps hero) ── */}
      <Reveal>
        <HeroTrackingWidget />
      </Reveal>

      {/* ── 3. PARTNER MARQUEE ── */}
      <section className="lp-section lp-section--tight">
        <div className="lp-container">
          <Reveal>
            <p className="lp-marquee__label">
              Được tin dùng bởi các tập đoàn sản xuất, xuất khẩu và cảng biển trọng điểm
            </p>
          </Reveal>
          <div className="lp-marquee">
            <div className="lp-marquee__track">
              {[...PARTNERS, ...PARTNERS].map((name, i) => (
                <span key={`${name}-${i}`} className="lp-marquee__item">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. ENTERPRISE METRICS STRIP ── */}
      <section className="lp-section lp-section--tight lp-section--alt">
        <div className="lp-container">
          <div className="lp-metrics">
            {ENTERPRISE_METRICS.map((m, idx) => {
              const Icon = m.icon;
              return (
                <Reveal key={m.label} delay={idx * 0.08}>
                  <div className="lp-metric">
                    <div className="lp-metric__icon">
                      <Icon size={22} />
                    </div>
                    <div className="lp-metric__value">
                      {m.prefix || ''}
                      <CountingNumber value={m.value} decimals={m.decimals || 0} locale="vi-VN" />
                      {m.suffix && <small>{m.suffix}</small>}
                    </div>
                    <div className="lp-metric__label">{m.label}</div>
                    <div className="lp-metric__hint">{m.hint}</div>
                    <div className="lp-metric__bars">
                      {m.bars.map((h, i) => (
                        <span key={i} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. CORPORATE COMMAND CENTER VIDEO SHOWCASE ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 36,
              alignItems: 'center'
            }}
          >
            <Reveal>
              <div>
                <span className="lp-eyebrow">Trung Tâm Điều Độ Vận Tải Số</span>
                <h2 className="lp-h2">
                  Trực Quan Hóa Toàn Bộ <em>Hành Lang Vận Tải</em> Trong Thời Gian Thực
                </h2>
                <p className="lp-lead" style={{ marginBottom: 22 }}>
                  Từ cảng biển nước sâu Cái Mép – Thị Vải, cảng Cát Lái đến các khu công nghiệp
                  VSIP, Sóng Thần và Nhơn Trạch, mọi phương tiện đều được giám sát tọa độ, tải trọng
                  và hệ số phát thải Well-to-Wheel liên tục từng giây.
                </p>
                <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={18} color="var(--accent-green)" />
                    <span>
                      <strong>Kiểm soát hành lang kép:</strong> Cảnh báo sớm lệch tuyến 50m (Vàng)
                      và 200m (Đỏ) bằng thuật toán không gian PostGIS.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <PlayCircle size={18} color="var(--accent-green)" />
                    <span>
                      <strong>Điều phối Human-in-the-Loop:</strong> Đề xuất lộ trình tránh ùn tắc
                      khi lợi ích đạt từ 10% trở lên, phê duyệt trực tiếp bởi Điều phối viên.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/giai-phap" className="lp-btn lp-btn--primary lp-btn--sm">
                    Xem Kiến Trúc Giải Pháp <ArrowRight size={15} />
                  </Link>
                  <Link to="/dinh-huong" className="lp-btn lp-btn--outline lp-btn--sm">
                    Lộ Trình Net-Zero 2030
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="lp-video-card" style={{ aspectRatio: '16 / 10' }}>
                <video
                  src={VIDEOS.smartRoutingOps}
                  poster={IMAGES.hero}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
                <div className="lp-video-card__overlay" style={{ pointerEvents: 'none' }}>
                  <span className="lp-video-badge">
                    <Film size={13} /> LIVE SIMULATION • CCADRO CONTROL TOWER
                  </span>
                  <div>
                    <strong style={{ fontSize: '1.05rem', display: 'block' }}>
                      Mô phỏng Điều độ Cảng biển &amp; Đội xe Điện Hóa
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>
                      Luồng dữ liệu kết nối trực tiếp với hệ thống GPS Telemetry &amp; GLEC v3
                      Engine
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 6. DEDICATED PAGES DIRECTORY ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Hệ Thống Chuyên Trang</span>
                <h2 className="lp-h2">
                  Khám Phá Chi Tiết Từng <em>Phân Hệ Nghiệp Vụ</em>
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Mỗi mục trên thanh điều hướng là một chuyên trang độc lập với dữ liệu, biểu đồ và
                  video minh họa chuyên biệt cho doanh nghiệp.
                </p>
              </div>
            </div>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24
            }}
          >
            {subPages.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 0.08}>
                <div
                  className="lp-panel"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16
                  }}
                >
                  <div>
                    <span className="lp-panel__label">CHUYÊN TRANG 0{idx + 1}</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '8px 0 10px' }}>
                      {item.label}
                    </h3>
                    <p className="lp-panel__desc">
                      {item.id === 'dinh-huong' &&
                        'Lộ trình giảm 50% cường độ phát thải đến năm 2030, chiến lược chuyển đổi đội xe điện EV và hạ tầng depot năng lượng mặt trời.'}
                      {item.id === 'giai-phap' &&
                        'Kiến trúc giải pháp lập tuyến Pareto (UC05), giám sát đệm GPS 50m/200m (UC09), điều hướng tránh ùn tắc (UC10) và kiểm toán GLEC v3.'}
                      {item.id === 'thong-ke-carbon' &&
                        'Sổ cái CO2e tiết kiệm thực tế, biểu đồ xu hướng 12 tháng, định mức hành lang (UC13) và công cụ ước tính phát thải trực tuyến.'}
                      {item.id === 'tin-tuc' &&
                        'Bản tin chiến lược ESG, phóng sự video hiện trường, báo cáo kiểm toán định kỳ và cổng đăng ký tư vấn doanh nghiệp.'}
                    </p>
                  </div>
                  <Link to={item.path} className="lp-link">
                    Truy cập {item.label} <ArrowRight size={15} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS ── */}
      <section className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Khách hàng &amp; Đối tác ESG</span>
                <h2 className="lp-h2">Ý Kiến Đánh Giá Từ Các Tập Đoàn Hàng Đầu</h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Được tín nhiệm bởi các chuỗi cung ứng sản xuất, điện tử và khai thác cảng biển.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="lp-quotes">
            {TESTIMONIALS.map((t, idx) => (
              <Reveal key={t.company} delay={idx * 0.1}>
                <div className="lp-quote">
                  <div className="lp-quote__metric">
                    {t.metric}
                    <small>{t.metricLabel}</small>
                  </div>
                  <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                  <div className="lp-quote__author">
                    <span className="lp-avatar">{t.author.charAt(0)}</span>
                    <div>
                      <strong>{t.author}</strong>
                      <span>
                        {t.role} • {t.company}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. CTA BAND ── */}
      <section className="lp-section lp-section--tight">
        <div className="lp-container">
          <Reveal>
            <div className="lp-cta">
              <img
                src={IMAGES.evTruck}
                alt="Electric truck charging at solar depot"
                loading="lazy"
              />
              <div>
                <h2>Sẵn sàng cắt giảm phát thải cho đội xe của bạn?</h2>
                <p>
                  Trải nghiệm ngay nền tảng CCADRO — lập lộ trình xanh, giám sát GPS thời gian thực
                  và tự động kiểm toán carbon theo chuẩn quốc tế.
                </p>
              </div>
              <div className="lp-cta__actions">
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={() => navigate('/login')}
                >
                  Đăng Nhập Hệ Thống <ArrowRight size={17} />
                </button>
                <Link to="/thong-ke-carbon" className="lp-btn lp-btn--ghost">
                  Xem Báo Cáo CO2
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 9. FOOTER ── */}
      <LandingFooter />
    </div>
  );
}
