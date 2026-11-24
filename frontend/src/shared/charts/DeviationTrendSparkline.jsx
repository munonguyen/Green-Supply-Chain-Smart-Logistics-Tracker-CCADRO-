import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Radio } from 'lucide-react';

export default function DeviationTrendSparkline({
  liveFleet = [],
  notifications = [],
  incidents = []
}) {
  const { timelinePoints, isLiveSource } = useMemo(() => {
    const merged = [];

    (liveFleet || []).forEach((f, idx) => {
      const meters = Math.round(Number(f.deviationMeters || 0));
      const ts = f.lastTelemetryAt ? new Date(f.lastTelemetryAt) : null;
      const timeLabel = ts && !Number.isNaN(ts.getTime())
        ? ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : f.vehicleCode || `Xe-${idx + 1}`;
      merged.push({
        id: `fleet-${f.tripId || idx}`,
        time: timeLabel,
        label: `${f.vehicleCode || 'Xe'} (${f.licensePlate || 'GPS'})`,
        deviationMeters: meters,
        yellowAlerts: meters >= 50 && meters < 200 ? 1 : 0,
        redAlerts: meters >= 200 ? 1 : 0,
        reroutes: f.deviationStatus === 'CRITICAL_200M' ? 1 : 0,
        tsMs: ts ? ts.getTime() : Date.now() - idx * 60000
      });
    });

    (notifications || []).forEach((n, idx) => {
      const isCrit =
        n.severity === 'CRITICAL' ||
        String(n.eventType || '').includes('RED') ||
        String(n.title || '').includes('200m');
      const isWarn = n.severity === 'HIGH' || String(n.eventType || '').includes('INCIDENT');
      const meters = isCrit ? 260 : isWarn ? 120 : 35;
      const ts = n.createdAt ? new Date(n.createdAt) : null;
      merged.push({
        id: `notif-${n.id || idx}`,
        time: ts && !Number.isNaN(ts.getTime())
          ? ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : `CB-${idx + 1}`,
        label: n.title || n.notificationCode || 'Cảnh báo hành lang',
        deviationMeters: meters,
        yellowAlerts: isWarn && !isCrit ? 1 : 0,
        redAlerts: isCrit ? 1 : 0,
        reroutes: isCrit ? 1 : 0,
        tsMs: ts ? ts.getTime() : Date.now() - (idx + 5) * 60000
      });
    });

    (incidents || []).forEach((inc, idx) => {
      const isCrit = inc.severity === 'CRITICAL';
      const meters = isCrit ? 240 : 95;
      const ts = inc.createdAt ? new Date(inc.createdAt) : null;
      merged.push({
        id: `inc-${inc.id || idx}`,
        time: ts && !Number.isNaN(ts.getTime())
          ? ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : `SC-${idx + 1}`,
        label: inc.description || inc.incidentType || 'Sự cố hiện trường',
        deviationMeters: meters,
        yellowAlerts: !isCrit ? 1 : 0,
        redAlerts: isCrit ? 1 : 0,
        reroutes: isCrit ? 1 : 0,
        tsMs: ts ? ts.getTime() : Date.now() - (idx + 10) * 60000
      });
    });

    merged.sort((a, b) => a.tsMs - b.tsMs);
    const sliced = merged.slice(-10);
    return {
      timelinePoints: sliced,
      isLiveSource: liveFleet.length > 0 || notifications.length > 0 || incidents.length > 0
    };
  }, [liveFleet, notifications, incidents]);

  const [selectedIdx, setSelectedIdx] = useState(null);

  const selectedPoint = useMemo(() => {
    if (timelinePoints.length === 0) return null;
    if (selectedIdx != null && timelinePoints[selectedIdx]) {
      return timelinePoints[selectedIdx];
    }
    const maxItem = timelinePoints.reduce(
      (best, cur) => (cur.deviationMeters > best.deviationMeters ? cur : best),
      timelinePoints[0]
    );
    return maxItem;
  }, [timelinePoints, selectedIdx]);

  const svgWidth = 500;
  const svgHeight = 130;
  const maxMeters = Math.max(
    280,
    ...timelinePoints.map((p) => p.deviationMeters + 40)
  );

  const points = timelinePoints.map((pt, idx) => {
    const x =
      timelinePoints.length <= 1
        ? svgWidth / 2
        : (idx / (timelinePoints.length - 1)) * svgWidth;
    const y = svgHeight - (pt.deviationMeters / maxMeters) * svgHeight;
    return { ...pt, x, y, idx };
  });

  const pathD =
    points.length > 1
      ? points.reduce((acc, curr, idx) => {
          return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
        }, '')
      : points.length === 1
        ? `M 0 ${points[0].y} L ${svgWidth} ${points[0].y}`
        : '';

  const areaD = pathD ? `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z` : '';

  return (
    <motion.div
      className="card chart-card glass-card-interactive"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.48, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-header">
        <div>
          <div className="chart-title">
            <Radio size={18} color="#ef4444" />
            <span>Giám Sát Độ Lệch Tuyến &amp; Sự Cố Hành Trình</span>
          </div>
          <div className="chart-subtitle">
            Tổng hợp từ vị trí đội xe, sự cố và cảnh báo hành trình
          </div>
        </div>

        <div className={`badge ${isLiveSource ? 'badge-red' : 'badge-amber'}`}>
          <span className="radar-dot radar-dot-red" style={{ marginRight: '4px' }}></span>
          <span>{isLiveSource ? 'Buffer 50m / 200m Live' : 'Chờ Telemetry'}</span>
        </div>
      </div>

      {points.length === 0 ? (
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
          Chưa có bản ghi độ lệch hành lang hoặc sự cố nào từ Tracking / Incident Service.
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: '100%', height: `${svgHeight + 28}px` }}>
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
              </defs>

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
                x={svgWidth - 78}
                y={svgHeight - (200 / maxMeters) * svgHeight - 4}
                fill="#f87171"
                fontSize="8.5"
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
                x={svgWidth - 82}
                y={svgHeight - (50 / maxMeters) * svgHeight - 4}
                fill="#fcd34d"
                fontSize="8.5"
                fontWeight="bold"
              >
                Ngưỡng Vàng 50m
              </text>

              {areaD && (
                <motion.path
                  d={areaD}
                  fill="url(#deviationArea)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.85, delay: 0.2 }}
                />
              )}

              {pathD && (
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
                />
              )}

              {points.map((pt, idx) => {
                const isSelected = selectedPoint?.id === pt.id;
                const isCritical = pt.deviationMeters >= 200;

                return (
                  <g
                    key={pt.id}
                    onClick={() => setSelectedIdx(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <motion.circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6.5 : isCritical ? 5 : 3.5}
                      fill={isCritical ? '#ef4444' : pt.deviationMeters >= 50 ? '#f59e0b' : '#34d399'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      filter={isSelected ? 'drop-shadow(0 0 6px #ef4444)' : 'none'}
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ type: 'spring', stiffness: 320, delay: 0.3 + idx * 0.05 }}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.67rem',
                color: 'var(--text-muted)',
                marginTop: '6px',
                gap: 4
              }}
            >
              {points.map((pt, idx) => (
                <span
                  key={pt.id}
                  onClick={() => setSelectedIdx(idx)}
                  style={{
                    cursor: 'pointer',
                    color: selectedPoint?.id === pt.id ? '#ef4444' : 'var(--text-muted)',
                    fontWeight: selectedPoint?.id === pt.id ? 700 : 400
                  }}
                >
                  {pt.time}
                </span>
              ))}
            </div>
          </div>

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
                fontSize: '0.77rem',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <AlertTriangle size={15} color="#f87171" style={{ flexShrink: 0 }} />
                <span>
                  <strong>{selectedPoint.label}</strong> ({selectedPoint.time}): Độ lệch{' '}
                  <strong
                    style={{
                      color: selectedPoint.deviationMeters >= 200 ? '#ef4444' : '#f59e0b'
                    }}
                  >
                    {selectedPoint.deviationMeters}m
                  </strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: '0.69rem' }}>
                  Vàng: {selectedPoint.yellowAlerts}
                </span>
                <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: '0.69rem' }}>
                  Đỏ: {selectedPoint.redAlerts}
                </span>
                {selectedPoint.reroutes > 0 && (
                  <span
                    className="badge badge-purple"
                    style={{ padding: '2px 6px', fontSize: '0.69rem' }}
                  >
                    Đổi Tuyến Động
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
