import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, afterEach } from 'vitest';
import DataManagementPage from '../systems/admin/features/data/DataManagementPage';
import { api } from '../services/api';

afterEach(() => vi.restoreAllMocks());
it('preserves inventory counts when runtime health is unavailable and marks failed data sources', async () => {
  vi.spyOn(api, 'getDataInventory').mockResolvedValue({ result: {
    datasets: { staff: { state: 'available', count: 7 }, containers: { state: 'unavailable', error: 'Không đọc được nguồn' } },
    checks: { pendingDrivers: 2, expiredLicenses: 1, deletedUsers: 0 }
  } });
  vi.spyOn(api, 'getDiscoveredServiceHealth').mockRejectedValue(new Error('Offline'));
  render(<MemoryRouter><DataManagementPage /></MemoryRouter>);
  expect(await screen.findByText(/2 tài xế đang chờ duyệt/)).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText('Không đọc được nguồn')).toBeInTheDocument();
  expect(screen.getByText(/Không tải được registry/)).toBeInTheDocument();
});
