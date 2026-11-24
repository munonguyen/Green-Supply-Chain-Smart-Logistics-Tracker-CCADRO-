import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BenchmarkPage from '../systems/operations/features/carbon/BenchmarkPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getCarbonBenchmarks: vi.fn()
  }
}));

const MOCK_API_BENCHMARKS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    benchmarkName: 'HCMC to Binh Duong Heavy Industrial Corridor',
    corridorCode: 'HCMC_PORT_CLUSTER_BINH_DUONG_VSIP_CLUSTER',
    originZone: 'HCMC_PORT_CLUSTER',
    destinationZone: 'BINH_DUONG_VSIP_CLUSTER',
    averageCo2ePerTonneKm: 0.082000,
    bestInClassCo2ePerTonneKm: 0.068000,
    periodMonth: '2026-10',
    targetReductionPercentage: 17.07
  }
];

describe('BenchmarkPage Executive Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCarbonBenchmarks.mockResolvedValue({ result: MOCK_API_BENCHMARKS });
  });

  it('renders executive KPI cards and certification badges', async () => {
    render(
      <MemoryRouter>
        <BenchmarkPage />
      </MemoryRouter>
    );

    // Badges & Header
    expect(await screen.findByText(/Chuẩn GLEC v3.0/i)).toBeInTheDocument();
    expect(screen.getByText(/ISO 14083 Audited/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Đối Chuẩn Cường Độ Phát Thải Các Hành Lang Kinh Tế Phía Nam/i)
    ).toBeInTheDocument();

    // 4 KPI Cards
    expect(screen.getAllByText(/Trung Bình Vùng/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Mốc Đội Xe Xanh Tối Ưu/i)).toBeInTheDocument();
    expect(screen.getByText(/Dư Địa Cắt Giảm Tiềm Năng/i)).toBeInTheDocument();
    expect(screen.getByText(/Lượng CO₂e Đã Tránh Được/i)).toBeInTheDocument();
  });

  it('renders comparative corridor chart and side panels (Powertrain & Audit)', async () => {
    render(
      <MemoryRouter>
        <BenchmarkPage />
      </MemoryRouter>
    );

    // Chart title and sections
    expect(
      await screen.findByText(/Đối Chiếu Cường Độ Phát Thải Theo Từng Hành Lang/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Cơ Cấu Phương Tiện & Phát Thải/i)).toBeInTheDocument();
    expect(screen.getByText(/Kiểm Toán Tuân Thủ Chuẩn Quốc Tế/i)).toBeInTheDocument();

    // Check specific powertrain entries
    expect(screen.getByText(/Đầu kéo Điện \(EV Heavy Truck\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Đầu kéo Euro 5 \/ Euro 6/i)).toBeInTheDocument();
    expect(screen.getByText(/98.4% Đạt chuẩn/i)).toBeInTheDocument();
    expect(screen.getByText(/Hợp quy 100%/i)).toBeInTheDocument();
  });

  it('renders full leaderboard table and filters by category', async () => {
    render(
      <MemoryRouter>
        <BenchmarkPage />
      </MemoryRouter>
    );

    // Wait for data load - corridor names appear in both chart and table
    expect(
      (await screen.findAllByText(/Hành lang Cụm Cảng Cái Mép ↔ KCN Nhơn Trạch & Biên Hòa/i)).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Hành lang Vành Đai 3 TP. HCM ↔ Cụm Logistics Long Thành/i).length
    ).toBeGreaterThanOrEqual(1);

    // Click filter pill: KCN & Vành Đai
    const industrialPill = screen.getByRole('button', { name: /KCN & Vành Đai/i });
    fireEvent.click(industrialPill);

    expect(industrialPill).toHaveClass('active');
    // Leaderboard table still displays industrial corridor
    expect(
      screen.getAllByText(/Hành lang Vành Đai 3 TP. HCM ↔ Cụm Logistics Long Thành/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders AI Dispatcher smart recommendations', async () => {
    render(
      <MemoryRouter>
        <BenchmarkPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Khuyến Nghị Điều Phối Thông Minh Tối Ưu Hóa Hành Lang/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chuyển Khung Giờ Xuất Bến Tránh Cao Điểm Cát Lái/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ưu Tiên Đội Xe Điện Tuyến Cái Mép ↔ Nhơn Trạch/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Khép Kín Vòng Tròn Chiều Về VSIP 1 ↔ Cát Lái/i)
    ).toBeInTheDocument();
  });
});
