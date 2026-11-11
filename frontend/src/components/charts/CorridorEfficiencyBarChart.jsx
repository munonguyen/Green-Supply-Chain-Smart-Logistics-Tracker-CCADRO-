import React from 'react';
import { motion } from 'motion/react';
import { Activity, Gauge } from 'lucide-react';

const CORRIDOR_METRICS = [
  {
    name: 'QL13 (TP.HCM → VSIP Bình Dương)',
    avgSpeed: 44,
    congestionLevel: 'LOW',
    congestionScore: 25,
    greenRating: 92,
    color: '#10b981',
    statusText: 'Thông thoáng • Tiết kiệm nhiên liệu'
  },
  {
    name: 'Cát Lái → Đồng Văn Cống → Vành Đai 2',
    avgSpeed: 32,
    congestionLevel: 'MEDIUM',
    congestionScore: 60,
    greenRating: 81,
    color: '#0ea5e9',
    statusText: 'Mật độ container cao • Ổn định'
  },
  {
    name: 'Cầu Phú Mỹ → Võ Chí Công (Hành lang Cảng)',
    avgSpeed: 24,
    congestionLevel: 'HIGH',
    congestionScore: 85,
    greenRating: 64,
    color: '#ef4444',
    statusText: 'Nguy cơ ùn tắc • Sẵn sàng kích hoạt UC10 Reroute'
  },
  {
    name: 'Cao Tốc Long Thành → Cảng Cái Mép',
    avgSpeed: 62,
    congestionLevel: 'OPTIMAL',
    congestionScore: 15,
    greenRating: 96,
    color: '#10b981',
    statusText: 'Vận tốc tối ưu • Hiệu suất GLEC v3 cao nhất'
  }
];

export default function CorridorEfficiencyBarChart() {
  return (
    <div className="card chart-card glass-card-interactive">
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Gauge size={18} color="#f59e0b" />
            <span>Hiệu Suất Vận Hành & Rủi Ro Ùn Tắc Hành Lang (UC10)</span>
          </div>
          <div className="chart-subtitle">
            Tốc độ trung bình (km/h) và Điểm xanh Logistics (Eco-Score /100) theo thời gian thực
          </div>
        </div>

        <div className="badge badge-amber">
          <Activity size={13} />
          <span>Theo Dõi Đa Tuyến OSRM / Traffic</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {CORRIDOR_METRICS.map((corridor, idx) => (
          <div
            key={corridor.name}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {corridor.name}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: corridor.color,
                    marginLeft: '8px',
                    fontWeight: 600
                  }}
                >
                  • {corridor.statusText}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Vận tốc: <strong style={{ color: '#fff' }}>{corridor.avgSpeed} km/h</strong>
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: corridor.greenRating >= 80 ? '#34d399' : '#fca5a5',
                    fontWeight: 700,
                    background:
                      corridor.greenRating >= 80
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  Eco: {corridor.greenRating}/100
                </span>
              </div>
            </div>

            {/* Progress Gauge */}
            <div
              style={{
                height: '7px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${corridor.greenRating}%` }}
                transition={{ duration: 0.8, delay: idx * 0.15 }}
                style={{
                  height: '100%',
                  background:
                    corridor.greenRating >= 85
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : corridor.greenRating >= 75
                        ? 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)'
                        : 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                  borderRadius: '999px',
                  boxShadow: `0 0 10px ${corridor.color}`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
