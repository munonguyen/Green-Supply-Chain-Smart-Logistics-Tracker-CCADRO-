import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShipmentsPage from '../systems/operations/features/shipments/ShipmentsPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getTrips: vi.fn(),
    getShipments: vi.fn(),
    softDeleteShipment: vi.fn(),
    restoreShipment: vi.fn()
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      username: 'dispatcher',
      role: 'DISPATCHER',
      fullName: 'Điều Phối Viên Vận Tải'
    }
  })
}));

const MOCK_SHIPMENTS = [
  {
    id: 'shp-001',
    shipmentCode: 'SH-2026-081',
    customerId: 'VINAMILK',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'KCN VSIP 1, Bình Dương',
    cargoWeightTons: 14.5,
    vehicleCode: 'V001 • 51C-888.99 (EV)',
    status: 'IN_TRANSIT'
  },
  {
    id: 'shp-002',
    shipmentCode: 'SH-2026-082',
    customerId: 'SAMSUNG_VN',
    originName: 'Cảng Cái Mép',
    destinationName: 'KCN Nhơn Trạch',
    cargoWeightTons: 21.0,
    vehicleCode: 'V003 • 60C-912.45 (EV)',
    status: 'DEVIATION_ALERT'
  },
  {
    id: 'shp-003',
    shipmentCode: 'SH-2026-083',
    customerId: 'TH_TRUE_MILK',
    originName: 'Cảng Hiệp Phước',
    destinationName: 'KCN Tân Bình',
    cargoWeightTons: 12.0,
    status: 'PLANNED'
  }
];

describe('ShipmentsPage Professional UI & Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window.localStorage?.clear === 'function') {
      window.localStorage.clear();
    }
    api.getTrips.mockResolvedValue({ result: [] });
    api.getShipments.mockResolvedValue({ result: MOCK_SHIPMENTS });
    api.softDeleteShipment.mockResolvedValue({ code: 1000 });
    api.restoreShipment.mockResolvedValue({ code: 1000 });
  });

  it('renders modern header, KPI statistics and high-contrast filter pills', async () => {
    render(
      <MemoryRouter>
        <ShipmentsPage />
      </MemoryRouter>
    );

    // Header elements
    expect(await screen.findByText('Danh Sách Vận Đơn Toàn Hệ Thống')).toBeInTheDocument();
    expect(screen.getByText(/Quản Lý Vận Đơn & Điều Phối Hành Lang Xanh/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở Radar 3D Live/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tạo Vận Đơn Mới/i })).toBeInTheDocument();

    // KPI Cards
    expect(screen.getByText('Tổng Vận Đơn')).toBeInTheDocument();
    expect(screen.getByText('Đang Lưu Thông')).toBeInTheDocument();
    expect(screen.getByText('Cảnh Báo Lệch Tuyến')).toBeInTheDocument();
    expect(screen.getByText('CO2e Đã Tiết Kiệm')).toBeInTheDocument();

    // High-contrast filter pills with count badges
    const allPill = screen.getByRole('tab', { name: /Tất cả vận đơn/i });
    const transitPill = screen.getByRole('tab', { name: /Đang lưu thông/i });
    const alertPill = screen.getByRole('tab', { name: /Lệch hành lang/i });
    const plannedPill = screen.getByRole('tab', { name: /Chờ điều phối/i });

    expect(allPill).toHaveClass('is-active');
    expect(transitPill).not.toHaveClass('is-active');
    expect(alertPill).not.toHaveClass('is-active');
    expect(plannedPill).not.toHaveClass('is-active');
  });

  it('filters shipments when clicking status pills', async () => {
    render(
      <MemoryRouter>
        <ShipmentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('SH-2026-081')).toBeInTheDocument();
    expect(screen.getByText('SH-2026-082')).toBeInTheDocument();
    expect(screen.getByText('SH-2026-083')).toBeInTheDocument();

    // Filter by IN_TRANSIT
    const transitPill = screen.getByRole('tab', { name: /Đang lưu thông/i });
    fireEvent.click(transitPill);

    expect(transitPill).toHaveClass('is-active');
    expect(screen.getByText('SH-2026-081')).toBeInTheDocument();
    expect(screen.queryByText('SH-2026-082')).not.toBeInTheDocument();
    expect(screen.queryByText('SH-2026-083')).not.toBeInTheDocument();
  });

  it('renders color-coded professional action buttons for each shipment row', async () => {
    render(
      <MemoryRouter>
        <ShipmentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('SH-2026-081')).toBeInTheDocument();

    // Verify presence of specialized action buttons
    const routeBtns = screen.getAllByRole('link', { name: /Lập Tuyến 3D/i });
    const dispatchBtns = screen.getAllByRole('link', { name: /Điều Phối/i });
    const gpsBtns = screen.getAllByRole('link', { name: /Giám Sát GPS/i });

    expect(routeBtns.length).toBe(3);
    expect(dispatchBtns.length).toBe(3);
    expect(gpsBtns.length).toBe(3);

    // Verify styling classes
    expect(routeBtns[0]).toHaveClass('action-btn-route');
    expect(dispatchBtns[0]).toHaveClass('action-btn-dispatch');
    expect(gpsBtns[0]).toHaveClass('action-btn-gps');
  });
});
