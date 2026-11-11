import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Truck, CheckCircle2, Wrench } from 'lucide-react';

const FLEET_SEGMENTS = [
  { name: 'Đang Lưu Thông (In-Transit)', count: 8, color: '#10b981', percent: 53.3, icon: Truck },
  {
    name: 'Sẵn Sàng Xuất Bến (Available)',
    count: 5,
    color: '#0ea5e9',
    percent: 33.3,
    icon: CheckCircle2
  },
  { name: 'Bảo Dưỡng & Khám Xe (UC01)', count: 2, color: '#f59e0b', percent: 13.4, icon: Wrench }
];

export default function FleetStatusDonutChart() {
  const [activeSegment, setActiveSegment] = useState(null);

  const totalVehicles = FLEET_SEGMENTS.reduce((acc, curr) => acc + curr.count, 0);

  // SVG Donut calculation
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="card chart-card glass-card-interactive">
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
          <span>100% Đạt Chuẩn Pre-Trip</span>
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
            {FLEET_SEGMENTS.map((seg, idx) => {
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: idx * 0.15 }}
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
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {activeSegment !== null ? FLEET_SEGMENTS[activeSegment].count : totalVehicles}
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
          {FLEET_SEGMENTS.map((seg, idx) => {
            const Icon = seg.icon;
            const isHovered = activeSegment === idx;

            return (
              <div
                key={seg.name}
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
                  transition: 'all 0.2s'
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
