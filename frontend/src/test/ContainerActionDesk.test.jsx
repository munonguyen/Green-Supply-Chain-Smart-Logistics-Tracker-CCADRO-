import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContainerProfileEditor } from '../systems/operations/features/containers/ContainerActionDesk';
import { DispatchNoteForm } from '../systems/operations/features/containers/ContainerDispatchJournal';
import ContainerDispatchRelease from '../systems/operations/features/containers/ContainerDispatchRelease';
import { api } from '../services/api';

afterEach(() => vi.restoreAllMocks());

it('keeps a failed update note on screen without reporting success', async () => {
  const onSaved = vi.fn();
  vi.spyOn(api, 'createContainerDispatchNote').mockRejectedValue(
    new Error('Không thể lưu nhật ký')
  );
  render(<DispatchNoteForm code="TEST01" onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText('Nội dung cập nhật *'), {
    target: { value: 'Đang chờ cổng cảng xác nhận.' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu cập nhật' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể lưu nhật ký');
  expect(screen.getByLabelText('Nội dung cập nhật *')).toHaveValue('Đang chờ cổng cảng xác nhận.');
  expect(onSaved).not.toHaveBeenCalled();
});

it('saves human notes without modifying telemetry or trip state', async () => {
  const onSaved = vi.fn();
  vi.spyOn(api, 'createContainerDispatchNote').mockResolvedValue({ result: { id: 'note-1' } });
  const telemetry = vi.spyOn(api, 'updateContainerTelemetry');
  render(<DispatchNoteForm code="TEST01" onClose={vi.fn()} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText('Phân loại'), { target: { value: 'DELAY' } });
  fireEvent.change(screen.getByLabelText('Nội dung cập nhật *'), {
    target: { value: 'Chậm 20 phút do ùn tắc.' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu cập nhật' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(api.createContainerDispatchNote).toHaveBeenCalledWith('TEST01', {
    category: 'DELAY',
    content: 'Chậm 20 phút do ùn tắc.'
  });
  expect(telemetry).not.toHaveBeenCalled();
});

it('submits the prior profile snapshot and retains conflicting edits', async () => {
  const onSaved = vi.fn();
  vi.spyOn(api, 'updateContainerProfile').mockRejectedValue(
    new Error('Hồ sơ đã được người khác cập nhật.')
  );
  render(
    <ContainerProfileEditor
      container={{
        containerCode: 'TEST01',
        responsibleCompanyId: '',
        ownerName: 'Owner',
        isoType: '45G1',
        telematicsModel: 'Device',
        esealNumber: 'SEAL01'
      }}
      onClose={vi.fn()}
      onSaved={onSaved}
    />
  );
  fireEvent.change(screen.getByLabelText('Chủ sở hữu'), { target: { value: 'New owner' } });
  fireEvent.change(screen.getByLabelText('Lý do cập nhật *'), {
    target: { value: 'Đối chiếu hồ sơ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Hồ sơ đã được người khác cập nhật.');
  expect(screen.getByLabelText('Chủ sở hữu')).toHaveValue('New owner');
  expect(api.updateContainerProfile).toHaveBeenCalledWith(
    'TEST01',
    expect.objectContaining({
      ownerName: 'New owner',
      previousValues: {
        responsibleCompanyId: '',
        ownerName: 'Owner',
        isoType: '45G1',
        telematicsModel: 'Device',
        sealNumber: 'SEAL01'
      }
    })
  );
  expect(onSaved).not.toHaveBeenCalled();
});

it('reconciles an existing dispatch order after an ambiguous timeout without starting the driver trip', async () => {
  const container = {
    assignedShipmentId: 'shipment',
    assignedDriverId: 'driver',
    assignedVehicleId: 'vehicle'
  };
  vi.spyOn(api, 'getShipmentDispatchOrder')
    .mockRejectedValueOnce(Object.assign(new Error('Missing'), { status: 404 }))
    .mockResolvedValue({ result: { tripId: 'trip', dispatchCode: 'DSP-01', status: 'ASSIGNED' } });
  vi.spyOn(api, 'getActiveRouteVersion').mockResolvedValue({ result: { id: 'route' } });
  vi.spyOn(api, 'createDispatchOrder').mockRejectedValue(new Error('Request timeout'));
  const start = vi.spyOn(api, 'startTrip');
  render(
    <ContainerDispatchRelease container={container} onSelectTab={vi.fn()} onRefresh={vi.fn()} />
  );
  const button = await screen.findByRole('button', { name: 'Phát hành lệnh cho tài xế' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(await screen.findByText('Đã giao chuyến cho tài xế')).toBeInTheDocument();
  expect(api.createDispatchOrder).toHaveBeenCalledOnce();
  expect(start).not.toHaveBeenCalled();
});

it('allows profile correction during transit while protecting ISO and seal fields', async () => {
  vi.spyOn(api, 'updateContainerProfile').mockResolvedValue({ result: {} });
  render(<ContainerProfileEditor container={{
    containerCode: 'TEST01', status: 'IN_TRANSIT', ownerName: 'Owner', isoType: '45G1',
    telematicsModel: 'Device', esealNumber: 'SEAL01'
  }} profileLocked onClose={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByLabelText('Chủ sở hữu')).toBeEnabled();
  expect(screen.getByLabelText('Thiết bị giám sát')).toBeEnabled();
  expect(screen.getByLabelText('Mã loại ISO')).toBeDisabled();
  expect(screen.getByLabelText('Số niêm phong')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Lý do cập nhật *'), { target: { value: 'Bổ sung chủ sở hữu' } });
  expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
});
