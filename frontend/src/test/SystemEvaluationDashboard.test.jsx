import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SystemEvaluationDashboard from '../systems/admin/features/dashboard/SystemEvaluationDashboard';
import CarbonBenchmarkChart from '../shared/charts/CarbonBenchmarkChart';
import CorridorEfficiencyBarChart from '../shared/charts/CorridorEfficiencyBarChart';
import DeviationTrendSparkline from '../shared/charts/DeviationTrendSparkline';

describe('Executive System Evaluation Dashboard', () => {
  it('computes 5 business evaluation pillars, switches tabs, and surfaces real operational bottlenecks', () => {
    render(
      <MemoryRouter>
        <SystemEvaluationDashboard demo={true}
          shipments={[
            { shipmentCode: 'SHP-1', status: 'IN_TRANSIT', co2SavedKg: 14.2 },
            { shipmentCode: 'SHP-2', status: 'PENDING', co2SavedKg: 0 }
          ]}
          vehicles={[
            { vehicleCode: 'V001', status: 'IN_TRANSIT', vehicleType: 'ELECTRIC_VAN_EV' },
            { vehicleCode: 'V004', status: 'MAINTENANCE', vehicleType: 'HEAVY_TRUCK_EURO5' }
          ]}
          containers={[
            { containerCode: 'TCKU-781920-4', eSealStatus: 'LOCKED_SECURE' }
          ]}
          liveFleet={[
            { tripId: 't1', deviationMeters: 245, deviationStatus: 'CRITICAL_200M', co2SavedKg: 11.4 }
          ]}
          notifications={[{ id: 'n1', status: 'UNREAD' }]}
          incidents={[{ id: 'i1', status: 'OPEN' }]}
          accounts={[
            { username: 'admin', locked: false, isDeleted: false },
            { username: 'dispatcher', locked: false, isDeleted: false }
          ]}
          companies={[
            { companyCode: 'VINAMILK', kycStatus: 'VERIFIED', creditLimitVnd: 1500000000 },
            { companyCode: 'MASAN', kycStatus: 'PENDING', creditLimitVnd: 500000000 }
          ]}
          contracts={[{ contractCode: 'MSA-1', status: 'SIGNED' }]}
          payments={[{ transactionCode: 'PAY-1', status: 'PAID', amountVnd: 12000000 }]}
          healthStatus="UP"
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Dashboard Đánh Giá Hiệu Suất Chuỗi Cung Ứng Xanh CCADRO/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Chỉ Số Sẵn Sàng Hệ Thống/i)).toBeInTheDocument();
    expect(screen.getByText(/1 vận đơn đang PENDING chưa hoạch định/i)).toBeInTheDocument();
    expect(screen.getByText(/1 xe trạng thái MAINTENANCE bị khóa xuất bến/i)).toBeInTheDocument();
    expect(screen.getByText(/1 doanh nghiệp B2B đang chờ thẩm định hồ sơ KYC/i)).toBeInTheDocument();

    // Switch across evaluation sub-tabs
    fireEvent.click(screen.getByRole('button', { name: /Vận Hành & Đội Xe/i }));
    expect(screen.getByText(/Sẵn Sàng Hạm Đội \(BRULE-01\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Carbon GLEC v3/i }));
    expect(screen.getByText(/Tổng Phát Thải Cắt Giảm \(GLEC v3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/25.6 kg CO2e/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tài Chính Net-30 & IAM/i }));
    expect(screen.getByText(/1 \/ 2 Doanh nghiệp/i)).toBeInTheDocument();
  });

  it('surfaces locked IAM accounts for Admin and renders real-time data-driven charts without static mocks', () => {
    const liveFleet = [
      {
        tripId: 't-live-1',
        vehicleCode: 'V001',
        licensePlate: '51C-888.99',
        originName: 'Cảng Cát Lái',
        destinationName: 'KCN VSIP 1',
        speedKmh: 58,
        deviationMeters: 15,
        deviationStatus: 'ON_ROUTE',
        co2SavedKg: 12.4,
        lastTelemetryAt: '2026-11-16T15:20:00Z'
      }
    ];

    render(
      <MemoryRouter>
        <SystemEvaluationDashboard demo={true}
          accounts={[{ username: 'locked_user', locked: true, isDeleted: false }]}
          hubItems={[{ itemCode: 'WB-1', dispatchStatus: 'DELIVERED_POD' }]}
          liveFleet={liveFleet}
        />
        <CarbonBenchmarkChart
          benchmarks={[
            {
              corridorCode: 'CATLAI-VSIP',
              corridorName: 'Cảng Cát Lái → VSIP 1',
              distanceKm: 27.3,
              actualCo2Kg: 21.5,
              benchmarkCo2Kg: 32.0
            }
          ]}
          liveFleet={liveFleet}
        />
        <CorridorEfficiencyBarChart liveFleet={liveFleet} />
        <DeviationTrendSparkline
          liveFleet={liveFleet}
          notifications={[{ id: 'n-99', title: 'Cảnh báo lệch tuyến 220m', severity: 'CRITICAL' }]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/1 tài khoản bị khóa đăng nhập cần Admin kiểm tra mở khóa/i)).toBeInTheDocument();
    expect(screen.getByText(/Cảng Cát Lái → VSIP 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cảng Cát Lái → KCN VSIP 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cảnh báo lệch tuyến 220m/i)).toBeInTheDocument();
  });
});

