import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Leaf, TrendingDown, ArrowUpRight } from 'lucide-react';

const CORRIDOR_DATA = [
  {
    name: 'Cát Lái → VSIP 1',
    code: 'COR-01',
    distanceKm: 27.25,
    actualKgCo2: 24.8,
    benchmarkKgCo2: 32.5,
    savingsPercent: -23.7
  },
  {
    name: 'Cái Mép → KCN Q9',
    code: 'COR-02',
    distanceKm: 64.8,
    actualKgCo2: 78.4,
    benchmarkKgCo2: 95.0,
    savingsPercent: -17.5
  },
  {
    name: 'Sóng Thần → Cát Lái',
    code: 'COR-03',
    distanceKm: 22.1,
    actualKgCo2: 19.2,
    benchmarkKgCo2: 26.0,
    savingsPercent: -26.1
  },
  {
    name: 'Hiệp Phước → VSIP 2',
    code: 'COR-04',
    distanceKm: 58.4,
    actualKgCo2: 68.0,
    benchmarkKgCo2: 74.2,
    savingsPercent: -8.3
  }
];

export default function CarbonBenchmarkChart() {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const maxVal = 110;
  const chartHeight = 160;

  return (
    <div className="card chart-card glass-card-interactive">
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Leaf size={18} color="#10b981" />
            <span>Định Mức Phát Thải Hành Lang GLEC v3 (UC13)</span>
          </div>
          <div className="chart-subtitle">
            So sánh phát thải thực tế (Actual) và định mức hành lang chuẩn (Corridor Benchmark)
          </div>
        </div>

        <div className="chart-legend">
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ backgroundColor: '#10b981' }}></span>
            <span>Thực Tế (kgCO2e)</span>
          </div>
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ backgroundColor: '#64748b' }}></span>
            <span>Định Mức GLEC</span>
          </div>
        </div>
      </div>

      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        {/* SVG Grouped Bar Chart */}
        <div style={{ position: 'relative', width: '100%', height: `${chartHeight + 40}px` }}>
          <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = chartHeight - (val / maxVal) * chartHeight;
              return (
                <g key={val}>
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="0"
                    y={y - 4}
                    fill="rgba(148, 163, 184, 0.4)"
                    fontSize="9"
                    fontFamily="inherit"
                  >
                    {val} kg
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {CORRIDOR_DATA.map((item, idx) => {
              const totalCorridors = CORRIDOR_DATA.length;
              const groupWidth = 100 / totalCorridors;
              const barWidth = 18;
              const groupCenterX = `${groupWidth * idx + groupWidth / 2}%`;

              const actualHeight = (item.actualKgCo2 / maxVal) * chartHeight;
              const benchmarkHeight = (item.benchmarkKgCo2 / maxVal) * chartHeight;

              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={item.code}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Benchmark Bar (Gray) */}
                  <motion.rect
                    x={`calc(${groupCenterX} + 2px)`}
                    y={chartHeight - benchmarkHeight}
                    width={barWidth}
                    height={benchmarkHeight}
                    rx="4"
                    fill="url(#benchmarkGradient)"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    style={{ transformOrigin: `bottom` }}
                  />

                  {/* Actual Bar (Emerald) */}
                  <motion.rect
                    x={`calc(${groupCenterX} - ${barWidth + 2}px)`}
                    y={chartHeight - actualHeight}
                    width={barWidth}
                    height={actualHeight}
                    rx="4"
                    fill="url(#actualGradient)"
                    filter={isHovered ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))' : 'none'}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: idx * 0.12 }}
                    style={{ transformOrigin: `bottom` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* X-Axis Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '10px',
              padding: '0 10px'
            }}
          >
            {CORRIDOR_DATA.map((item, idx) => (
              <div
                key={item.code}
                style={{
                  textAlign: 'center',
                  flex: 1,
                  color: hoveredIdx === idx ? '#34d399' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  transition: 'color 0.2s'
                }}
              >
                <div>{item.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.distanceKm} km</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Highlight Footer */}
        <div
          style={{
            marginTop: '14px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={16} color="#34d399" />
            <span>
              {hoveredIdx !== null ? (
                <>
                  Hành lang <strong>{CORRIDOR_DATA[hoveredIdx].name}</strong>: Thực tế{' '}
                  <strong style={{ color: '#34d399' }}>
                    {CORRIDOR_DATA[hoveredIdx].actualKgCo2} kg
                  </strong>{' '}
                  vs Định mức {CORRIDOR_DATA[hoveredIdx].benchmarkKgCo2} kg
                </>
              ) : (
                'Trung bình toàn mạng lưới: Tiết kiệm -18.9% lượng khí thải CO2e nhờ Thuật toán Pareto UC05'
              )}
            </span>
          </div>

          <span
            style={{
              color: '#34d399',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {hoveredIdx !== null ? `${CORRIDOR_DATA[hoveredIdx].savingsPercent}%` : '-18.9%'}
            <ArrowUpRight size={14} style={{ transform: 'rotate(90deg)' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
