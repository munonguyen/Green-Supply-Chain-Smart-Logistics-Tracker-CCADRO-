import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calendar, CheckCircle2, Plus, Send } from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import Reveal from '../components/ui/Reveal';
import { FAQS, IMAGES, NEWS, VIDEOS } from '../components/landing/landingContent';

export default function NewsPage() {
  const [openFaq, setOpenFaq] = useState(0);
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

  return (
    <div className="lp-root">
      <LandingNavbar />

      {/* ── 1. SUBPAGE AMBIENT VIDEO HERO ── */}
      <section className="lp-subhero">
        <div className="lp-subhero__media">
          <video src={VIDEOS.portCorridor} poster={IMAGES.hero} autoPlay muted loop playsInline />
        </div>
        <div className="lp-subhero__overlay" />

        <div className="lp-container lp-subhero__grid">
          <div>
            <Reveal>
              <span className="lp-eyebrow">Trung Tâm Truyền Thông &amp; Ấn Phẩm ESG</span>
              <h1 className="lp-h2" style={{ color: '#fff', marginTop: 14 }}>
                Tin Tức, Nghiên Cứu Điển Hình &amp; <em>Báo Cáo Phát Thải</em> Định Kỳ
              </h1>
              <p className="lp-lead" style={{ color: 'rgba(255,255,255,0.82)' }}>
                Cập nhật các nghiên cứu thực tiễn về cắt giảm CO2e trên từng hành lang vận tải, tiêu
                chuẩn quốc tế ISO 14083 mới nhất và hoạt động chuyển đổi xanh cùng đối tác B2B.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="lp-live">
              <div className="lp-live__head">
                <span>ESG REPORT • Q4/2026</span>
                <span className="radar-dot" />
              </div>
              <div className="lp-live__value">
                12.450<span className="lp-live__unit">chuyến</span>
              </div>
              <p className="lp-live__sub">Tổng số chuyến hàng đã hoàn tất kiểm kê khí nhà kính</p>
              <div className="lp-live__rows">
                <div className="lp-live__row">
                  <span>Hành lang Cát Lái – VSIP 1</span>
                  <strong>-23,7% CO2e</strong>
                </div>
                <div className="lp-live__row">
                  <span>Hành lang Cái Mép – Sóng Thần</span>
                  <strong>-21,4% CO2e</strong>
                </div>
                <div className="lp-live__row">
                  <span>Hành lang Hiệp Phước – Tân Bình</span>
                  <strong>-26,8% CO2e</strong>
                </div>
                <div className="lp-live__row">
                  <span>Chuẩn công bố thông tin</span>
                  <strong>GRI &amp; ISO 14083</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. FEATURED ARTICLES ── */}
      <section id="tin-tuc" className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head">
              <div>
                <span className="lp-eyebrow">Bản tin Vận tải &amp; Phát thải</span>
                <h2 className="lp-h2">Bài Viết &amp; Nghiên Cứu Điển Hình</h2>
              </div>
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

      {/* ── 3. FAQ + CONTACT ── */}
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

      <LandingFooter />
    </div>
  );
}
