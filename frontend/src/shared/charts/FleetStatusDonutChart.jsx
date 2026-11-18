import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Truck, CheckCircle2, Wrench } from 'lucide-react';
import { CountingNumber } from '../components/CountingNumber';

export default function FleetStatusDonutChart({ vehicles = [] }) {
  const [activeSegment, setActiveSegment] = useState(null);

  const fleetSegments = useMemo(() => {
    const inTransitCount = vehicles.filter((v) => v.status === 'IN_TRANSIT').length;
    const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
    const denom = Math.max(1, inTransitCount + availableCount + maintenanceCount);
    return [
      {
        name: 'Đang Lưu Thông (In-Transit)',
        count: inTransitCount,
        color: '#10b981',
        percent: Number(((inTransitCount / denom) * 100).toFixed(1)),
        icon: Truck
      },
      {
        name: 'Sẵn Sàng Xuất Bến (Available)',
        count: availableCount,
        color: '#0ea5e9',
        percent: Number(((availableCount / denom) * 100).toFixed(1)),
        icon: CheckCircle2
      },
      {
        name: 'Bảo Dưỡng & Khám Xe (UC01)',
        count: maintenanceCount,
        color: '#f59e0b',
        percent: Number(((maintenanceCount / denom) * 100).toFixed(1)),
        icon: Wrench
      }
    ];
  }, [vehicles]);

  const totalVehicles = fleetSegments.reduce((acc, curr) => acc + curr.count, 0);
  const compliancePct =
    totalVehicles > 0
      ? Math.round(((totalVehicles - fleetSegments[2].count) / totalVehicles) * 100)
      : 100;

  // SVG Donut calculation
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <motion.div
      className="card chart-card glass-card-interactive"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Truck size={18} color="#0ea5e9" />
            <span>Phân Bổ Hạm Đội & Kiểm Soát Tải Trọng (BRULE-01)</span>
          </div>
          <div className="chart-subtitle">
            Trạng thái trực ban hạm đội, chuẩn khí thải Euro 5 và Van điện EV
          </div>
        </div>

        <div className="badge badge-green">
          <span className="radar-dot" style={{ marginRight: '4px' }}></span>
          <span>{compliancePct}% Đạt Chuẩn Pre-Trip</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flex: 1,
          gap: '20px',
          flexWrap: 'wrap',
          padding: '10px 0'
        }}
      >
        {/* SVG Donut Center */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {fleetSegments.map((seg, idx) => {
              const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += seg.percent;

              const isHovered = activeSegment === idx;

              return (
                <motion.circle
                  key={seg.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  initial={{ strokeDasharray: `0 ${circumference}`, opacity: 0 }}
                  whileInView={{ strokeDasharray, opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.9, delay: idx * 0.14, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={() => setActiveSegment(idx)}
                  onMouseLeave={() => setActiveSegment(null)}
                  style={{
                    cursor: 'pointer',
                    transition: 'stroke-width 0.2s',
                    filter: isHovered ? `drop-shadow(0 0 8px ${seg.color})` : 'none'
                  }}
                />
              );
            })}
          </svg>

          {/* Central Donut Text */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
              <CountingNumber
                value={activeSegment !== null ? fleetSegments[activeSegment].count : totalVehicles}
                duration={700}
              />
            </div>
            <div
              style={{
                fontSize: '0.66rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginTop: '3px'
              }}
            >
              {activeSegment !== null ? 'Xe Lọc' : 'Tổng Đội Xe'}
            </div>
          </div>
        </div>

        {/* Legend List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            minWidth: '220px'
          }}
        >
          {fleetSegments.map((seg, idx) => {
            const Icon = seg.icon;
            const isHovered = activeSegment === idx;

            return (
              <motion.div
                key={seg.name}
                initial={{ opacity: 0, x: 14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.42, delay: 0.12 + idx * 0.1 }}
                whileHover={{ x: 4 }}
                onMouseEnter={() => setActiveSegment(idx)}
                onMouseLeave={() => setActiveSegment(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: isHovered ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  border: isHovered ? `1px solid ${seg.color}` : '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: seg.color
                    }}
                  ></span>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {seg.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {seg.count} Phương tiện • {seg.percent}%
                    </div>
                  </div>
                </div>

                <Icon size={16} color={seg.color} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
