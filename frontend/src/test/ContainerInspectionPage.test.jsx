import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import ContainerInspectionPage from '../systems/operations/features/containers/ContainerInspectionPage';
const api = vi.hoisted(() => ({ getContainerInspectionOverview: vi.fn(), getContainerSafetyInspection: vi.fn() }));
vi.mock('../services/api', () => ({ api }));
const records = [
  { containerCode: 'DRY-01', containerType: 'DRY_20FT', containerStatus: 'AVAILABLE', status: 'NOT_STARTED', checkedItemsCount: 0, totalItemsCount: 7 },
  { containerCode: 'RFR-02', containerType: 'REEFER_40FT', containerStatus: 'MAINTENANCE', status: 'DRAFT', checkedItemsCount: 3, totalItemsCount: 11 }
];
beforeEach(() => {
  api.getContainerInspectionOverview.mockResolvedValue({ result: records });
  api.getContainerSafetyInspection.mockResolvedValue({ result: { containerCode: 'DRY-01', containerType: 'DRY_20FT', templateVersion: '1.0', template: [], inspection: null, history: [] } });
});
it('provides its own register with type filters and inspection progress', async () => {
  render(<MemoryRouter><ContainerInspectionPage /></MemoryRouter>);
  const list = screen.getByRole('complementary', { name: 'Danh sách kiểm tra container' });
  expect(await within(list).findByText('DRY-01')).toBeInTheDocument();
  expect(within(list).getByText('3/11 mục')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc loại container'), { target: { value: 'REEFER_40FT' } });
  expect(within(list).queryByText('DRY-01')).not.toBeInTheDocument();
  expect(within(list).getByText('RFR-02')).toBeInTheDocument();
  fireEvent.click(within(list).getByRole('button', { name: /Đặt lại bộ lọc/i }));
  expect(within(list).getByText('DRY-01')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sắp xếp danh sách kiểm tra'), { target: { value: 'CODE_ASC' } });
  expect(within(list).getByText('RFR-02')).toBeInTheDocument();
});
it('opens an unassigned container directly in the separate workspace', async () => {
  render(<MemoryRouter initialEntries={['/container-inspections?container=DRY-01']}><ContainerInspectionPage /></MemoryRouter>);
  expect(await screen.findByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled();
  expect(api.getContainerSafetyInspection).toHaveBeenCalledWith('DRY-01');
});
