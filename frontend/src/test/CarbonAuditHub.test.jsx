import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CarbonAuditHub from '../systems/operations/features/carbon/CarbonAuditHub';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getTrips: vi.fn(),
    getShipments: vi.fn(),
    getEmissionFactors: vi.fn()
  }
}));

const MOCK_TRIPS = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    tripCode: 'TRIP-SH001',
    shipmentId: 'c0000000-0000-0000-0000-000000000001',
    vehicleId: 'a0000000-0000-0000-0000-000000000001',
    driverId: 'b0000000-0000-0000-0000-000000000001',
    status: 'EN_ROUTE',
    actualDistanceMeters: 28500
  },
  {
    id: 'ec6491ff-c266-5c02-9b8f-5b86c8510a80',
    tripCode: 'DEMO-TRIP-4',
    shipmentId: '4fc7dabe-4d5f-56c1-91b9-3695c86b2ea5',
    vehicleId: '96034c42-686f-59ac-8ff1-010788761ee4',
    driverId: '8adebe9e-a927-5135-81d7-ffb893bb524b',
    status: 'COMPLETED',
    actualDistanceMeters: 27200
  }
];

const MOCK_SHIPMENTS = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    shipmentCode: 'SHP-2026-8219',
    customerId: 'P&G / VINAMILK',
    originName: 'Cụm Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'KCN VSIP 1, Bình Dương',
    cargoWeightTons: 14.5
  },
  {
    id: '4fc7dabe-4d5f-56c1-91b9-3695c86b2ea5',
    shipmentCode: 'DEMO-SH-004',
    customerId: 'VINAMILK BÌNH DƯƠNG',
    originName: 'Kho Cát Lái, TP. Thủ Đức',
    destinationName: 'Trung tâm phân phối VSIP 1',
    cargoWeightTons: 2.4
  }
];

describe('CarbonAuditHub UC12 Enterprise Audit Console', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTrips.mockResolvedValue({ result: MOCK_TRIPS });
    api.getShipments.mockResolvedValue({ result: MOCK_SHIPMENTS });
    api.getEmissionFactors.mockResolvedValue({ result: [] });
  });

  it('renders executive KPI cards and GLEC v3 standard badges', async () => {
    render(
      <MemoryRouter>
        <CarbonAuditHub />
      </MemoryRouter>
    );

    // Badges & Header
    expect(await screen.findByText(/Chuẩn GLEC Framework v3.0/i)).toBeInTheDocument();
    expect(screen.getByText(/ISO 14083:2023 Verified/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sổ Cái Kiểm Toán Phát Thải Chuyến Xe Vận Tải/i)
    ).toBeInTheDocument();

    // 4 KPI Cards
    expect(screen.getByText(/Tổng Phát Thải Thực Tế \(WTW\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Lượng CO₂e Đã Cắt Giảm/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Khối Lượng Luân Chuyển/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Hợp Quy ISO 14083 & GLEC/i)).toBeInTheDocument();
  });

  it('renders detailed audit table with transport activity (Tonne-km) and GLEC emissions', async () => {
    render(
      <MemoryRouter>
        <CarbonAuditHub />
      </MemoryRouter>
    );

    // Wait for trips to be enriched
    expect(await screen.findByText('TRIP-SH001')).toBeInTheDocument();
    expect(screen.getByText('DEMO-TRIP-4')).toBeInTheDocument();

    // Verify presence of transport activity and GLEC calculations
    expect(screen.getByText('SHP-2026-8219')).toBeInTheDocument();
    expect(screen.getByText('DEMO-SH-004')).toBeInTheDocument();

    // Audit status badges
    expect(screen.getByText(/Đo Kiểm Live \(IoT\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã Chốt Sổ \(Audited\)/i)).toBeInTheDocument();

    // Specialized action buttons
    const auditBtns = screen.getAllByRole('link', { name: /Kiểm Toán GLEC/i });
    const gpsBtns = screen.getAllByRole('link', { name: /Bản Đồ 3D/i });
    expect(auditBtns.length).toBe(2);
    expect(gpsBtns.length).toBe(2);
  });

  it('filters trips by status tabs', async () => {
    render(
      <MemoryRouter>
        <CarbonAuditHub />
      </MemoryRouter>
    );

    expect(await screen.findByText('TRIP-SH001')).toBeInTheDocument();
    expect(screen.getByText('DEMO-TRIP-4')).toBeInTheDocument();

    // Filter by completed (audited)
    const auditedPill = screen.getByRole('button', { name: /Đã kiểm toán & chốt sổ/i });
    fireEvent.click(auditedPill);

    expect(auditedPill).toHaveClass('active');
    expect(screen.getByText('DEMO-TRIP-4')).toBeInTheDocument();
    expect(screen.queryByText('TRIP-SH001')).not.toBeInTheDocument();
  });

  it('opens and closes GLEC formula methodology modal', async () => {
    render(
      <MemoryRouter>
        <CarbonAuditHub />
      </MemoryRouter>
    );

    const formulaBtn = await screen.findByRole('button', { name: /Công Thức GLEC v3/i });
    fireEvent.click(formulaBtn);

    expect(
      screen.getByText(/Phương Pháp Tính Toán Phát Thải Chuẩn GLEC v3 \/ ISO 14083/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/1. Hoạt Động Vận Tải \(Transport Activity\):/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Phát Thải Thực Tế Well-to-Wheel \(WTW\):/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Đã Hiểu & Đóng/i });
    fireEvent.click(closeBtn);

    expect(
      screen.queryByText(/Phương Pháp Tính Toán Phát Thải Chuẩn GLEC v3 \/ ISO 14083/i)
    ).not.toBeInTheDocument();
  });
});
