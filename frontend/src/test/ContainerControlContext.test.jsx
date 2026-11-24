import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ContainerControlContext, { ControlEvidence } from '../systems/operations/features/containers/ContainerControlContext';
vi.mock('../services/api', () => ({ api: {}, gatewayUrl: (path) => 'http://localhost:8888' + path }));

it('uses only current-shipment cargo and marks unresolved assignment IDs', () => {
  render(<ContainerControlContext
    container={{ assignedShipmentCode: 'SHIP-A', containerCode: 'TEST' }}
    workflow={{ roundNumber: 1, stages: [{ stage: 'PREPARATION', label: 'Chuẩn bị' }], startedBy: 'dispatcher' }}
    items={[{ shipmentCode: 'SHIP-A', parcelCount: 3, weightKg: 50 }, { shipmentCode: 'SHIP-B', parcelCount: 90, weightKg: 900 }]}
    manifestState="ready"
  />);
  expect(screen.getByText('1 dòng · 3 kiện')).toBeInTheDocument();
  expect(screen.getByText('Chưa đủ ID để xác minh chuyến')).toBeInTheDocument();
  expect(screen.getByText(/50 kg/)).toBeInTheDocument();
  expect(screen.queryByText(/900 kg/)).not.toBeInTheDocument();
});

it('marks old confirmations without replacing evidence with current data', () => {
  render(<ControlEvidence />);
  expect(screen.getByText(/Biên bản cũ chưa lưu/)).toBeInTheDocument();
});
