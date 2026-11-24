import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DispatchPage from '../systems/operations/features/dispatch/DispatchPage';
import { api } from '../services/api';

vi.mock('../shared/map/MapView', () => ({
  default: ({ children }) => <div data-testid="mock-dispatch-map">{children}</div>
}));
vi.mock('../shared/map/RoutePolyline', () => ({
  default: ({ routingMetadataJson }) => (
    <div data-testid="mock-route-polyline" data-has-meta={Boolean(routingMetadataJson)} />
  )
}));
vi.mock('../shared/map/OriginMarker', () => ({ default: () => null }));
vi.mock('../shared/map/DestinationMarker', () => ({ default: () => null }));

describe('DispatchPage UC07 Pre-Dispatch Workspace', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders readiness summary cards, gate checklist, and disables dispatch when prerequisites are missing', async () => {
    vi.spyOn(api, 'getShipmentById').mockRejectedValue(new Error('Không tìm thấy vận đơn'));
    vi.spyOn(api, 'getActiveRouteVersion').mockResolvedValue({ result: null });
    vi.spyOn(api, 'getVehicles').mockResolvedValue({ result: [] });
    vi.spyOn(api, 'getDispatchDrivers').mockResolvedValue({ result: [] });
    vi.spyOn(api, 'getContainers').mockResolvedValue({ result: [] });

    render(
      <MemoryRouter initialEntries={['/dispatch/shp-missing']}>
        <Routes>
          <Route path="/dispatch/:shipmentId" element={<DispatchPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Thiếu dữ liệu để xét điều kiện/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phân công xe và tài xế' })).toBeInTheDocument();
    expect(screen.getByText('0/3 đạt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Phân công chuyến/i })).toBeDisabled();
  });

  it('unlocks dispatch gate when route, vehicle, and eligible driver are ready and creates trip', async () => {
    vi.spyOn(api, 'getShipmentById').mockResolvedValue({
      result: {
        id: 'shp-100',
        shipmentCode: 'SHP-2026-100',
        status: 'PLANNED',
        deliveryDeadline: '2026-11-25T10:00:00Z'
      }
    });
    vi.spyOn(api, 'getActiveRouteVersion').mockResolvedValue({
      result: {
        id: 'rv-1',
        versionNumber: 1,
        totalDistanceMeters: 28500,
        createdAt: '2026-11-21T08:00:00Z',
        routingMetadataJson: JSON.stringify({
          trafficSource: 'TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL',
          guidance: { instructions: [{ message: 'Nhập làn cao tốc Long Thành', routeOffsetInMeters: 1200 }] }
        }),
        routeGeoJson: {
          type: 'LineString',
          coordinates: [
            [106.7, 10.7],
            [106.8, 10.9]
          ]
        }
      }
    });
    vi.spyOn(api, 'getVehicles').mockResolvedValue({
      result: [
        {
          id: 'veh-1',
          vehicleCode: 'EV-01',
          plateNumber: '51C-888.99',
          status: 'AVAILABLE',
          fuelType: 'ELECTRIC',
          euroStandard: '6',
          maxPayloadTons: 20,
          isDeleted: false
        }
      ]
    });
    vi.spyOn(api, 'getDispatchDrivers').mockResolvedValue({
      result: [
        {
          id: 'drv-1',
          driverCode: 'D001',
          employeeCode: 'EMP-01',
          fullName: 'Nguyễn Văn Tài',
          verificationStatus: 'APPROVED',
          licenseClass: 'FC',
          maskedLicense: '7901****99',
          licenseExpiryDate: '2030-01-01',
          licenseIssueDate: '2020-01-01',
          healthCheckPassed: true,
          safetyTrainingCertified: true,
          hosContinuousMin: 0,
          hosDailyMin: 60,
          eligible: true,
          reasons: []
        }
      ]
    });
    vi.spyOn(api, 'getContainers').mockResolvedValue({ result: [] });
    const createDispatchOrderSpy = vi
      .spyOn(api, 'createDispatchOrder')
      .mockResolvedValue({ result: { tripId: 'trip-999' } });

    render(
      <MemoryRouter initialEntries={['/dispatch/shp-100']}>
        <Routes>
          <Route path="/dispatch/:shipmentId" element={<DispatchPage />} />
          <Route path="/trips/:tripId" element={<h1>Trip tracking trip-999</h1>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Phiên bản 1')).toBeInTheDocument();
    expect(screen.getByTestId('mock-route-polyline')).toHaveAttribute('data-has-meta', 'true');
    expect(screen.getByText(/Nhập làn cao tốc Long Thành/)).toBeInTheDocument();
    expect(screen.getByText('1/3 đạt')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Xe đang sẵn sàng'), { target: { value: 'veh-1' } });
    fireEvent.change(screen.getByLabelText('Tài xế thực hiện chuyến'), {
      target: { value: 'drv-1' }
    });

    expect(screen.getByText('3/3 đạt')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Phân công chuyến/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(createDispatchOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          shipmentId: 'shp-100',
          vehicleId: 'veh-1',
          driverId: 'drv-1'
        })
      );
    });
    expect(await screen.findByText('Trip tracking trip-999')).toBeInTheDocument();
  });
});

