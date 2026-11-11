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
import { CountingNumber } from '../ui/CountingNumber';

const CODES = Object.keys(DEMO_SHIPMENTS);

/**
 * Interactive tracking console that overlaps the hero section.
 * Uses lp-track* CSS classes from landing.css with smooth metric animations.
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
                Nhập mã vận đơn để xem trạng thái chuyến hàng và chỉ số telemetry thời gian thực
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
              transition={{ duration: 0.28 }}
            >
              {/* Step progress bar */}
              <div className="lp-steps">
                <div className="lp-steps__rail">
                  <motion.div
                    className="lp-steps__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${fillPercent}%` }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
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

                {/* Right: Animated telemetry tiles */}
                <div>
                  <div className="lp-tiles">
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="lp-tile lp-tile--accent"
                    >
                      <div className="lp-tile__label">
                        <Leaf size={13} /> CO2 tiết kiệm
                      </div>
                      <div
                        className="lp-tile__value"
                        style={{ color: 'var(--accent-green-light)' }}
                      >
                        -
                        <CountingNumber
                          value={shipment.co2SavedKg}
                          decimals={1}
                          startOnView={false}
                        />{' '}
                        kg
                      </div>
                      <div className="lp-tile__hint">
                        ↓{' '}
                        <CountingNumber
                          value={shipment.co2Percent}
                          decimals={1}
                          startOnView={false}
                        />
                        % so với diesel
                      </div>
                      <div className="lp-tile__meter">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, shipment.co2Percent * 2.8)}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="lp-tile"
                    >
                      <div className="lp-tile__label">
                        <Clock size={13} /> Dự kiến đến (ETA)
                      </div>
                      <div className="lp-tile__value">
                        <CountingNumber value={shipment.etaMinutes} startOnView={false} /> phút
                      </div>
                      <div className="lp-tile__hint">
                        <CountingNumber
                          value={shipment.distanceKm}
                          decimals={1}
                          startOnView={false}
                        />{' '}
                        km tổng quãng đường
                      </div>
                      <div className="lp-tile__meter">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${shipment.progress}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="lp-tile"
                    >
                      <div className="lp-tile__label">
                        <Gauge size={13} /> Vận tốc GPS
                      </div>
                      <div className="lp-tile__value">
                        <CountingNumber
                          value={shipment.speed}
                          startOnView={false}
                          liveStep={0.2}
                          decimals={1}
                          liveIntervalMs={2800}
                        />{' '}
                        km/h
                      </div>
                      <div className="lp-tile__hint">Đang lưu thông ổn định</div>
                      <div className="lp-tile__meter">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (shipment.speed / 80) * 100)}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="lp-tile"
                    >
                      <div className="lp-tile__label">
                        <Thermometer size={13} /> Nhiệt độ thùng
                      </div>
                      <div className="lp-tile__value">
                        <CountingNumber
                          value={shipment.temperature}
                          decimals={1}
                          startOnView={false}
                        />
                        °C
                      </div>
                      <div className="lp-tile__hint">Chuỗi lạnh chuẩn ±0,1°C</div>
                      <div className="lp-tile__meter">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: '92%' }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Footer link */}
                  <div className="lp-track__foot">
                    <span>
                      <span className="radar-dot" style={{ marginRight: 6 }} />
                      Đồng bộ vệ tinh liên tục mỗi 2 giây
                    </span>
                    <a href="/customer" className="lp-link">
                      Mở Cổng Khách Hàng B2B <ArrowRight size={14} />
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
