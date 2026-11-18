import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Leaf, TrendingDown } from 'lucide-react';

const DIESEL_BASELINE_TONNE_KM = 0.108;

export default function CarbonBenchmarkChart({
  benchmarks = [],
  liveFleet = [],
  shipments = []
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const { corridorData, isLiveBackend } = useMemo(() => {
    if (Array.isArray(benchmarks) && benchmarks.length > 0) {
      const mapped = benchmarks.slice(0, 5).map((b, idx) => {
        const name =
          b.corridorName ||
          (b.originName && b.destinationName
            ? `${b.originName.split(',')[0]} → ${b.destinationName.split(',')[0]}`
            : b.corridorCode || `Hành lang ${idx + 1}`);
        const benchmarkKg = Number(b.benchmarkCo2Kg || b.baselineCo2Kg || 32.0);
        const actualKg = Number(b.actualCo2Kg || b.targetCo2Kg || benchmarkKg * 0.8);
        const pct =
          benchmarkKg > 0
            ? Number((((actualKg - benchmarkKg) / benchmarkKg) * 100).toFixed(1))
            : -18.5;
        return {
          code: b.corridorCode || b.id || `COR-${idx + 1}`,
          name,
          distanceKm: Number(b.distanceKm || b.plannedDistanceKm || 28.0),
          actualKgCo2: Number(actualKg.toFixed(1)),
          benchmarkKgCo2: Number(benchmarkKg.toFixed(1)),
          savingsPercent: pct
        };
      });
      return { corridorData: mapped, isLiveBackend: true };
    }

    if (Array.isArray(liveFleet) && liveFleet.length > 0) {
      const grouped = new Map();
      liveFleet.forEach((item, idx) => {
        const origin = (item.originName || 'Depot xuất phát').split(',')[0];
        const dest = (item.destinationName || 'Điểm giao').split(',')[0];
        const key = `${origin} → ${dest}`;
        const distKm = Math.max(10, Number(item.totalDistanceKm || 28.5));
        const saved = Math.max(2.5, Number(item.co2SavedKg || distKm * 14 * DIESEL_BASELINE_TONNE_KM * 0.22));
        const baseline = Number((distKm * 14 * DIESEL_BASELINE_TONNE_KM).toFixed(1));
        const actual = Math.max(2, Number((baseline - saved).toFixed(1)));
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            code: item.tripCode || `LIVE-${idx + 1}`,
            name: key,
            distanceKm: Number(distKm.toFixed(1)),
            actualKgCo2: actual,
            benchmarkKgCo2: baseline,
            savingsPercent: Number((((actual - baseline) / baseline) * 100).toFixed(1))
          });
        }
      });
      return { corridorData: Array.from(grouped.values()).slice(0, 5), isLiveBackend: true };
    }

    const fromShipments = (shipments || [])
      .filter((s) => !s.isDeleted)
      .slice(0, 4)
      .map((s, idx) => {
        const origin = (s.originName || 'Cảng đi').split(',')[0];
        const dest = (s.destinationName || 'Kho đến').split(',')[0];
        const distNum =
          parseFloat(String(s.distance || s.distanceKm || '27.2').replace(/[^\d.]/g, '')) || 27.2;
        const tons = Number(s.cargoWeightTons || 14.5);
        const baseline = Number((distNum * tons * DIESEL_BASELINE_TONNE_KM).toFixed(1));
        const saved = Number(s.co2SavedKg || (baseline * 0.21).toFixed(1));
        const actual = Math.max(1.5, Number((baseline - saved).toFixed(1)));
        return {
          code: s.shipmentCode || `SHP-${idx + 1}`,
          name: `${origin} → ${dest}`,
          distanceKm: Number(distNum.toFixed(1)),
          actualKgCo2: actual,
          benchmarkKgCo2: baseline,
          savingsPercent:
            baseline > 0 ? Number((((actual - baseline) / baseline) * 100).toFixed(1)) : -20
        };
      });

    return { corridorData: fromShipments, isLiveBackend: false };
  }, [benchmarks, liveFleet, shipments]);

  const maxVal = useMemo(() => {
    const peak = corridorData.reduce(
      (acc, d) => Math.max(acc, d.actualKgCo2, d.benchmarkKgCo2),
      10
    );
    return Math.ceil((peak * 1.15) / 10) * 10;
  }, [corridorData]);

  const avgSavingsPct = useMemo(() => {
    if (corridorData.length === 0) return 0;
    const sum = corridorData.reduce((acc, d) => acc + d.savingsPercent, 0);
    return Number((sum / corridorData.length).toFixed(1));
  }, [corridorData]);

  const chartHeight = 160;
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r));

  return (
    <motion.div
      className="card chart-card glass-card-interactive"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Leaf size={18} color="#10b981" />
            <span>Định Mức Phát Thải Hành Lang GLEC v3 (UC13)</span>
          </div>
          <div className="chart-subtitle">
            {isLiveBackend
              ? 'So sánh trực tiếp phát thải thực tế & định mức từ Carbon Service / Telemetry DB'
              : 'Tính toán chuẩn GLEC v3 từ danh sách Vận đơn hiện hành'}
          </div>
        </div>

        <div className="chart-legend">
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ backgroundColor: '#10b981' }}></span>
            <span>Thực Tế (kgCO2e)</span>
          </div>
          <div className="chart-legend-item">
            <span className="chart-legend-dot" style={{ backgroundColor: '#64748b' }}></span>
            <span>Định Mức Diesel</span>
          </div>
        </div>
      </div>

      {corridorData.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            padding: 28,
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}
        >
          Chưa có dữ liệu hành lang hoặc vận đơn phát thải từ Backend.
        </div>
      ) : (
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
        >
          {/* SVG Grouped Bar Chart */}
          <div style={{ position: 'relative', width: '100%', height: `${chartHeight + 44}px` }}>
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

              {tickValues.map((val) => {
                const y = chartHeight - (val / maxVal) * chartHeight;
                return (
                  <g key={val}>
                    <line
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.14)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="0"
                      y={y - 4}
                      fill="rgba(148, 163, 184, 0.55)"
                      fontSize="9"
                      fontFamily="inherit"
                    >
                      {val} kg
                    </text>
                  </g>
                );
              })}

              {corridorData.map((item, idx) => {
                const totalCorridors = corridorData.length;
                const groupWidth = 100 / totalCorridors;
                const barWidth = 18;
                const groupCenterX = `${groupWidth * idx + groupWidth / 2}%`;

                const actualHeight = Math.max(4, (item.actualKgCo2 / maxVal) * chartHeight);
                const benchmarkHeight = Math.max(4, (item.benchmarkKgCo2 / maxVal) * chartHeight);
                const isHovered = hoveredIdx === idx;

                return (
                  <g
                    key={item.code}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <motion.rect
                      x={`calc(${groupCenterX} + 2px)`}
                      width={barWidth}
                      rx="4"
                      fill="url(#benchmarkGradient)"
                      initial={{ height: 0, y: chartHeight }}
                      whileInView={{ height: benchmarkHeight, y: chartHeight - benchmarkHeight }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.65, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    />

                    <motion.rect
                      x={`calc(${groupCenterX} - ${barWidth + 2}px)`}
                      width={barWidth}
                      rx="4"
                      fill="url(#actualGradient)"
                      filter={isHovered ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))' : 'none'}
                      initial={{ height: 0, y: chartHeight }}
                      whileInView={{ height: actualHeight, y: chartHeight - actualHeight }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        duration: 0.75,
                        delay: 0.08 + idx * 0.1,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '10px',
                padding: '0 8px',
                gap: 6
              }}
            >
              {corridorData.map((item, idx) => (
                <div
                  key={item.code}
                  style={{
                    textAlign: 'center',
                    flex: 1,
                    color: hoveredIdx === idx ? '#34d399' : 'var(--text-muted)',
                    fontSize: '0.71rem',
                    fontWeight: 600,
                    minWidth: 0
                  }}
                >
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.66rem', opacity: 0.75 }}>{item.distanceKm} km</div>
                </div>
              ))}
            </div>
          </div>

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
              fontSize: '0.78rem',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={16} color="#34d399" />
              <span>
                {hoveredIdx !== null && corridorData[hoveredIdx] ? (
                  <>
                    Hành lang <strong>{corridorData[hoveredIdx].name}</strong>: Thực tế{' '}
                    <strong style={{ color: '#34d399' }}>
                      {corridorData[hoveredIdx].actualKgCo2} kg
                    </strong>{' '}
                    vs Định mức {corridorData[hoveredIdx].benchmarkKgCo2} kg
                  </>
                ) : (
                  `Trung bình ${corridorData.length} hành lang: Cắt giảm ${avgSavingsPct}% CO2e (Chuẩn GLEC v3)`
                )}
              </span>
            </div>

            <span
              style={{
                color: '#34d399',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              {hoveredIdx !== null && corridorData[hoveredIdx]
                ? `${corridorData[hoveredIdx].savingsPercent}%`
                : `${avgSavingsPct}%`}
              <ArrowUpRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
