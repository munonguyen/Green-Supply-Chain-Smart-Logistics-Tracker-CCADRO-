import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Radio } from 'lucide-react';

const TIMELINE_POINTS = [
  { time: '08:00', deviationMeters: 18, yellowAlerts: 0, redAlerts: 0, reroutes: 0 },
  { time: '09:00', deviationMeters: 42, yellowAlerts: 1, redAlerts: 0, reroutes: 0 },
  { time: '10:00', deviationMeters: 75, yellowAlerts: 2, redAlerts: 0, reroutes: 0 },
  { time: '11:00', deviationMeters: 230, yellowAlerts: 1, redAlerts: 1, reroutes: 1 },
  { time: '12:00', deviationMeters: 90, yellowAlerts: 1, redAlerts: 0, reroutes: 0 },
  { time: '13:00', deviationMeters: 30, yellowAlerts: 0, redAlerts: 0, reroutes: 0 },
  { time: '14:00', deviationMeters: 45, yellowAlerts: 0, redAlerts: 0, reroutes: 0 },
  { time: '15:00', deviationMeters: 185, yellowAlerts: 3, redAlerts: 0, reroutes: 0 },
  { time: '16:00', deviationMeters: 300, yellowAlerts: 2, redAlerts: 1, reroutes: 1 },
  { time: '17:00', deviationMeters: 60, yellowAlerts: 0, redAlerts: 0, reroutes: 0 }
];

export default function DeviationTrendSparkline() {
  const [selectedPoint, setSelectedPoint] = useState(TIMELINE_POINTS[8]); // Default to 16:00 peak

  const svgWidth = 500;
  const svgHeight = 130;
  const maxMeters = 350;

  // Build SVG path
  const points = TIMELINE_POINTS.map((pt, idx) => {
    const x = (idx / (TIMELINE_POINTS.length - 1)) * svgWidth;
    const y = svgHeight - (pt.deviationMeters / maxMeters) * svgHeight;
    return { ...pt, x, y };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  return (
    <div className="card chart-card glass-card-interactive">
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Radio size={18} color="#ef4444" />
            <span>Tần Suất Lệch Tuyến & Đổi Lộ Trình Động (UC09 / UC10)</span>
          </div>
          <div className="chart-subtitle">
            Cảnh báo lệch hành lang (Vàng 50m, Đỏ 200m) và Đề xuất tối ưu lại lộ trình
          </div>
        </div>

        <div className="badge badge-red">
          <span className="radar-dot radar-dot-red" style={{ marginRight: '4px' }}></span>
          <span>Buffer 50m / 200m Active</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: `${svgHeight + 25}px` }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height={svgHeight}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="deviationArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>

            {/* Threshold line: Red 200m */}
            <pattern id="redThreshold" width="4" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Threshold reference lines */}
          <line
            x1="0"
            y1={svgHeight - (200 / maxMeters) * svgHeight}
            x2={svgWidth}
            y2={svgHeight - (200 / maxMeters) * svgHeight}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <text
            x={svgWidth - 65}
            y={svgHeight - (200 / maxMeters) * svgHeight - 4}
            fill="#f87171"
            fontSize="8"
            fontWeight="bold"
          >
            Ngưỡng Đỏ 200m
          </text>

          <line
            x1="0"
            y1={svgHeight - (50 / maxMeters) * svgHeight}
            x2={svgWidth}
            y2={svgHeight - (50 / maxMeters) * svgHeight}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <text
            x={svgWidth - 75}
            y={svgHeight - (50 / maxMeters) * svgHeight - 4}
            fill="#fcd34d"
            fontSize="8"
            fontWeight="bold"
          >
            Ngưỡng Vàng 50m
          </text>

          {/* Area under curve */}
          <motion.path
            d={areaD}
            fill="url(#deviationArea)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />

          {/* Line stroke */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />

          {/* Interactive Data Points */}
          {points.map((pt) => {
            const isSelected = selectedPoint?.time === pt.time;
            const isCritical = pt.deviationMeters >= 200;

            return (
              <g key={pt.time} onClick={() => setSelectedPoint(pt)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : isCritical ? 5 : 3}
                  fill={isCritical ? '#ef4444' : pt.deviationMeters >= 50 ? '#f59e0b' : '#34d399'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  filter={isSelected ? 'drop-shadow(0 0 6px #ef4444)' : 'none'}
                />
              </g>
            );
          })}
        </svg>

        {/* Timeline Bottom Labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: '#64748b',
            marginTop: '6px'
          }}
        >
          {TIMELINE_POINTS.map((pt) => (
            <span
              key={pt.time}
              style={{
                color: selectedPoint?.time === pt.time ? '#ef4444' : '#64748b',
                fontWeight: selectedPoint?.time === pt.time ? 700 : 400
              }}
            >
              {pt.time}
            </span>
          ))}
        </div>
      </div>

      {/* Selected Point Details Bar */}
      {selectedPoint && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="#f87171" />
            <span>
              Mốc <strong>{selectedPoint.time}</strong>: Độ lệch GPS{' '}
              <strong
                style={{ color: selectedPoint.deviationMeters >= 200 ? '#ef4444' : '#f59e0b' }}
              >
                {selectedPoint.deviationMeters}m
              </strong>{' '}
              (
              {selectedPoint.deviationMeters >= 200
                ? 'Vượt ngưỡng Đỏ >200m'
                : 'Trong tầm kiểm soát'}
              )
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
              Vàng: {selectedPoint.yellowAlerts}
            </span>
            <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
              Đỏ: {selectedPoint.redAlerts}
            </span>
            {selectedPoint.reroutes > 0 && (
              <span
                className="badge badge-purple"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              >
                UC10 Đổi Tuyến: {selectedPoint.reroutes}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
