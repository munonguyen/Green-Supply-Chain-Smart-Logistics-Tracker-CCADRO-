import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  Radio,
  Snowflake
} from 'lucide-react';
import '../styles/landing.css';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import Reveal from '../components/ui/Reveal';
import { IMAGES, VIDEOS } from '../components/landing/landingContent';

const WORKFLOW_STEPS = [
  {
    code: 'UC05',
    title: 'Lập Lộ Trình Xanh Đa Mục Tiêu Pareto',
    desc: 'Phân tích đồng thời 4 trọng số: Phát thải CO2e (40%), Thời gian hành trình (30%), Chi phí vận hành (20%) và Rủi ro ùn tắc (10%) để đề xuất 3 phương án tối ưu: Greenest, Fastest và Balanced.'
  },
  {
    code: 'UC09',
    title: 'Giám Sát Đệm Không Gian PostGIS (50m / 200m)',
    desc: 'Mỗi chuyến xe đang chạy được đối chiếu tọa độ GPS từng giây với hành lang tuyến đã duyệt. Tự động kích hoạt cảnh báo vàng ở ngưỡng 50m và báo động đỏ ở ngưỡng 200m sau 3 bản tin liên tiếp.'
  },
  {
    code: 'UC10',
    title: 'Tái Định Tuyến Động Có Phê Duyệt (Human-in-the-Loop)',
    desc: 'Khi phát hiện ùn tắc nghiêm trọng hoặc lệch tuyến, hệ thống chỉ sinh đề xuất lộ trình mới nếu mức cải thiện đạt tối thiểu 10% và chờ Điều phối viên phê duyệt (ACCEPTED).'
  },
  {
    code: 'UC12 & UC13',
    title: 'Kiểm Toán Carbon GLEC v3 & Định Mức Hành Lang',
    desc: 'Tự động quyết toán phát thải thực tế sau chuyến đi dựa trên tải trọng thực và quãng đường GPS, đồng thời so sánh hiệu suất giữa các hành lang vận tải.'
  }
];

export default function SolutionsPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      <LandingNavbar />

      {/* ── 1. SUBPAGE AMBIENT VIDEO HERO ── */}
      <section className="lp-subhero">
        <div className="lp-subhero__media">
          <video
            src={VIDEOS.smartRoutingOps}
            poster={IMAGES.hero}
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
              <span className="lp-eyebrow">Hệ Sinh Thái Giải Pháp Công Nghệ</span>
              <h1 className="lp-h2" style={{ color: '#fff', marginTop: 14 }}>
                Kiến Trúc Điều Hành <em>Logistics Xanh</em> Toàn Diện
              </h1>
              <p className="lp-lead" style={{ color: 'rgba(255,255,255,0.82)' }}>
                Tích hợp liền mạch từ khâu lập kế hoạch tuyến đường đa tiêu chí, giám sát hành lang
                địa lý PostGIS thời gian thực đến quyết toán phát thải chuẩn quốc tế cho 6 vai trò
                vận hành.
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={() => navigate('/login')}
                >
                  Trải Nghiệm Cổng Điều Hành <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost"
                  onClick={() => navigate('/thong-ke-carbon')}
                >
                  Xem Công Cụ Tính CO2e
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="lp-live">
              <div className="lp-live__head">
                <span>ARCHITECTURE • ENGINE SPECS</span>
                <span className="radar-dot" />
              </div>
              <div className="lp-live__value">
                4<span className="lp-live__unit">Trọng số Pareto</span>
              </div>
              <p className="lp-live__sub">Tối ưu hóa đa mục tiêu &amp; Giám sát không gian</p>
              <div className="lp-live__rows">
                <div className="lp-live__row">
                  <span>Trọng số mặc định (CO2 / ETA / Cost / Risk)</span>
                  <strong>40 / 30 / 20 / 10</strong>
                </div>
                <div className="lp-live__row">
                  <span>Hành lang đệm PostGIS</span>
                  <strong>50m Vàng • 200m Đỏ</strong>
                </div>
                <div className="lp-live__row">
                  <span>Tần suất cập nhật luồng SSE</span>
                  <strong>1 Hz (&lt; 2 giây)</strong>
                </div>
                <div className="lp-live__row">
                  <span>Phân quyền bảo mật nội bộ &amp; B2B</span>
                  <strong>6 Vai trò RBAC</strong>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 2. BENTO GRID MODULES ── */}
      <section id="giai-phap" className="lp-section lp-section--alt">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Các Phân Hệ Lõi</span>
                <h2 className="lp-h2">
                  Năm Năng Lực Cốt Lõi Của <em>Nền Tảng CCADRO</em>
                </h2>
                <p className="lp-lead" style={{ textAlign: 'center', margin: '0 auto' }}>
                  Được thiết kế chuyên biệt cho các đội xe container cảng biển, chuỗi cung ứng lạnh
                  và mạng lưới phân phối khu công nghiệp.
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
              <h3 className="lp-bento__title">Lập Lộ Trình Xanh Đa Mục Tiêu Pareto (UC05)</h3>
              <p className="lp-bento__desc">
                Phân tích đồng thời 4 tiêu chí: <strong>Phát thải CO2e (40%)</strong>,{' '}
                <strong>Thời gian (30%)</strong>, <strong>Chi phí (20%)</strong> và{' '}
                <strong>Rủi ro ùn tắc (10%)</strong> — giúp điều phối viên so sánh trực quan giữa lộ
                trình Xanh nhất, Nhanh nhất và Cân bằng.
              </p>
              <div className="lp-bento__foot">
                <button type="button" className="lp-link" onClick={() => navigate('/login')}>
                  Mô phỏng lập tuyến <ArrowRight size={14} />
                </button>
              </div>
            </Reveal>

            {/* Card 2: span 5 — UC09 GPS Buffer Deviation */}
            <Reveal delay={0.1} className="lp-bento__card lp-bento__card--5 lp-bento__card--image">
              <img src={IMAGES.containers} alt="Container freight corridor" loading="lazy" />
              <div className="lp-bento__icon">
                <Radio size={24} />
              </div>
              <h3 className="lp-bento__title">Đệm Vi Phân GPS 50m / 200m (UC09)</h3>
              <p className="lp-bento__desc">
                Hành lang an toàn PostGIS: cảnh báo vàng 50m, báo động đỏ 200m qua 3 điểm định vị
                liên tiếp với tần suất cập nhật 1 Hz.
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
              <h3 className="lp-bento__title">Điều Hướng Tránh Ùn Tắc Động (UC10)</h3>
              <p className="lp-bento__desc">
                Tự động tính phương án thay thế khi phát hiện sự cố. Chỉ kích hoạt đề xuất khi lợi
                ích &gt; 10% và có xác nhận của Điều phối viên.
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
              <h3 className="lp-bento__title">Trung Tâm Điều Hành 6 Vai Trò RBAC</h3>
              <p className="lp-bento__desc">
                Phân quyền chuyên sâu cho Quản trị viên, Điều phối viên, Quản lý an toàn, Kiểm toán
                ESG, Tài xế và Chủ hàng B2B.
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

      {/* ── 3. END-TO-END WORKFLOW ARCHITECTURE ── */}
      <section className="lp-section">
        <div className="lp-container">
          <Reveal>
            <div className="lp-section-head lp-section-head--center">
              <div>
                <span className="lp-eyebrow">Quy Trình Vận Hành Khép Kín</span>
                <h2 className="lp-h2">
                  Chu Chuẩn Xử Lý Từ <em>Khởi Tạo Vận Đơn</em> Đến <em>Chứng Nhận Carbon</em>
                </h2>
              </div>
            </div>
          </Reveal>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20
            }}
          >
            {WORKFLOW_STEPS.map((step, idx) => (
              <Reveal key={step.code} delay={idx * 0.08}>
                <div className="lp-panel" style={{ height: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12
                    }}
                  >
                    <span className="lp-chip is-active" style={{ cursor: 'default' }}>
                      <Layers size={13} /> {step.code}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Bước 0{idx + 1}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: 10 }}>
                    {step.title}
                  </h3>
                  <p className="lp-panel__desc">{step.desc}</p>
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.76rem',
                      color: 'var(--accent-green)'
                    }}
                  >
                    <CheckCircle2 size={14} /> Tự động hóa &amp; Lưu vết Kiểm toán
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
