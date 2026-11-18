import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CountingNumber } from '../../../../shared/components/CountingNumber';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  DollarSign,
  Leaf,
  Lock,
  ShieldCheck,
  Truck,
  Users
} from 'lucide-react';

function clampScore(val) {
  return Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
}

function getGradeMeta(score) {
  if (score >= 88) {
    return { grade: 'AAA • XUẤT SẮC', color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' };
  }
  if (score >= 74) {
    return { grade: 'AA • VẬN HÀNH TỐT', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.14)' };
  }
  if (score >= 58) {
    return { grade: 'B • CẦN TỐI ƯU', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' };
  }
  return { grade: 'C • CẢNH BÁO RỦI RO', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)' };
}

function SvgScoreRing({ score, size = 128, label = 'CCADRO Index' }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clampScore(score) / 100) * circ;
  const meta = getGradeMeta(score);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="rgba(148, 163, 184, 0.16)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={meta.color}
          strokeWidth={stroke}
          strokeDasharray={`${circ} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <strong style={{ fontSize: '1.65rem', fontWeight: 900, color: meta.color, lineHeight: 1 }}>
          <CountingNumber value={clampScore(score)} duration={950} />
        </strong>
        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 3 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function SvgRadarEvaluation({ pillars = [] }) {
  const size = 250;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 86;
  const count = pillars.length || 5;

  const pointAt = (idx, ratio) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    return [cx + Math.cos(angle) * maxR * ratio, cy + Math.sin(angle) * maxR * ratio];
  };

  const buildPolygon = (ratios) =>
    ratios
      .map((ratio, idx) => {
        const [x, y] = pointAt(idx, ratio);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const actualPoints = buildPolygon(pillars.map((p) => clampScore(p.score) / 100));
  const benchmarkPoints = buildPolygon(pillars.map(() => 0.85));

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: 260, overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon
          key={lvl}
          points={buildPolygon(pillars.map(() => lvl))}
          fill="none"
          stroke="rgba(148, 163, 184, 0.22)"
          strokeWidth={1}
        />
      ))}

      {pillars.map((p, idx) => {
        const [x, y] = pointAt(idx, 1);
        const [lx, ly] = pointAt(idx, 1.2);
        return (
          <g key={p.id}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth={1}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="9.5"
              fontWeight="700"
            >
              {p.shortLabel} ({clampScore(p.score)})
            </text>
          </g>
        );
      })}

      {/* 85% SLA Target Benchmark Ring */}
      <polygon
        points={benchmarkPoints}
        fill="rgba(56, 189, 248, 0.06)"
        stroke="#38bdf8"
        strokeDasharray="4 3"
        strokeWidth={1.3}
      />

      {/* Live System Score Polygon */}
      <motion.polygon
        points={actualPoints}
        fill="rgba(16, 185, 129, 0.24)"
        stroke="#10b981"
        strokeWidth={2.2}
        initial={{ opacity: 0, scale: 0.35 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {pillars.map((p, idx) => {
        const [px, py] = pointAt(idx, clampScore(p.score) / 100);
        return (
          <motion.circle
            key={p.id}
            cx={px}
            cy={py}
            r={3.8}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={1.2}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ type: 'spring', stiffness: 280, delay: 0.25 + idx * 0.08 }}
          />
        );
      })}
    </svg>
  );
}

const VIEW_TABS = [
  { id: 'OVERVIEW', label: 'Tổng Quan & Chẩn Đoán', icon: Award },
  { id: 'OPERATIONS', label: 'Vận Hành & Đội Xe', icon: Truck },
  { id: 'ESG', label: 'Carbon GLEC v3', icon: Leaf },
  { id: 'FINANCE_IAM', label: 'Tài Chính Net-30 & IAM', icon: Building2 }
];

export default function SystemEvaluationDashboard({
  shipments = [],
  vehicles = [],
  containers = [],
  liveFleet = [],
  incidents = [],
  notifications = [],
  accounts = [],
  companies = [],
  contracts = [],
  payments = [],
  hubItems = [],
  demo = import.meta.env.VITE_DEMO_MODE === 'true'
}) {
  const navigate = useNavigate();
  const [evalTab, setEvalTab] = useState('OVERVIEW');

  const analytics = useMemo(() => {
    const activeShipments = shipments.filter((s) => !s.isDeleted);
    const totalShipments = activeShipments.length;
    const inTransitShipments = activeShipments.filter((s) => s.status === 'IN_TRANSIT').length;
    const completedShipments = activeShipments.filter((s) => s.status === 'COMPLETED').length;
    const pendingShipments = activeShipments.filter((s) => s.status === 'PENDING').length;

    const totalVehicles = vehicles.length;
    const maintenanceVehicles = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
    const activeFleetVehicles = vehicles.filter((v) => v.status === 'IN_TRANSIT').length;
    const readyVehicles = vehicles.filter((v) => v.status !== 'MAINTENANCE').length;
    const evVehicles = vehicles.filter((v) =>
      String(v.vehicleType || v.fuelType || '')
        .toUpperCase()
        .includes('EV')
    ).length;

    const totalContainers = containers.length;
    const lockedESealCount = containers.filter((c) =>
      String(c.eSealStatus || '').toUpperCase().includes('LOCK')
    ).length;

    const totalFleetDeviations = liveFleet.filter(
      (f) => f.deviationStatus === 'CRITICAL_200M' || Number(f.deviationMeters || 0) > 200
    ).length;
    const warningDeviations = liveFleet.filter((f) => f.deviationStatus === 'WARNING_50M').length;
    const unackedAlerts = notifications.filter((n) => n.status !== 'ACKNOWLEDGED').length;
    const openIncidents = incidents.filter(
      (inc) => String(inc.status || '').toUpperCase() !== 'RESOLVED'
    ).length;

    const activeAccounts = accounts.filter((a) => !a.isDeleted);
    const unlockedAccounts = activeAccounts.filter((a) => !a.locked).length;
    const lockedAccountsCount = activeAccounts.filter((a) => Boolean(a.locked)).length;
    const hubDeliveredCount = (hubItems || []).filter(
      (i) => i.dispatchStatus === 'DELIVERED_POD' || i.status === 'DELIVERED_POD'
    ).length;
    const activeCompanies = companies.filter((c) => !c.isDeleted);
    const verifiedCompanies = activeCompanies.filter((c) => c.kycStatus === 'VERIFIED').length;
    const pendingKycCompanies = activeCompanies.filter((c) => c.kycStatus === 'PENDING').length;

    const signedContracts = contracts.filter(
      (c) => c.status === 'SIGNED' || c.status === 'SETTLED' || c.status === 'ACTIVE'
    ).length;
    const settledOrPaidPayments = payments.filter(
      (p) => p.status === 'PAID' || p.status === 'CONFIRMED'
    );
    const totalPaymentVnd = payments.reduce((sum, p) => sum + Number(p.amountVnd || 0), 0);
    const paidPaymentVnd = settledOrPaidPayments.reduce(
      (sum, p) => sum + Number(p.amountVnd || 0),
      0
    );
    const totalCreditLimit = activeCompanies.reduce(
      (sum, c) => sum + Number(c.creditLimitVnd || 0),
      0
    );

    const totalCo2SavedKg =
      liveFleet.reduce((sum, f) => sum + Number(f.co2SavedKg || 0), 0) +
      activeShipments.reduce((sum, s) => sum + Number(s.co2SavedKg || 0), 0);

    // Compute Pillar Scores (0..100) directly from operational realities
    const opsScore =
      totalShipments === 0 && totalVehicles === 0
        ? 60
        : clampScore(
            (readyVehicles / Math.max(1, totalVehicles)) * (45 / 85) * 100 +
              ((inTransitShipments + completedShipments) / Math.max(1, totalShipments)) * (40 / 85) * 100
          );

    const safetyPenalty =
      totalFleetDeviations * 14 +
      warningDeviations * 6 +
      unackedAlerts * 6 +
      openIncidents * 8 +
      maintenanceVehicles * 5;
    const safetyScore = clampScore(100 - Math.min(60, safetyPenalty));

    const evMixRatio =
      totalVehicles > 0 ? evVehicles / totalVehicles : 0.4;
    const esgScore = clampScore(
      52 + evMixRatio * 28 + Math.min(20, (totalCo2SavedKg / 25) * 10)
    );

    const kycRatio = verifiedCompanies / Math.max(1, activeCompanies.length);
    const paidRatio = totalPaymentVnd > 0 ? paidPaymentVnd / totalPaymentVnd : 0.78;
    const financeScore = clampScore(kycRatio * 55 + paidRatio * 45);

    const iamHygiene = unlockedAccounts / Math.max(1, activeAccounts.length);
    const sealRatio =
      totalContainers > 0 ? lockedESealCount / totalContainers : 0.9;
    const governanceScore = clampScore(iamHygiene * 50 + sealRatio * 50);

    const pillars = [
      {
        id: 'OPS',
        shortLabel: 'Vận hành',
        label: 'Điều Phối & SLA Vận Đơn',
        score: opsScore,
        detail: `${inTransitShipments} đang chạy • ${completedShipments} hoàn tất • ${pendingShipments} chờ xuất bến`
      },
      {
        id: 'SAFETY',
        shortLabel: 'An toàn',
        label: 'An Toàn Hành Lang & Pre-Trip',
        score: safetyScore,
        detail: `${totalFleetDeviations} lệch đỏ (>200m) • ${unackedAlerts} cảnh báo chờ ACK`
      },
      {
        id: 'ESG',
        shortLabel: 'Carbon GLEC',
        label: 'Xanh Hóa & Carbon GLEC v3',
        score: esgScore,
        detail: `Cắt giảm ~${totalCo2SavedKg.toFixed(1)} kg CO2e • ${evVehicles}/${Math.max(1, totalVehicles)} xe EV`
      },
      {
        id: 'FINANCE',
        shortLabel: 'Tài chính',
        label: 'Tín Dụng Net-30 & Pháp Lý KYC',
        score: financeScore,
        detail: `${verifiedCompanies}/${Math.max(1, activeCompanies.length)} công ty VERIFIED • ${Math.round(paidRatio * 100)}% thu hồi`
      },
      {
        id: 'GOV',
        shortLabel: 'Hub & IAM',
        label: 'Bảo Mật IAM & e-Seal 3PL',
        score: governanceScore,
        detail: `${unlockedAccounts}/${Math.max(1, activeAccounts.length)} user hoạt động • ${lockedESealCount}/${Math.max(1, totalContainers)} Seal khóa`
      }
    ];

    const overallScore = Math.round(
      pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length
    );

    // Automated Operational Bottleneck Diagnostics
    const diagnostics = [];
    if (pendingShipments > 0) {
      diagnostics.push({
        severity: 'WARN',
        title: `${pendingShipments} vận đơn đang PENDING chưa hoạch định / xuất bến`,
        actionLabel: 'Đi tới Điều phối & Lập tuyến',
        path: '/shipments'
      });
    }
    if (maintenanceVehicles > 0) {
      diagnostics.push({
        severity: 'INFO',
        title: `${maintenanceVehicles} xe trạng thái MAINTENANCE bị khóa xuất bến theo quy tắc an toàn BRULE-01`,
        actionLabel: 'Kiểm định Pre-Trip UC01',
        path: '/governance'
      });
    }
    if (unackedAlerts > 0 || totalFleetDeviations > 0) {
      diagnostics.push({
        severity: 'CRITICAL',
        title: `${unackedAlerts} cảnh báo khẩn cấp & ${totalFleetDeviations} điểm lệch hành lang >200m cần điều phối xử lý`,
        actionLabel: 'Mở Giám sát Hành trình',
        path: '/trips/f0000000-0000-0000-0000-000000000001'
      });
    }
    if (pendingKycCompanies > 0) {
      diagnostics.push({
        severity: 'WARN',
        title: `${pendingKycCompanies} doanh nghiệp B2B đang chờ thẩm định hồ sơ KYC / hạn mức Net-30`,
        actionLabel: 'Thẩm định Công ty B2B',
        path: '/admin/companies'
      });
    }
    if (lockedAccountsCount > 0) {
      diagnostics.push({
        severity: 'WARN',
        title: `${lockedAccountsCount} tài khoản bị khóa đăng nhập cần Admin kiểm tra mở khóa`,
        actionLabel: 'Mở Quản lý User (/admin/users)',
        path: '/admin/users'
      });
    }
    if (diagnostics.length === 0) {
      diagnostics.push({
        severity: 'OK',
        title: 'Toàn bộ 5 trụ cột nghiệp vụ đạt ngưỡng ổn định — Không phát hiện điểm nghẽn tồn đọng.',
        actionLabel: 'Xem Định mức Carbon UC13',
        path: '/analytics/benchmark'
      });
    }

    return {
      overallScore,
      pillars,
      diagnostics,
      totalShipments,
      inTransitShipments,
      completedShipments,
      pendingShipments,
      totalVehicles,
      activeFleetVehicles,
      readyVehicles,
      maintenanceVehicles,
      evVehicles,
      totalCo2SavedKg,
      totalContainers,
      lockedESealCount,
      verifiedCompanies,
      activeCompaniesCount: activeCompanies.length,
      signedContracts,
      totalPaymentVnd,
      paidPaymentVnd,
      totalCreditLimit,
      activeAccountsCount: activeAccounts.length,
      unlockedAccounts,
      lockedAccountsCount,
      hubTotalCount: (hubItems || []).length,
      hubDeliveredCount,
      unackedAlerts,
      openIncidents
    };
  }, [
    shipments,
    vehicles,
    containers,
    liveFleet,
    incidents,
    notifications,
    accounts,
    companies,
    contracts,
    payments,
    hubItems
  ]);

  if (!demo) {
    const paid = payments.filter((p) => ['PAID', 'CONFIRMED'].includes(p.status)).reduce((sum, p) => sum + Number(p.amountVnd || 0), 0);
    const facts = [
      ['Vận đơn đang vận chuyển', shipments.filter((s) => !s.isDeleted && s.status === 'IN_TRANSIT').length, '/shipments'],
      ['Phương tiện sẵn sàng', vehicles.filter((v) => v.status === 'AVAILABLE').length, '/operations/dispatch'],
      ['Sự cố chờ thẩm định', incidents.filter((i) => i.status === 'PENDING_REVIEW').length, '/governance'],
      ['Doanh nghiệp chờ xác minh', companies.filter((c) => !c.isDeleted && c.kycStatus === 'PENDING').length, '/admin/companies'],
      ['Thanh toán đã xác nhận', `${paid.toLocaleString('vi-VN')} ₫`, null]
    ];
    return <section className="card" aria-label="Tổng hợp nghiệp vụ">
      <h3>Tổng hợp nghiệp vụ</h3>
      <p>Số liệu từ các nguồn đã tải. Không quy đổi thành điểm xếp hạng khi chưa có phương pháp đánh giá được phê duyệt.</p>
      <div className="business-metrics-grid">{facts.map(([label, value, path]) => <div className="business-metric" key={label}>
        <span>{label}</span><strong>{value}</strong>
        {path && <button className="btn btn-secondary" onClick={() => navigate(path)}>Xem danh sách</button>}
      </div>)}</div>
    </section>;
  }
  const gradeMeta = getGradeMeta(analytics.overallScore);

  return (
    <motion.section
      aria-label="Bảng Đánh Giá Toàn Diện Hệ Thống CCADRO"
      className="card glass-card-interactive"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        marginBottom: 24,
        border: '1px solid rgba(16, 185, 129, 0.28)',
        background:
          'linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-card) 55%, rgba(14, 165, 233, 0.05) 100%)'
      }}
    >
      {/* Header & Evaluation View Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--accent-green)',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <BarChart3 size={14} /> HỆ THỐNG CHẤM ĐIỂM &amp; ĐÁNH GIÁ NGHIỆP VỤ REAL-TIME
          </div>
          <h3 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '4px 0 2px' }}>
            Dashboard Đánh Giá Hiệu Suất Chuỗi Cung Ứng Xanh CCADRO
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Tổng hợp trực tiếp từ Vận đơn, Đội xe, Telemetry GPS, Carbon GLEC v3, Công nợ B2B Net-30
            &amp; Hồ sơ Công ty / IAM
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIEW_TABS.map((t) => {
            const Icon = t.icon;
            const active = evalTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setEvalTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 9,
                  border: active
                    ? '1px solid var(--accent-green)'
                    : '1px solid var(--border-color)',
                  background: active ? 'var(--accent-green-dim)' : 'var(--bg-card)',
                  color: active ? 'var(--accent-green-light)' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {evalTab === 'OVERVIEW' && (
        <motion.div
          key="OVERVIEW"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 18,
            alignItems: 'stretch'
          }}
        >
          {/* Left: Overall Index + Radar Chart */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card-hover)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <SvgScoreRing score={analytics.overallScore} />
              <div style={{ flex: 1, minWidth: 150 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: gradeMeta.bg,
                    color: gradeMeta.color,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    marginBottom: 6
                  }}
                >
                  {gradeMeta.grade}
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                  Chỉ Số Sẵn Sàng Hệ Thống
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Chuẩn mục tiêu doanh nghiệp: <strong>&ge; 85 / 100</strong> (Đường nét đứt xanh lam)
                </div>
              </div>
            </div>

            <SvgRadarEvaluation pillars={analytics.pillars} />
          </div>

          {/* Center: 5 Business Pillar Meters */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card-hover)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} color="var(--accent-blue)" />
              <span>Chấm Điểm 5 Trụ Cột Nghiệp Vụ Cốt Lõi</span>
            </div>

            {analytics.pillars.map((pillar, idx) => {
              const meta = getGradeMeta(pillar.score);
              return (
                <motion.div
                  key={pillar.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                  style={{ display: 'grid', gap: 4 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{pillar.label}</strong>
                    <span style={{ fontWeight: 800, color: meta.color }}>
                      <CountingNumber value={pillar.score} duration={850} />/100
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.16)',
                      overflow: 'hidden'
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pillar.score}%` }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.85, delay: 0.1 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        height: '100%',
                        borderRadius: 999,
                        background: meta.color
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pillar.detail}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: Automated Diagnostic & Action Queue */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card-hover)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="var(--accent-green)" />
              <span>Chẩn Đoán Điểm Nghẽn &amp; Hành Động</span>
            </div>

            <div style={{ display: 'grid', gap: 8, flex: 1, alignContent: 'start' }}>
              {analytics.diagnostics.map((item, idx) => {
                const borderCol =
                  item.severity === 'CRITICAL'
                    ? '#ef4444'
                    : item.severity === 'WARN'
                      ? '#f59e0b'
                      : item.severity === 'INFO'
                        ? '#38bdf8'
                        : '#10b981';
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.38, delay: 0.12 + idx * 0.08 }}
                    whileHover={{ x: 3 }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      border: `1px solid ${borderCol}`,
                      display: 'grid',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.76rem', lineHeight: 1.4 }}>
                      {item.severity === 'OK' ? (
                        <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                      ) : (
                        <AlertTriangle size={15} color={borderCol} style={{ flexShrink: 0, marginTop: 1 }} />
                      )}
                      <span>{item.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      style={{
                        alignSelf: 'start',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 9px',
                        borderRadius: 7,
                        border: 'none',
                        background: 'rgba(148, 163, 184, 0.14)',
                        color: borderCol,
                        fontSize: '0.71rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {evalTab === 'OPERATIONS' && (
        <motion.div
          key="OPERATIONS"
          className="grid-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24 }}
        >
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Phễu Vận Đơn (Pipeline)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, margin: '4px 0' }}>
              {analytics.inTransitShipments} / {analytics.totalShipments}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#10b981' }}>
              Đang lưu thông • {analytics.pendingShipments} chờ điều phối • {analytics.completedShipments} hoàn tất
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Sẵn Sàng Hạm Đội (BRULE-01)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, margin: '4px 0', color: '#38bdf8' }}>
              {analytics.readyVehicles} / {analytics.totalVehicles} Xe
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {analytics.activeFleetVehicles} đang chạy • {analytics.maintenanceVehicles} bảo trì khóa bến
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>An Ninh Container e-Seal</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, margin: '4px 0', color: '#10b981' }}>
              {analytics.lockedESealCount} / {analytics.totalContainers || analytics.lockedESealCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Khóa Seal ISO 17712 bảo mật toàn tuyến
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Cảnh Báo &amp; Sự Cố Hiện Trường</div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                margin: '4px 0',
                color: analytics.unackedAlerts > 0 ? '#ef4444' : '#10b981'
              }}
            >
              {analytics.unackedAlerts} Cảnh báo
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {analytics.openIncidents} sự cố đang chờ thẩm định UC16
            </div>
          </div>
        </motion.div>
      )}

      {evalTab === 'ESG' && (
        <motion.div
          key="ESG"
          className="grid-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24 }}
        >
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tổng Phát Thải Cắt Giảm (GLEC v3)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: '#10b981' }}>
              {analytics.totalCo2SavedKg.toFixed(1)} kg CO2e
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              So sánh Well-to-Wheel (WTW) với định mức Diesel 0,108 kg/tkm
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tỷ Trọng Đội Xe Điện (EV / BEV)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: '#38bdf8' }}>
              {analytics.totalVehicles > 0
                ? Math.round((analytics.evVehicles / analytics.totalVehicles) * 100)
                : 0}
              %
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {analytics.evVehicles} xe điện / tổng {analytics.totalVehicles} đầu xe quản lý
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Hạng Đánh Giá Xanh Hóa</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: '#10b981' }}>
              {analytics.pillars.find((p) => p.id === 'ESG')?.score || 0} / 100
            </div>
            <button
              type="button"
              onClick={() => navigate('/analytics/benchmark')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#10b981',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: 0,
                cursor: 'pointer'
              }}
            >
              Xem chi tiết định mức hành lang (UC13) →
            </button>
          </div>
        </motion.div>
      )}

      {evalTab === 'FINANCE_IAM' && (
        <motion.div
          key="FINANCE_IAM"
          className="grid-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24 }}
        >
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <DollarSign size={13} color="#10b981" /> Thanh Toán Đã Thu / Tổng Phát Sinh
            </div>
            <div style={{ fontSize: '1.18rem', fontWeight: 900, margin: '4px 0', color: '#10b981' }}>
              {analytics.paidPaymentVnd.toLocaleString('vi-VN')} ₫
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
              Tổng giá trị giao dịch: {analytics.totalPaymentVnd.toLocaleString('vi-VN')} ₫
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <Building2 size={13} color="#38bdf8" /> Công Ty B2B Đã Thẩm Định KYC
            </div>
            <div style={{ fontSize: '1.22rem', fontWeight: 900, margin: '4px 0', color: '#38bdf8' }}>
              {analytics.verifiedCompanies} / {analytics.activeCompaniesCount} Doanh nghiệp
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
              Tổng hạn mức Net-30: {analytics.totalCreditLimit.toLocaleString('vi-VN')} ₫
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <Lock size={13} color="#a855f7" /> Hợp Đồng Điện Tử Hiệu Lực
            </div>
            <div style={{ fontSize: '1.22rem', fontWeight: 900, margin: '4px 0', color: '#a855f7' }}>
              {analytics.signedContracts} / {contracts.length} Hợp đồng
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
              Ký số SHA-256 &amp; đối soát SLA tự động
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <Users size={13} color="#f59e0b" /> Tài Khoản IAM Hoạt Động
            </div>
            <div style={{ fontSize: '1.22rem', fontWeight: 900, margin: '4px 0' }}>
              {analytics.unlockedAccounts} / {analytics.activeAccountsCount} Tài khoản
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#38bdf8',
                fontSize: '0.73rem',
                fontWeight: 700,
                padding: 0,
                cursor: 'pointer'
              }}
            >
              Mở Quản lý User &amp; Công ty →
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

