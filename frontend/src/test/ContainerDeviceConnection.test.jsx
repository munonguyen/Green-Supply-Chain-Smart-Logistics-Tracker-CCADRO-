import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ContainerDeviceConnection from '../systems/operations/features/containers/ContainerDeviceConnection';
import { api } from '../services/api';
afterEach(() => vi.restoreAllMocks());

it('configures a GPS endpoint during transit without fabricating a position or route connection', async () => {
  vi.spyOn(api, 'getContainerDeviceConnection').mockResolvedValue({
    result: { connection: null, route: null, linkageIssue: 'Chưa liên kết ID vận đơn.' }
  });
  vi.spyOn(api, 'configureContainerDevice').mockResolvedValue({
    result: {
      deviceKey: 'example-one-time-key',
      state: { connection: { deviceId: 'IMEI001', label: 'GPS', enabled: true }, route: null,
        linkageIssue: 'Chưa liên kết ID vận đơn.' },
      ingestPath: '/api/v1/assets/device-ingest/IMEI001'
    }
  });
  const telemetry = vi.spyOn(api, 'updateContainerTelemetry');
  render(<ContainerDeviceConnection container={{ containerCode: 'TEST01', status: 'IN_TRANSIT' }}
    now={1000} onRefresh={vi.fn()} onSelectTab={vi.fn()} />);
  await screen.findByText('Chưa liên kết ID vận đơn.');
  fireEvent.click(screen.getByRole('button', { name: 'Cấu hình kết nối' }));
  fireEvent.change(screen.getByLabelText('Mã thiết bị / IMEI / serial *'), { target: { value: 'IMEI001' } });
  fireEvent.change(screen.getByLabelText('Tên thiết bị *'), { target: { value: 'GPS' } });
  fireEvent.change(screen.getByLabelText('Lý do cấu hình *'), { target: { value: 'Bổ sung GPS đang sử dụng' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu liên kết và cấp khóa' }));
  expect(await screen.findByRole('region', { name: 'Khóa kết nối vừa cấp' })).toBeInTheDocument();
  expect(screen.getByLabelText('X-Device-Key')).toHaveAttribute('type', 'password');
  expect(screen.getByText('Chưa đủ liên kết chuyến')).toBeInTheDocument();
  expect(telemetry).not.toHaveBeenCalled();
  expect(api.configureContainerDevice).toHaveBeenCalledWith('TEST01', {
    deviceId: 'IMEI001', label: 'GPS', reason: 'Bổ sung GPS đang sử dụng'
  });
});

it('retains configuration fields if the server refuses the device binding', async () => {
  vi.spyOn(api, 'getContainerDeviceConnection').mockResolvedValue({ result: { connection: null, route: null } });
  vi.spyOn(api, 'configureContainerDevice').mockRejectedValue(new Error('Mã thiết bị đã thuộc container khác.'));
  render(<ContainerDeviceConnection container={{ containerCode: 'TEST01', status: 'IN_TRANSIT' }}
    now={1000} onRefresh={vi.fn()} onSelectTab={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cấu hình kết nối' }));
  fireEvent.change(screen.getByLabelText('Mã thiết bị / IMEI / serial *'), { target: { value: 'IMEI001' } });
  fireEvent.change(screen.getByLabelText('Tên thiết bị *'), { target: { value: 'GPS' } });
  fireEvent.change(screen.getByLabelText('Lý do cấu hình *'), { target: { value: 'Đối soát' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu liên kết và cấp khóa' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Mã thiết bị đã thuộc container khác.'));
  expect(screen.getByLabelText('Mã thiết bị / IMEI / serial *')).toHaveValue('IMEI001');
  expect(screen.queryByRole('region', { name: 'Khóa kết nối vừa cấp' })).not.toBeInTheDocument();
});
