import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Cpu,
  Leaf,
  Lock,
  MapPin,
  Mail,
  Phone,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Snowflake
} from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroTrackingWidget from '../components/landing/HeroTrackingWidget';
import CarbonSavingsHub from '../components/landing/CarbonSavingsHub';
import Reveal from '../components/ui/Reveal';
import { CountingNumber } from '../components/ui/CountingNumber';
import {
  ENTERPRISE_METRICS,
  FAQS,
  IMAGES,
  NEWS,
  PARTNERS,
  PILLARS,
  ROADMAP,
  TESTIMONIALS
} from '../components/landing/landingContent';

export default function LandingPage() {
  const navigate = useNavigate();

  /* FAQ Accordion */
  const [openFaq, setOpenFaq] = useState(0);

  /* Contact form */
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactEmail.trim()) {
      setContactSubmitted(true);
      setTimeout(() => {
        setContactSubmitted(false);
        setContactName('');
        setContactEmail('');
        setContactCompany('');
      }, 4000);
    }
  };

  /* Roadmap fill */
  const doneRoadmap = ROADMAP.filter((r) => r.state === 'done').length;
  const currentIdx = ROADMAP.findIndex((r) => r.state === 'current');
  const roadmapFill =
    currentIdx >= 0
      ? ((doneRoadmap + 0.5) / ROADMAP.length) * 100
      : (doneRoadmap / ROADMAP.length) * 100;

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <LandingNavbar />

      {/* ── 1. CINEMATIC HERO ── */}
      <section id="tong-quan" className="lp-hero">
        <div className="lp-hero__media">
          <img
            src={IMAGES.hero}
            alt="Container port at dusk – CCADRO smart logistics"
            loading="eager"
          />
        </div>
        <div className="lp-hero__overlay" />
        <div className="lp-hero__grid" />

        <div className="lp-container lp-hero__content">
          {/* Left: headlines */}
          <div>
            <Reveal>
              <div className="lp-hero__badge">
                <span className="radar-dot" />
                TIÊN PHONG LOGISTICS XANH &amp; CARBON INTELLIGENCE
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="lp-hero__title">
                Giám Sát Vận Tải Thông Minh &amp; Cắt Giảm <em>Phát Thải</em> Chuỗi Cung Ứng
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="lp-hero__lead">
                CCADRO trao quyền cho doanh nghiệp: lập lộ trình xanh đa mục tiêu, cảnh báo lệch
                tuyến GPS thời gian thực và tự động kiểm toán khí nhà kính theo chuẩn{' '}
                <strong>ISO 14083</strong> &amp; <strong>GLEC Framework v3</strong>.
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
                <a href="#thong-ke-carbon" className="lp-btn lp-btn--ghost">
                  <Leaf size={17} /> Dữ Liệu CO2 Tiết Kiệm
                </a>
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
              Được tin dùng bởi các tập đoàn và đơn vị vận tải hàng đầu
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

      {/* ── 5. CARBON SAVINGS HUB ── */}
      <CarbonSavingsHub />

      {/* ── 6. BENTO GRID SERVICES ── */}
      <section id="giai-phap" className="lp-section lp-section--alt">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Hệ Sinh Thái Giải Pháp</span>
                <h2 className="lp-h2">
                  Kiến Trúc Giải Pháp <em>Logistics Xanh</em> Toàn Diện
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Tối ưu vận hành chuỗi cung ứng thông minh từ cảng biển quốc tế đến kho bãi điểm
                  cuối.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="lp-bento">
            {/* Card 1: span 7 — UC05 Green Route Planning */}
            <Reveal className="lp-bento__card lp-bento__card--7">
              <div className="lp-bento__icon">
                <Activity size={24} />
              </div>
              <h3 className="lp-bento__title">Lập Lộ Trình Xanh Đa Mục Tiêu Pareto</h3>
              <p className="lp-bento__desc">
                Phân tích đồng thời 4 tiêu chí: <strong>Phát thải CO2e (40%)</strong>,{' '}
                <strong>Thời gian (30%)</strong>, <strong>Chi phí (20%)</strong> và{' '}
                <strong>Rủi ro ùn tắc (10%)</strong> — không chỉ tìm đường ngắn nhất.
              </p>
              <div className="lp-bento__foot">
                <button type="button" className="lp-link" onClick={() => navigate('/login')}>
                  Mô phỏng lập tuyến <ArrowRight size={14} />
                </button>
              </div>
            </Reveal>

            {/* Card 2: span 5 — UC09 GPS Buffer Deviation (with image) */}
            <Reveal delay={0.1} className="lp-bento__card lp-bento__card--5 lp-bento__card--image">
              <img src={IMAGES.containers} alt="Container freight corridor" loading="lazy" />
              <div className="lp-bento__icon">
                <Radio size={24} />
              </div>
              <h3 className="lp-bento__title">Đệm Vi Phân GPS 50m / 200m</h3>
              <p className="lp-bento__desc">
                Hành lang an toàn PostGIS: cảnh báo vàng 50m, báo động đỏ 200m qua 3 điểm liên tiếp.
                Tần suất cập nhật 1 Hz.
              </p>
              <div className="lp-bento__chips">
                <span>🟡 50m cảnh báo</span>
                <span>🔴 200m báo động</span>
              </div>
            </Reveal>

            {/* Card 3: span 4 — UC10 Rerouting */}
            <Reveal delay={0.05} className="lp-bento__card lp-bento__card--4">
              <div className="lp-bento__icon">
                <Cpu size={24} />
              </div>
              <h3 className="lp-bento__title">Điều Hướng Tránh Ùn Tắc Động</h3>
              <p className="lp-bento__desc">
                Tự động tính phương án thay thế khi phát hiện sự cố. Chỉ kích hoạt khi lợi ích &gt;
                10% và có xác nhận của Điều phối viên.
              </p>
              <div className="lp-approval">
                <div className="lp-approval__row">
                  <span>Thời gian phản hồi</span>
                  <strong>&lt; 3 giây</strong>
                </div>
                <div className="lp-approval__btns">
                  <span>✓ Phê duyệt</span>
                  <span>✕ Từ chối</span>
                </div>
              </div>
            </Reveal>

            {/* Card 4: span 4 — Cold Chain */}
            <Reveal delay={0.1} className="lp-bento__card lp-bento__card--4">
              <div className="lp-bento__icon">
                <Snowflake size={24} />
              </div>
              <h3 className="lp-bento__title">Giám Sát Chuỗi Cung Ứng Lạnh</h3>
              <p className="lp-bento__desc">
                Cảm biến IoT: kiểm soát nhiệt độ -25°C đến +4°C, độ ẩm và cảnh báo mở khóa niêm
                phong trái phép thời gian thực.
              </p>
              <div className="lp-bento__foot">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ❄️ Độ chính xác: ±0.1°C (HACCP)
                </span>
              </div>
            </Reveal>

            {/* Card 5: span 4 — System Overview + Shipment Fleet */}
            <Reveal delay={0.15} className="lp-bento__card lp-bento__card--4">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span className="lp-chip is-active" style={{ cursor: 'default' }}>
                  System Overview
                </span>
                <span className="lp-chip" style={{ cursor: 'default' }}>
                  Shipment Fleet
                </span>
              </div>
              <h3 className="lp-bento__title">Trung Tâm Điều Hành &amp; Hạm Đội</h3>
              <p className="lp-bento__desc">
                Bảng điều khiển tập trung cho 6 vai trò: Quản trị viên, Điều phối viên, Quản lý an
                toàn, Kiểm toán ESG, Tài xế và Chủ hàng B2B.
              </p>
              <div className="lp-bento__foot">
                <button
                  type="button"
                  className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block"
                  onClick={() => navigate('/login')}
                >
                  <Lock size={14} /> Vào Cổng Điều Hành
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 7. NET-ZERO ROADMAP + PILLARS ── */}
      <section id="dinh-huong" className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Định Hướng Net-Zero</span>
                <h2 className="lp-h2">
                  Lộ Trình Chuyển Đổi <em>Phát Thải Ròng Bằng Không</em>
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Đồng hành cùng mục tiêu trung hòa carbon của Chính phủ và các tập đoàn toàn cầu.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Roadmap timeline */}
          <Reveal>
            <div className="lp-roadmap">
              <div className="lp-roadmap__rail">
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: `${roadmapFill}%` }}
                />
              </div>
              {ROADMAP.map((ms) => {
                const stateClass =
                  ms.state === 'done' ? 'is-done' : ms.state === 'current' ? 'is-current' : '';
                return (
                  <div key={ms.year} className={`lp-milestone ${stateClass}`}>
                    <div className="lp-milestone__dot">
                      {ms.state === 'done' ? (
                        <CheckCircle2 size={20} />
                      ) : ms.state === 'current' ? (
                        <Leaf size={18} />
                      ) : (
                        <Award size={16} />
                      )}
                    </div>
                    <h3 className="lp-milestone__year">{ms.year}</h3>
                    <span className="lp-milestone__status">{ms.status}</span>
                    <h4 className="lp-milestone__title">{ms.title}</h4>
                    <p className="lp-milestone__desc">{ms.desc}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* Strategic pillars */}
          <div className="lp-pillars">
            {PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.title} delay={idx * 0.08}>
                  <div className="lp-pillar">
                    <div className="lp-pillar__icon">
                      <Icon size={24} />
                    </div>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS ── */}
      <section className="lp-section lp-section--alt">
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

      {/* ── 9. NEWS ── */}
      <section id="tin-tuc" className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head">
              <div>
                <span className="lp-eyebrow">Bản tin Vận tải &amp; Phát thải</span>
                <h2 className="lp-h2">Tin Tức &amp; Báo Cáo Mới Nhất</h2>
              </div>
              <a href="#tin-tuc" className="lp-link">
                Xem tất cả <ArrowRight size={15} />
              </a>
            </div>
          </Reveal>

          <div className="lp-news">
            {/* Featured article */}
            {NEWS.filter((n) => n.featured).map((n) => (
              <Reveal key={n.id}>
                <article className="lp-article lp-article--featured">
                  <div className="lp-article__media">
                    <img src={n.image} alt={n.title} loading="lazy" />
                    <span className="lp-article__tag">{n.category}</span>
                  </div>
                  <div className="lp-article__body">
                    <div className="lp-article__meta">
                      <span>
                        <Calendar size={13} /> {n.date}
                      </span>
                      <span>• {n.readTime}</span>
                    </div>
                    <h3 className="lp-article__title">{n.title}</h3>
                    <p className="lp-article__summary">{n.summary}</p>
                    <button type="button" className="lp-link" style={{ marginTop: 'auto' }}>
                      Đọc chi tiết <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}

            {/* Side articles */}
            <div className="lp-news__side">
              {NEWS.filter((n) => !n.featured).map((n, idx) => (
                <Reveal key={n.id} delay={idx * 0.1}>
                  <article className="lp-article lp-article--row">
                    <div className="lp-article__media">
                      <img src={n.image} alt={n.title} loading="lazy" />
                      <span className="lp-article__tag">{n.category}</span>
                    </div>
                    <div className="lp-article__body">
                      <div className="lp-article__meta">
                        <span>
                          <Calendar size={13} /> {n.date}
                        </span>
                        <span>• {n.readTime}</span>
                      </div>
                      <h3 className="lp-article__title">{n.title}</h3>
                      <p className="lp-article__summary">{n.summary}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. FAQ + CONTACT ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-container">
          <div className="lp-faq-grid">
            {/* Left: FAQ accordion */}
            <div>
              <Reveal>
                <span className="lp-eyebrow">Giải đáp doanh nghiệp</span>
                <h2 className="lp-h2">Câu Hỏi Thường Gặp</h2>
              </Reveal>
              <div className="lp-faq">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <Reveal key={faq.q} delay={idx * 0.06}>
                      <div className={`lp-faq__item ${isOpen ? 'is-open' : ''}`}>
                        <button
                          type="button"
                          className="lp-faq__q"
                          onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                          aria-expanded={isOpen}
                        >
                          <span>{faq.q}</span>
                          <Plus size={18} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div className="lp-faq__a">{faq.a}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>

            {/* Right: contact form */}
            <Reveal delay={0.15}>
              <div className="lp-panel" style={{ position: 'sticky', top: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Send size={18} color="var(--accent-green)" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Đăng Ký Tư Vấn &amp; Demo</h3>
                </div>
                <p className="lp-panel__desc" style={{ marginBottom: 20 }}>
                  Đội ngũ chuyên gia ESG và kỹ sư Logistics của CCADRO sẽ hỗ trợ khảo sát và tính
                  toán tiềm năng cắt giảm phát thải cho đội xe của bạn trong 24 giờ.
                </p>

                {contactSubmitted ? (
                  <div className="lp-success">
                    <CheckCircle2
                      size={32}
                      color="var(--accent-green)"
                      style={{ margin: '0 auto 10px auto', display: 'block' }}
                    />
                    <strong style={{ display: 'block', fontSize: '1rem', marginBottom: 4 }}>
                      Gửi Yêu Cầu Thành Công!
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Chuyên viên CCADRO sẽ liên hệ qua email <strong>{contactEmail}</strong> sớm
                      nhất.
                    </span>
                  </div>
                ) : (
                  <form className="lp-form" onSubmit={handleContactSubmit}>
                    <div>
                      <label>Họ và Tên</label>
                      <input
                        className="lp-input"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div>
                      <label>Email Doanh Nghiệp</label>
                      <input
                        className="lp-input"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <label>Tên Doanh Nghiệp &amp; Quy Mô Hạm Đội</label>
                      <input
                        className="lp-input"
                        type="text"
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        placeholder="Tập đoàn ABC • 50 xe tải"
                      />
                    </div>
                    <button type="submit" className="lp-btn lp-btn--primary lp-btn--block">
                      Gửi Yêu Cầu Khảo Sát Miễn Phí <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 11. CTA BAND ── */}
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
                <a href="#thong-ke-carbon" className="lp-btn lp-btn--ghost">
                  Xem Báo Cáo CO2
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 12. FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__grid">
            {/* Col 1: brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span className="logo-badge">C</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>CCADRO Ecosystem</span>
              </div>
              <p className="lp-footer__about">
                Tổng công ty Giải pháp Công nghệ Chuỗi Cung Ứng Xanh &amp; Giám Sát Vận Tải Đa
                Phương Thức CCADRO.
              </p>
              <span
                className="lp-chip is-active"
                style={{ cursor: 'default', fontSize: '0.72rem' }}
              >
                <ShieldCheck size={13} /> GLEC v3 &amp; ISO 14083
              </span>
            </div>

            {/* Col 2: solutions */}
            <div>
              <h4>Giải Pháp</h4>
              <ul>
                <li>Lập lộ trình xanh Pareto</li>
                <li>Giám sát GPS &amp; Buffer</li>
                <li>Đổi lộ trình tránh ùn tắc</li>
                <li>Kiểm toán GLEC v3</li>
                <li>Định mức hành lang</li>
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

            {/* Col 4: portal */}
            <div>
              <h4>Cổng Điều Hành Nội Bộ</h4>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: 14
                }}
              >
                Dành riêng cho cán bộ quản lý, điều phối viên, kiểm định viên và khách hàng B2B.
              </p>
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-btn--sm lp-btn--block"
                onClick={() => navigate('/login')}
              >
                <Lock size={14} /> Đăng Nhập Cổng Nội Bộ
              </button>
            </div>
          </div>

          <div className="lp-footer__bottom">
            <span>© 2026 CCADRO Green Logistics Tracker Corporation. All rights reserved.</span>
            <div>
              <span>Chính sách bảo mật</span>
              <span>Điều khoản dịch vụ</span>
              <span>Quy chuẩn ESG ISO 14064</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
