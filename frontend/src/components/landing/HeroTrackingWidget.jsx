import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Leaf,
  MapPin,
  Package,
  Search,
  Thermometer,
  Truck
} from 'lucide-react';
import { DEMO_SHIPMENTS } from './landingContent';

const CODES = Object.keys(DEMO_SHIPMENTS);

/**
 * Interactive tracking console that overlaps the hero section.
 * Uses lp-track* CSS classes from landing.css.
 */
export default function HeroTrackingWidget() {
  const [query, setQuery] = useState('');
  const [activeCode, setActiveCode] = useState('SH001');
  const [error, setError] = useState('');
  const shipment = DEMO_SHIPMENTS[activeCode];

  const handleSearch = (e) => {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (DEMO_SHIPMENTS[code]) {
      setActiveCode(code);
      setError('');
    } else if (code) {
      setError(`Mã "${code}" không có trong hệ thống demo.`);
    }
  };

  const handleChip = (code) => {
    setActiveCode(code);
    setQuery(code);
    setError('');
  };

  /* Step progress fill percentage */
  const doneCount = shipment.steps.filter((s) => s.state === 'done').length;
  const activeIdx = shipment.steps.findIndex((s) => s.state === 'active');
  const fillPercent =
    activeIdx >= 0
      ? ((doneCount + 0.5) / shipment.steps.length) * 100
      : (doneCount / shipment.steps.length) * 100;

  return (
    <div className="lp-track-wrap">
      <div className="lp-container">
        <div className="lp-track">
          {/* Top: title + search */}
          <div className="lp-track__top">
            <div>
              <h2 className="lp-track__title">Theo Dõi Vận Đơn Trực Tuyến</h2>
              <p className="lp-track__subtitle">
                Nhập mã vận đơn để xem trạng thái chuyến hàng thời gian thực
              </p>
            </div>

            <div>
              <form className="lp-track__form" onSubmit={handleSearch}>
                <div className="lp-input-icon">
                  <Search size={16} />
                  <input
                    className="lp-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nhập mã vận đơn (VD: SH001)"
                  />
                </div>
                <button type="submit" className="lp-btn lp-btn--primary lp-btn--sm">
                  Tra cứu
                </button>
              </form>

              <div className="lp-track__samples">
                <span>Thử nhanh:</span>
                {CODES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`lp-chip ${c === activeCode ? 'is-active' : ''}`}
                    onClick={() => handleChip(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {error && <p className="lp-track__error">{error}</p>}
            </div>
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step progress bar */}
              <div className="lp-steps">
                <div className="lp-steps__rail">
                  <motion.div
                    className="lp-steps__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {shipment.steps.map((step, idx) => (
                  <div
                    key={step.label}
                    className={`lp-step ${step.state === 'done' ? 'is-done' : ''} ${step.state === 'active' ? 'is-active is-done' : ''}`}
                  >
                    <span className="lp-step__dot">
                      {step.state === 'done' || step.state === 'active' ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span className="lp-step__label">{step.label}</span>
                    <span className="lp-step__time">{step.time}</span>
                  </div>
                ))}
              </div>

              {/* Two-column summary + telemetry */}
              <div className="lp-track__body">
                {/* Left: shipment summary card */}
                <div className="lp-track__summary">
                  <div className="lp-track__code">
                    <strong>{shipment.code}</strong>
                    <span
                      className="lp-chip is-active"
                      style={{ cursor: 'default', fontSize: '0.72rem' }}
                    >
                      <span className="radar-dot" style={{ width: 6, height: 6, flexShrink: 0 }} />
                      {shipment.status}
                    </span>
                  </div>

                  {/* Route line */}
                  <div className="lp-track__route">
                    <div className="lp-track__route-line">
                      <i />
                      <span />
                      <i />
                    </div>
                    <div>
                      <strong>{shipment.origin}</strong>
                      <small>{shipment.originArea}</small>
                    </div>
                    <div>
                      <strong>{shipment.destination}</strong>
                      <small>{shipment.destinationArea}</small>
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="lp-track__meta">
                    <div>
                      <span>
                        <Truck size={13} /> Phương tiện
                      </span>
                      <strong>{shipment.vehicle}</strong>
                    </div>
                    <div>
                      <span>
                        <Package size={13} /> Khách hàng
                      </span>
                      <strong>{shipment.customer}</strong>
                    </div>
                    <div>
                      <span>Biển số</span>
                      <strong>{shipment.plate}</strong>
                    </div>
                    <div>
                      <span>
                        <MapPin size={13} /> Vị trí hiện tại
                      </span>
                      <strong>{shipment.location}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: telemetry tiles */}
                <div>
                  <div className="lp-tiles">
                    <div className="lp-tile lp-tile--accent">
                      <div className="lp-tile__label">
                        <Leaf size={13} /> CO2 tiết kiệm
                      </div>
                      <div
                        className="lp-tile__value"
                        style={{ color: 'var(--accent-green-light)' }}
                      >
                        -{shipment.co2SavedKg} kg
                      </div>
                      <div className="lp-tile__hint">↓ {shipment.co2Percent}% so với diesel</div>
                    </div>

                    <div className="lp-tile">
                      <div className="lp-tile__label">
                        <Clock size={13} /> ETA
                      </div>
                      <div className="lp-tile__value">{shipment.etaMinutes} phút</div>
                      <div className="lp-tile__hint">{shipment.distanceKm} km tổng quãng đường</div>
                    </div>

                    <div className="lp-tile">
                      <div className="lp-tile__label">
                        <Gauge size={13} /> Tốc độ
                      </div>
                      <div className="lp-tile__value">{shipment.speed} km/h</div>
                      <div className="lp-tile__hint">Đang lưu thông bình thường</div>
                    </div>

                    <div className="lp-tile">
                      <div className="lp-tile__label">
                        <Thermometer size={13} /> Nhiệt độ
                      </div>
                      <div className="lp-tile__value">{shipment.temperature}°C</div>
                      <div className="lp-tile__hint">Chuỗi lạnh ổn định</div>
                    </div>
                  </div>

                  {/* Footer link */}
                  <div className="lp-track__foot">
                    <span>Dữ liệu được cập nhật mỗi 2 giây (demo)</span>
                    <a href="/login" className="lp-link">
                      Xem bản đồ GPS đầy đủ <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
