import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { formatCompactVnd as formatBillionOrMillion } from '../../utils/formatters';

export default function RevenueAndBranchChart({
  paymentSummary,
  branches = [],
  contracts = [],
  payments = []
}) {
  const paidVnd = Number(paymentSummary?.totalPaidVnd || 0);
  const net30Vnd = Number(paymentSummary?.totalNet30Vnd || 0);
  const pendingVnd = Number(paymentSummary?.totalPendingVnd || 0);
  const greenDiscountVnd = Number(paymentSummary?.totalGreenDiscountVnd || 0);

  const contractValueVnd = contracts.reduce(
    (sum, c) => sum + Number(c.contractValueVnd || c.totalAmountVnd || 0),
    0
  );

  const activeBranches = branches.filter((b) => !b.isDeleted);
  const totalBranchTargetVnd = activeBranches.reduce(
    (sum, b) => sum + Number(b.monthlyRevenueTargetVnd || 0),
    0
  );

  const totalRecognizedVnd = paidVnd + net30Vnd + pendingVnd;
  const maxBar = Math.max(paidVnd, net30Vnd, pendingVnd, contractValueVnd, greenDiscountVnd, 1);

  const breakdownRows = [
    {
      label: 'Doanh thu đã thu (PAID)',
      amount: paidVnd,
      count: paymentSummary?.paidCount ?? payments.filter((p) => p.status === 'PAID').length,
      color: '#10b981'
    },
    {
      label: 'Công nợ doanh nghiệp (NET-30)',
      amount: net30Vnd,
      count: paymentSummary?.net30Count ?? payments.filter((p) => p.status === 'NET_30').length,
      color: '#38bdf8'
    },
    {
      label: 'Chờ thanh toán / Đối soát',
      amount: pendingVnd,
      count: paymentSummary?.pendingCount ?? payments.filter((p) => p.status === 'PENDING').length,
      color: '#f59e0b'
    },
    {
      label: 'Giá trị Hợp đồng B2B & SLA',
      amount: contractValueVnd,
      count: contracts.length,
      color: '#a855f7'
    },
    {
      label: 'Ưu đãi Carbon Xanh (Green Discount)',
      amount: greenDiscountVnd,
      count: paymentSummary?.totalTransactions ?? payments.length,
      color: '#22c55e'
    }
  ];

  return (
    <div className="card glass-card-interactive" style={{ marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}
          >
            <TrendingUp size={18} color="#10b981" />
            <span>Phân Tích Doanh Thu, Công Nợ Net-30 &amp; Chỉ Tiêu Chi Nhánh</span>
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Tổng hợp dòng tiền từ Payment Service, Hợp đồng B2B và định mức doanh thu các chi nhánh
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Tổng Doanh Số Ghi Nhận
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
            {formatBillionOrMillion(totalRecognizedVnd)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
        {breakdownRows.map((row, idx) => {
          const pct = Math.min(100, Math.max(4, Math.round((row.amount / maxBar) * 100)));
          return (
            <div key={row.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.79rem',
                  marginBottom: '4px'
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {row.label}{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    ({row.count} mục)
                  </span>
                </span>
                <strong style={{ color: row.color }}>{formatBillionOrMillion(row.amount)}</strong>
              </div>
              <div
                style={{
                  height: '9px',
                  borderRadius: '999px',
                  background: 'rgba(148, 163, 184, 0.14)',
                  overflow: 'hidden'
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${row.amount > 0 ? pct : 0}%` }}
                  transition={{ duration: 0.65, delay: idx * 0.06 }}
                  style={{
                    height: '100%',
                    borderRadius: '999px',
                    background: row.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Branches Monthly Revenue Target */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '14px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            fontSize: '0.8rem'
          }}
        >
          <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={15} color="#38bdf8" />
            <span>Phân Bổ Chỉ Tiêu Doanh Thu Theo Chi Nhánh ({activeBranches.length})</span>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Tổng chỉ tiêu tháng: <strong>{formatBillionOrMillion(totalBranchTargetVnd)}</strong>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '8px'
          }}
        >
          {activeBranches.slice(0, 6).map((b) => {
            const sharePct =
              totalBranchTargetVnd > 0
                ? Math.round((Number(b.monthlyRevenueTargetVnd || 0) / totalBranchTargetVnd) * 100)
                : 0;
            return (
              <div
                key={b.id || b.branchCode}
                style={{
                  padding: '9px 11px',
                  borderRadius: '9px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-hover)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <code style={{ color: '#38bdf8', fontWeight: 700 }}>{b.branchCode}</code>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{sharePct}%</span>
                </div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    marginTop: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={b.branchName}
                >
                  {b.city}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>
                  {formatBillionOrMillion(b.monthlyRevenueTargetVnd)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
