import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  Award,
  Banknote,
  CheckCircle2,
  Coins,
  FileCheck2,
  Flame,
  QrCode,
  Receipt,
  ShieldCheck,
  Snowflake,
  Star,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import { formatVnd } from '../../../../utils/formatters';
import ShipperAvatar from '../shippers/ShipperAvatar';

const BASE_STOP_FEE_VND = 38000;
const COLD_CHAIN_BONUS_VND = 22000;
const WEIGHT_SURCHARGE_PER_100KG_VND = 12000;
const DAILY_GEM_BONUS_VND = 120000;

export default function ShipperEarningsAndSlaPanel({
  activeHub,
  activeShipper,
  hubShippers = [],
  manifestItems = [],
  shiftSettlements = [],
  codRemittances = [],
  isHubShipper = false,
  isReadOnlyAuditor = false,
  isDark = false,
  onSettleShiftPod,
  onRemitCodCash
}) {
  const [selectedCode, setSelectedCode] = useState(
    activeShipper?.shipperCode || hubShippers[0]?.shipperCode || ''
  );
  const [settledOptimistic, setSettledOptimistic] = useState(false);
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [remitAmount, setRemitAmount] = useState('');
  const [remitMethod, setRemitMethod] = useState('CASH_TO_CASHIER'); // 'CASH_TO_CASHIER' | 'QR_BANK_TRANSFER'
  const [cashierName, setCashierName] = useState('Thủ quỹ Bưu cục Đình Bảng');
  const [remitNote, setRemitNote] = useState('Nộp quỹ tiền mặt COD ca làm việc');

  const shipper = useMemo(
    () =>
      (isHubShipper && activeShipper) ||
      hubShippers.find((s) => s.shipperCode === selectedCode) ||
      activeShipper ||
      hubShippers[0] ||
      null,
    [isHubShipper, activeShipper, hubShippers, selectedCode]
  );

  const myItems = useMemo(
    () =>
      manifestItems.filter(
        (m) => !m.isDeleted && m.assignedShipperCode === shipper?.shipperCode
      ),
    [manifestItems, shipper]
  );

  const myRemittances = useMemo(
    () =>
      codRemittances.filter(
        (r) => r.shipperCode === shipper?.shipperCode || !r.shipperCode
      ),
    [codRemittances, shipper?.shipperCode]
  );

  const codHoldingCash = Number(shipper?.codHoldingVnd || 0);
  const codCollectedQr = Number(shipper?.codCollectedQrTodayVnd || 0);

  const calc = useMemo(() => {
    const delivered = myItems.filter((i) => i.dispatchStatus === 'DELIVERED_POD');
    let baseTotal = 0;
    let coldBonusTotal = 0;
    let weightTotal = 0;

    const breakdown = myItems.map((item) => {
      const done = item.dispatchStatus === 'DELIVERED_POD';
      const base = BASE_STOP_FEE_VND;
      const cold = item.requiresColdChain ? COLD_CHAIN_BONUS_VND : 0;
      const weightFee = Math.round(((item.weightKg || 50) / 100) * WEIGHT_SURCHARGE_PER_100KG_VND);
      const total = base + cold + weightFee;
      if (done) {
        baseTotal += base;
        coldBonusTotal += cold;
        weightTotal += weightFee;
      }
      return { item, done, base, cold, weightFee, total };
    });

    const questTarget = Math.max(1, myItems.length);
    const questUnlocked = delivered.length >= questTarget && myItems.length > 0;
    const gemBonus = questUnlocked ? DAILY_GEM_BONUS_VND : 0;
    const grossEarnings = baseTotal + coldBonusTotal + weightTotal + gemBonus;
    const projectedToday =
      breakdown.reduce((acc, r) => acc + r.total, 0) + DAILY_GEM_BONUS_VND;
    const monthlyEstimated =
      (shipper?.completedOrdersMonth || 135) * (BASE_STOP_FEE_VND + 18000) + 2400000;

    const ndrItems = myItems.filter((i) => i.dispatchStatus === 'NDR_RESCHEDULED' || i.dispatchStatus === 'RETURN_PENDING');
    const lateSlaPenaltyCount = myItems.filter((i) => i.dispatchStatus === 'DELIVERED_POD' && i.slaBreached).length;
    const penaltyPerLate = 15000;
    const penaltyPerReturn = 8000;
    const totalPenalty = (lateSlaPenaltyCount * penaltyPerLate) + (ndrItems.length * penaltyPerReturn);

    return {
      deliveredCount: delivered.length,
      totalStops: myItems.length,
      questTarget,
      questUnlocked,
      baseTotal,
      coldBonusTotal,
      weightTotal,
      gemBonus,
      earnedToday: Math.max(0, grossEarnings - totalPenalty),
      grossEarnings,
      totalPenalty,
      lateSlaPenaltyCount,
      ndrCount: ndrItems.length,
      penaltyPerLate,
      penaltyPerReturn,
      projectedToday,
      monthlyEstimated,
      breakdown
    };
  }, [myItems, shipper]);

  const handleOpenRemit = () => {
    setRemitAmount(String(codHoldingCash > 0 ? codHoldingCash : 2450000));
    setShowRemitModal(true);
  };

  const handleConfirmRemit = (e) => {
    e.preventDefault();
    const amt = Number(remitAmount);
    if (!amt || amt <= 0) return;
    onRemitCodCash?.({
      hubCode: shipper?.hubCode || activeHub?.hubCode || 'HUB-DINHBANG-BN',
      shipperCode: shipper?.shipperCode || 'SHP-BN-001',
      remittedAmountVnd: amt,
      remittanceMethod: remitMethod,
      cashierName,
      note: remitNote
    });
    setShowRemitModal(false);
  };

  if (!shipper) return null;

  const cardBg = isDark ? 'rgba(15, 23, 42, 0.88)' : '#ffffff';
  const subtleBg = isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc';
  const border = isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #e2e8f0';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  return (
    <section
      aria-label="Trung tâm thu nhập, thưởng SLA và đối soát chứng từ Shipper"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Manager Switcher */}
      {!isHubShipper && hubShippers.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: 14,
            background: cardBg,
            border
          }}
        >
          <span style={{ fontSize: '0.73rem', fontWeight: 800, color: textMuted }}>
            XEM ĐỐI SOÁT &amp; THƯỞNG SLA THEO SHIPPER:
          </span>
          {hubShippers.map((s) => (
            <button
              key={s.shipperCode}
              type="button"
              onClick={() => {
                setSelectedCode(s.shipperCode);
                setSettledOptimistic(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 999,
                border: s.shipperCode === shipper.shipperCode ? '1.5px solid #10b981' : border,
                background: s.shipperCode === shipper.shipperCode ? 'rgba(16, 185, 129, 0.14)' : subtleBg,
                color: s.shipperCode === shipper.shipperCode ? '#059669' : 'inherit',
                fontSize: '0.77rem',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              <ShipperAvatar shipper={s} size={22} showBadge={false} />
              <span>{s.fullName}</span>
            </button>
          ))}
        </div>
      )}

      {/* GrabDriver-style Wallet & Daily Earnings Hero */}
      <div
        style={{
          background: cardBg,
          border,
          borderRadius: 18,
          padding: '20px 22px',
          display: 'grid',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShipperAvatar shipper={shipper} size={58} showBadge />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', letterSpacing: '0.05em' }}>
                VÍ THU NHẬP &amp; THƯỞNG NĂNG SUẤT CA LÀM VIỆC
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.12rem', fontWeight: 850 }}>
                {shipper.fullName} ({shipper.shipperCode})
              </h3>
              <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: 2 }}>
                {activeHub?.hubName} · Hạn mức ký quỹ COD: <strong>{formatVnd(shipper.codLimitVnd ?? 30000000)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Remit COD button */}
            {!isReadOnlyAuditor && (
              <button
                type="button"
                data-testid="btn-open-remit-modal"
                onClick={handleOpenRemit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #d97706',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Banknote size={15} />
                Nộp tiền COD về Bưu cục
              </button>
            )}

            {/* Shift Settlement button */}
            {!isReadOnlyAuditor && (() => {
              const dbSettlement = shiftSettlements.find(
                (st) => st.shipperCode === shipper.shipperCode
              );
              const isSettled =
                settledOptimistic ||
                Boolean(
                  dbSettlement &&
                    calc.deliveredCount > 0 &&
                    Number(dbSettlement.deliveredPodCount) >= calc.deliveredCount
                );
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <button
                    type="button"
                    data-testid="btn-settle-shift-pod"
                    disabled={isSettled || calc.deliveredCount === 0}
                    onClick={() => {
                      setSettledOptimistic(true);
                      onSettleShiftPod?.(shipper, calc);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '10px 15px', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                  >
                    <FileCheck2 size={15} />
                    {isSettled
                      ? '✓ Đã nộp đối soát cuối ca'
                      : `Đối soát & Bàn giao chứng từ (${calc.deliveredCount} POD)`}
                  </button>
                  {dbSettlement && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 750, color: '#059669' }}>
                      Đã xác nhận: {dbSettlement.settlementCode} • {formatVnd(dbSettlement.totalEarnedVnd)}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 6 Earnings, Wallet & COD Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 12 }}>
          {/* Card 1: Shift Earning */}
          <div style={{ padding: 14, borderRadius: 14, background: subtleBg, border }}>
            <div style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700 }}>
              <Wallet size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#059669' }} />
              Thu nhập chốt ca hôm nay
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#059669', marginTop: 4 }}>
              {formatVnd(calc.earnedToday)}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              Dự kiến tối đa ca: {formatVnd(calc.projectedToday)}
            </div>
          </div>

          {/* Card 2: COD Cash Holding (Tài xế cầm tay) */}
          <div
            data-testid="card-cod-holding"
            style={{
              padding: 14,
              borderRadius: 14,
              background: codHoldingCash > 0 ? 'rgba(245, 158, 11, 0.08)' : subtleBg,
              border: codHoldingCash > 0 ? '1.5px solid rgba(245, 158, 11, 0.45)' : border
            }}
          >
            <div style={{ fontSize: '0.73rem', color: codHoldingCash > 0 ? '#b45309' : textMuted, fontWeight: 750 }}>
              <Banknote size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: codHoldingCash > 0 ? '#d97706' : '#64748b' }} />
              Tiền mặt COD cầm tay
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: codHoldingCash > 0 ? '#d97706' : '#059669', marginTop: 4 }}>
              {formatVnd(codHoldingCash)}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              {codHoldingCash > 0 ? 'Bắt buộc nộp Thủ quỹ trước khi kết ca' : '✓ Sạch công nợ tiền mặt'}
            </div>
          </div>

          {/* Card 3: COD collected via dynamic QR */}
          <div style={{ padding: 14, borderRadius: 14, background: subtleBg, border }}>
            <div style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700 }}>
              <QrCode size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#0284c7' }} />
              COD thu qua QR Động Trực tuyến
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0284c7', marginTop: 4 }}>
              {formatVnd(codCollectedQr)}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              Chuyển thẳng tài khoản Bưu cục (0 công nợ)
            </div>
          </div>

          {/* Card 4: Cold Chain Bonus */}
          <div style={{ padding: 14, borderRadius: 14, background: subtleBg, border }}>
            <div style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700 }}>
              <Snowflake size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#0284c7' }} />
              Phụ phí Chuỗi lạnh
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0284c7', marginTop: 4 }}>
              {formatVnd(calc.coldBonusTotal)}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              +{formatVnd(COLD_CHAIN_BONUS_VND)}/điểm lạnh
            </div>
          </div>

          {/* Card 5: Daily Gem Quest SLA Bonus */}
          <div style={{ padding: 14, borderRadius: 14, background: subtleBg, border }}>
            <div style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700 }}>
              <Flame size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#d97706' }} />
              Thưởng mốc Ngọc SLA
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#d97706', marginTop: 4 }}>
              {calc.questUnlocked ? formatVnd(DAILY_GEM_BONUS_VND) : `0 ₫ (${calc.deliveredCount}/${calc.questTarget})`}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              +{formatVnd(DAILY_GEM_BONUS_VND)} khi đủ 100% POD
            </div>
          </div>

          {/* Card 6: Monthly Estimated */}
          <div style={{ padding: 14, borderRadius: 14, background: subtleBg, border }}>
            <div style={{ fontSize: '0.73rem', color: textMuted, fontWeight: 700 }}>
              <TrendingUp size={13} style={{ verticalAlign: '-2px', marginRight: 5, color: '#7c3aed' }} />
              Lũy kế tháng ({shipper.completedOrdersMonth ?? 148} đơn)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#7c3aed', marginTop: 4 }}>
              {formatVnd(calc.monthlyEstimated)}
            </div>
            <div style={{ fontSize: '0.71rem', color: textMuted, marginTop: 3 }}>
              Lương tuyến cố định + SLA
            </div>
          </div>
        </div>

        {/* GrabDriver Gem Quest Bar + 4 Quality Star Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
          <div style={{ padding: 15, borderRadius: 14, background: subtleBg, border, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#d97706' }}>
                <Award size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                NHIỆM VỤ THƯỞNG NGỌC TRONG CA (DAILY SLA QUEST)
              </span>
              <strong style={{ fontSize: '0.76rem', color: calc.questUnlocked ? '#059669' : '#d97706' }}>
                {calc.deliveredCount}/{calc.questTarget} điểm POD
              </strong>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: 'rgba(148,163,184,0.25)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((calc.deliveredCount / calc.questTarget) * 100))}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.74rem', color: textMuted }}>
              {calc.questUnlocked
                ? 'Chúc mừng! Bạn đã hoàn tất 100% dải mã với đầy đủ Ảnh POD — đã cộng thưởng mốc SLA vào ví ca.'
                : `Hoàn tất thêm ${Math.max(0, calc.questTarget - calc.deliveredCount)} kiện có Ảnh POD chuẩn để nhận ngay ${formatVnd(DAILY_GEM_BONUS_VND)}.`}
            </div>
          </div>

          <div style={{ padding: 15, borderRadius: 14, background: subtleBg, border, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: textMuted }}>Tỷ lệ nhận tuyến</span>
              <div style={{ fontSize: '0.96rem', fontWeight: 850, color: '#059669' }}>100%</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: textMuted }}>Tỷ lệ giao đúng hẹn (OTD)</span>
              <div style={{ fontSize: '0.96rem', fontWeight: 850, color: '#059669' }}>{shipper.onTimeRatePct ?? 99.1}%</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: textMuted }}>Ảnh POD hợp lệ</span>
              <div style={{ fontSize: '0.96rem', fontWeight: 850, color: '#0284c7' }}>{shipper.podCompliancePct ?? 100}%</div>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: textMuted }}>Đánh giá người nhận</span>
              <div style={{ fontSize: '0.96rem', fontWeight: 850, color: '#d97706' }}>
                <Star size={13} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                {shipper.rating ?? 4.98} / 5.0
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG KÊ BIÊN LAI NỘP TIỀN COD VỀ BƯU CỤC */}
        {myRemittances.length > 0 && (
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Receipt size={14} />
              BẢNG KÊ BIÊN LAI NỘP TIỀN COD VỀ BƯU CỤC ({myRemittances.length} BIÊN LAI ĐÃ XÁC NHẬN)
            </div>
            <div style={{ display: 'grid', gap: 7 }}>
              {myRemittances.map((remit) => (
                <div
                  key={remit.remittanceCode || remit.id}
                  style={{
                    padding: '9px 13px',
                    borderRadius: 10,
                    background: subtleBg,
                    border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: '0.76rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowDownLeft size={15} color="#059669" />
                    <div>
                      <strong>{remit.remittanceCode}</strong>
                      <span style={{ color: textMuted, marginLeft: 8 }}>
                        {remit.remittanceMethod === 'QR_BANK_TRANSFER'
                          ? 'VietQR định danh Bưu cục'
                          : `Thủ quỹ nhận: ${remit.cashierName || 'Thủ quỹ Bưu cục'}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: textMuted, fontSize: '0.72rem' }}>
                      {remit.remittedAt ? new Date(remit.remittedAt).toLocaleString('vi-VN') : 'Hôm nay'}
                    </span>
                    <strong style={{ color: '#059669', fontSize: '0.85rem' }}>
                      +{formatVnd(remit.remittedAmountVnd || 0)}
                    </strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#059669',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}
                    >
                      ✓ {remit.status || 'CONFIRMED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Stop Fee & POD Ledger Table */}

        {/* THƯỞNG / PHẠT & VI PHẠM NGHIỆP VỤ */}
        {(calc.totalPenalty > 0 || calc.ndrCount > 0) && (
          <div
            style={{
              padding: 15,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#dc2626',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              ⚠️ KHẤU TRỪ & VI PHẠM NGHIỆP VỤ TRONG CA
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <div style={{ padding: '8px 11px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }}>Giao không thành công</div>
                <div style={{ fontSize: '1rem', fontWeight: 850, color: '#dc2626', marginTop: 2 }}>{calc.ndrCount} kiện</div>
                <div style={{ fontSize: '0.68rem', color: textMuted }}>Phạt {formatVnd(calc.penaltyPerReturn)}/kiện</div>
              </div>
              <div style={{ padding: '8px 11px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700 }}>Giao trễ cam kết SLA</div>
                <div style={{ fontSize: '1rem', fontWeight: 850, color: '#d97706', marginTop: 2 }}>{calc.lateSlaPenaltyCount} kiện</div>
                <div style={{ fontSize: '0.68rem', color: textMuted }}>Phạt {formatVnd(calc.penaltyPerLate)}/kiện</div>
              </div>
              <div style={{ padding: '8px 11px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700 }}>Tổng khấu trừ ca</div>
                <div style={{ fontSize: '1rem', fontWeight: 850, color: '#dc2626', marginTop: 2 }}>−{formatVnd(calc.totalPenalty)}</div>
                <div style={{ fontSize: '0.68rem', color: textMuted }}>Thu nhập ròng: {formatVnd(calc.earnedToday)}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: textMuted, marginBottom: 8 }}>
            <Coins size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            BẢNG KÊ CHI TIẾT CƯỚC CHẶNG CUỐI &amp; CHỨNG TỪ POD TRONG CA ({calc.breakdown.length} KIỆN)
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {calc.breakdown.map(({ item, done, base, cold, weightFee, total }) => (
              <div
                key={item.itemCode}
                style={{
                  padding: '10px 14px',
                  borderRadius: 11,
                  background: subtleBg,
                  border,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  fontSize: '0.78rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {item.itemCode} · {item.consigneeName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: textMuted }}>
                    Cước điểm dừng {formatVnd(base)} + Trọng lượng ({item.weightKg}kg) {formatVnd(weightFee)}
                    {cold > 0 ? ` + Phụ phí lạnh ${formatVnd(cold)}` : ''}
                    {Number(item.codAmountVnd || 0) > 0 && (
                      <span style={{ color: '#b45309', marginLeft: 6 }}>
                        • Thu hộ COD {formatVnd(item.codAmountVnd)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <strong style={{ fontSize: '0.9rem', color: done ? '#059669' : textMuted }}>
                    {formatVnd(total)}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.69rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: done ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                      color: done ? '#059669' : '#d97706'
                    }}
                  >
                    {done ? (
                      <>
                        <CheckCircle2 size={11} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                        Đã chốt POD
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={11} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                        Chờ hoàn tất POD
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nộp tiền COD về Bưu cục */}
      {showRemitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nộp tiền COD về Bưu cục"
          data-testid="cod-remittance-modal"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3300,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background: isDark ? '#0f172a' : '#ffffff',
              border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
              borderRadius: 18,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 20px 45px rgba(0,0,0,0.4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', letterSpacing: '0.05em' }}>
                  QUY CHUẨN ĐỐI SOÁT QUỸ COD BƯU CỤC
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 850 }}>
                  Nộp Tiền COD Thu Hộ Về Bưu Cục
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRemitModal(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRemit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: textMuted }}>
                  Số tiền nộp (VND) — Dư nợ tiền mặt hiện tại: {formatVnd(codHoldingCash)}
                </label>
                <input
                  type="number"
                  required
                  data-testid="input-remit-amount"
                  value={remitAmount}
                  onChange={(e) => setRemitAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #d97706',
                    fontSize: '1rem',
                    fontWeight: 800,
                    marginTop: 4,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: textMuted }}>
                  Hình thức nộp tiền COD:
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setRemitMethod('CASH_TO_CASHIER')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: remitMethod === 'CASH_TO_CASHIER' ? '1.5px solid #059669' : border,
                      background: remitMethod === 'CASH_TO_CASHIER' ? 'rgba(16, 185, 129, 0.12)' : subtleBg,
                      color: remitMethod === 'CASH_TO_CASHIER' ? '#059669' : 'inherit',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    1. Nộp Tiền mặt cho Thủ quỹ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemitMethod('QR_BANK_TRANSFER')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: remitMethod === 'QR_BANK_TRANSFER' ? '1.5px solid #0284c7' : border,
                      background: remitMethod === 'QR_BANK_TRANSFER' ? 'rgba(2, 132, 199, 0.12)' : subtleBg,
                      color: remitMethod === 'QR_BANK_TRANSFER' ? '#0284c7' : 'inherit',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    2. Chuyển khoản VietQR Bưu cục
                  </button>
                </div>
              </div>

              {remitMethod === 'CASH_TO_CASHIER' && (
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 750, color: textMuted }}>
                    Họ tên Thủ quỹ tiếp nhận tại Bưu cục:
                  </label>
                  <input
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      marginTop: 4,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: textMuted }}>
                  Ghi chú biên bản nộp:
                </label>
                <input
                  type="text"
                  value={remitNote}
                  onChange={(e) => setRemitNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    marginTop: 4,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRemitModal(false)}
                  style={{ fontSize: '0.75rem', padding: '7px 12px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  data-testid="btn-confirm-remit-cod"
                  style={{
                    border: 0,
                    borderRadius: 8,
                    padding: '7px 15px',
                    background: '#059669',
                    color: '#fff',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Xác nhận Nộp {formatVnd(Number(remitAmount) || 0)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
