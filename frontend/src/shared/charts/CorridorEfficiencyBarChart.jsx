import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, Gauge } from 'lucide-react';
import { CountingNumber } from '../components/CountingNumber';

export default function CorridorEfficiencyBarChart({ liveFleet = [], shipments = [] }) {
  const { corridors, isLiveBackend } = useMemo(() => {
    if (Array.isArray(liveFleet) && liveFleet.length > 0) {
      const grouped = new Map();
      liveFleet.forEach((v) => {
        const origin = (v.originName || 'Điểm đi').split(',')[0];
        const dest = (v.destinationName || 'Điểm đến').split(',')[0];
        const key = `${origin} → ${dest}`;
        const prev = grouped.get(key) || {
          name: key,
          speeds: [],
          deviations: [],
          vehicleCount: 0
        };
        if (v.speedKmh != null && Number(v.speedKmh) > 0) prev.speeds.push(Number(v.speedKmh));
        prev.deviations.push(Number(v.deviationMeters || 0));
        prev.vehicleCount += 1;
        grouped.set(key, prev);
      });

      const list = Array.from(grouped.values())
        .slice(0, 4)
        .map((g) => {
          const avgSpeed =
            g.speeds.length > 0
              ? Math.round(g.speeds.reduce((a, b) => a + b, 0) / g.speeds.length)
              : 0;
          const maxDev = Math.max(0, ...g.deviations);
          const isHigh = maxDev > 200 || (avgSpeed > 0 && avgSpeed < 28);
          const isMed = !isHigh && (maxDev > 50 || (avgSpeed > 0 && avgSpeed < 42));
          const greenRating = isHigh
            ? 64
            : isMed
              ? 80
              : Math.min(98, Math.max(84, 72 + Math.round(avgSpeed * 0.35)));
          const color = isHigh ? '#ef4444' : isMed ? '#0ea5e9' : '#10b981';
          const statusText = isHigh
            ? `Lệch ${Math.round(maxDev)}m / tốc độ chậm • Sẵn sàng UC10`
            : isMed
              ? `${g.vehicleCount} xe • Cảnh báo lưu lượng trung bình`
              : `${g.vehicleCount} xe • Lưu thông thông thoáng`;
          return { name: g.name, avgSpeed, greenRating, color, statusText };
        });

      return { corridors: list, isLiveBackend: true };
    }

    const fromShipments = (shipments || [])
      .filter((s) => !s.isDeleted)
      .slice(0, 4)
      .map((s) => {
        const origin = (s.originName || 'Depot').split(',')[0];
        const dest = (s.destinationName || 'Kho đích').split(',')[0];
        const spd = Number(s.speedKmh || 0);
        const isCompleted = s.status === 'COMPLETED';
        const isPending = s.status === 'PENDING';
        const rating = isCompleted ? 94 : isPending ? 72 : 86;
        const color = isPending ? '#f59e0b' : '#10b981';
        const statusText = isCompleted
          ? 'Hoàn tất bàn giao ePOD'
          : isPending
            ? 'Đang chờ điều phối xuất bến'
            : 'Đang khai thác trên hành lang';
        return {
          name: `${origin} → ${dest}`,
          avgSpeed: spd,
          greenRating: rating,
          color,
          statusText
        };
      });

    return { corridors: fromShipments, isLiveBackend: false };
  }, [liveFleet, shipments]);

  return (
    <motion.div
      className="card chart-card glass-card-interactive"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Gauge size={18} color="#f59e0b" />
            <span>Hiệu Suất Vận Hành &amp; Rủi Ro Hành Lang (UC10)</span>
          </div>
          <div className="chart-subtitle">
            {isLiveBackend
              ? 'Vận tốc đo thực tế & Eco-Score theo từng hành lang từ luồng Telemetry DB/SSE'
              : 'Tổng hợp theo danh sách Vận đơn (chờ Telemetry GPS thực từ :8888)'}
          </div>
        </div>

        <div className={`badge ${isLiveBackend ? 'badge-green' : 'badge-amber'}`}>
          <Activity size={13} />
          <span>{isLiveBackend ? 'Telemetry Live' : 'Chờ GPS DB'}</span>
        </div>
      </div>

      {corridors.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}
        >
          Chưa có tuyến xe đang lưu thông từ Tracking Service.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {corridors.map((corridor, idx) => (
            <motion.div
              key={corridor.name}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.42, delay: idx * 0.08 }}
              whileHover={{ x: 4 }}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(148, 163, 184, 0.05)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {corridor.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.71rem',
                      color: corridor.color,
                      marginLeft: '8px',
                      fontWeight: 600
                    }}
                  >
                    • {corridor.statusText}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Tốc độ:{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {corridor.avgSpeed > 0 ? (
                        <>
                          <CountingNumber value={corridor.avgSpeed} duration={800} /> km/h
                        </>
                      ) : (
                        '--'
                      )}
                    </strong>
                  </span>
                  <span
                    style={{
                      fontSize: '0.76rem',
                      color: corridor.greenRating >= 80 ? '#10b981' : '#ef4444',
                      fontWeight: 700,
                      background:
                        corridor.greenRating >= 80
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'rgba(239, 68, 68, 0.14)',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    Eco: <CountingNumber value={corridor.greenRating} duration={900} />/100
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: '7px',
                  width: '100%',
                  background: 'rgba(148, 163, 184, 0.16)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${corridor.greenRating}%` }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.9, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: '100%',
                    background:
                      corridor.greenRating >= 85
                        ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                        : corridor.greenRating >= 75
                          ? 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)'
                          : 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
                    borderRadius: '999px'
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
