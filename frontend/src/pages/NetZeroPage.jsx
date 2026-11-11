import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BatteryCharging,
  CheckCircle2,
  Globe2,
  Leaf,
  ShieldCheck,
  Sun
} from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import Reveal from '../components/ui/Reveal';
import { IMAGES, PILLARS, ROADMAP, VIDEOS } from '../components/landing/landingContent';

const ESG_COMMITMENTS = [
  {
    icon: BatteryCharging,
    metric: '60%',
    title: 'Điện Hóa Đội Xe Chặng Đô Thị & Liên Cảng',
    desc: 'Thay thế dần đầu kéo diesel truyền thống bằng xe tải điện (EV) và xe đạt chuẩn khí thải Euro 5 trên toàn bộ hành lang kinh tế phía Nam trước năm 2028.'
  },
  {
    icon: Sun,
    metric: '100%',
    title: 'Trạm Sạc Depot Năng Lượng Mặt Trời Áp Mái',
    desc: 'Sử dụng điện mặt trời tại 4 depot trung tâm (Cát Lái, Sóng Thần, VSIP 1, Cái Mép) để giảm phát thải Well-to-Tank (WTT) ngay từ khâu nạp năng lượng.'
  },
  {
    icon: Globe2,
    metric: 'ISO 14083',
    title: 'Sẵn Sàng Cho Cơ Chế CBAM & Kiểm Toán Scope 3',
    desc: 'Mỗi lô hàng xuất khẩu đi EU, Bắc Mỹ, Nhật Bản đều được đính kèm hồ sơ phát thải số định danh theo chuẩn GLEC Framework v3.'
  }
];

export default function NetZeroPage() {
  const navigate = useNavigate();

  const doneRoadmap = ROADMAP.filter((r) => r.state === 'done').length;
  const currentIdx = ROADMAP.findIndex((r) => r.state === 'current');
  const roadmapFill =
    currentIdx >= 0
      ? ((doneRoadmap + 0.5) / ROADMAP.length) * 100
      : (doneRoadmap / ROADMAP.length) * 100;

  return (
    <div className="lp-root">
      <LandingNavbar />

      {/* ── 1. SUBPAGE AMBIENT VIDEO HERO ── */}
      <section className="lp-subhero">
        <div className="lp-subhero__media">
          <video
            src={VIDEOS.evFleetDepot}
            poster={IMAGES.evTruck}
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
        <div className="lp-subhero__overlay" />

        <div className="lp-container lp-subhero__grid">
          <div>
            <Reveal>
              <span className="lp-eyebrow">Định Hướng Chiến Lược Net-Zero 2030</span>
              <h1 className="lp-h2" style={{ color: '#fff', marginTop: 14 }}>
                Kiến Tạo Chuỗi Cung Ứng <em>Phát Thải Ròng Bằng Không</em>
              </h1>
              <p className="lp-lead" style={{ color: 'rgba(255,255,255,0.82)' }}>
                CCADRO đặt mục tiêu cắt giảm 50% cường độ phát thải trên mỗi tấn-km trước năm 2030,
                kết hợp giữa chuyển đổi phương tiện năng lượng sạch, tối ưu thuật toán lập tuyến đa
                mục tiêu và minh bạch hóa dữ liệu kiểm kê khí nhà kính.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={() => navigate('/thong-ke-carbon')}
                >
                  Xem Báo Cáo CO2e Đã Tiết Kiệm <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost"
                  onClick={() => navigate('/giai-phap')}
                >
                  Công Nghệ Lập Tuyến Xanh
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="lp-live">
              <div className="lp-live__head">
                <span>NET-ZERO 2030 • SCORECARD</span>
                <span className="radar-dot" />
              </div>
              <div className="lp-live__value">
                -50<span className="lp-live__unit">% gCO2e / tấn.km</span>
              </div>
              <p className="lp-live__sub">Mục tiêu giảm cường độ phát thải toàn mạng lưới</p>
              <div className="lp-live__rows">
                <div className="lp-live__row">
                  <span>Tỷ lệ xe điện &amp; Euro 5 hiện tại</span>
                  <strong>42% hạm đội</strong>
                </div>
                <div className="lp-live__row">
                  <span>Mục tiêu điện hóa chặng đô thị 2028</span>
                  <strong>60% hạm đội</strong>
                </div>
                <div className="lp-live__row">
                  <span>Hạ tầng trạm sạc điện mặt trời</span>
                  <strong>4 Depot trọng điểm</strong>
                </div>
                <div className="lp-live__row">
                  <span>Khung kiểm kê phát thải</span>
                  <strong>GLEC v3 &amp; ISO 14083</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. ROADMAP TIMELINE 2024 - 2030 ── */}
      <section id="dinh-huong" className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Cột Mốc Chuyển Đổi</span>
                <h2 className="lp-h2">
                  Lộ Trình Thực Thi <em>Giai Đoạn 2024 – 2030</em>
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Từng giai đoạn được đo lường bằng chỉ số cường độ phát thải thực tế (gCO2e/tấn.km)
                  và tỷ lệ phương tiện sạch trong đội xe.
                </p>
              </div>
            </div>
          </Reveal>

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

          {/* 4 Strategic pillars */}
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

      {/* ── 3. ESG COMMITMENTS & GOVERNANCE STANDARDS ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Cam Kết Bền Vững &amp; Quản Trị ESG</span>
                <h2 className="lp-h2">
                  Ba Trọng Tâm Giảm Phát Thải <em>Toàn Trình (Well-to-Wheel)</em>
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Không dừng lại ở khâu vận hành trên đường (Tank-to-Wheel), CCADRO kiểm soát cả
                  phát thải từ nguồn sản xuất năng lượng (Well-to-Tank).
                </p>
              </div>
            </div>
          </Reveal>

          <div className="lp-quotes">
            {ESG_COMMITMENTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={idx * 0.1}>
                  <div className="lp-quote">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div className="lp-quote__metric">{item.metric}</div>
                      <span className="lp-chip is-active" style={{ cursor: 'default' }}>
                        <Icon size={15} /> Chuẩn ESG
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{item.title}</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                      {item.desc}
                    </p>
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: 14,
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.78rem',
                        color: 'var(--accent-green)'
                      }}
                    >
                      <ShieldCheck size={15} /> Đã kiểm chứng theo khung GLEC v3
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
