import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ContainerInspectionModel from '../systems/operations/features/containers/ContainerInspectionModel';
import { CONTAINER_TYPES } from '../systems/operations/features/containers/containerPresentation';

const template = [
  { key: 'frame_corner_castings', label: 'Khung container' },
  { key: 'reefer_unit_mount', label: 'Cụm máy lạnh' },
  { key: 'reefer_power_control', label: 'Nguồn điện' }
];
it.each(Object.keys(CONTAINER_TYPES))('shows the complete tractor/trailer combination for %s', type => {
  render(<ContainerInspectionModel type={type} template={template} results={{}} onSelect={vi.fn()} />);
  expect(screen.getByRole('img', { name: `Mô hình xe container gồm đầu kéo, sơ mi rơ moóc và ${CONTAINER_TYPES[type]}` })).toBeInTheDocument();
  expect(screen.getByText('ĐẦU KÉO')).toBeInTheDocument();
});
it('switches the truck view while preserving the selected inspection point and its verdict', () => {
  const select = vi.fn();
  render(<ContainerInspectionModel type="REEFER_40FT" template={template} results={{ frame_corner_castings: { status: 'PASS' } }} selectedKey="frame_corner_castings" onSelect={select} />);
  const point = screen.getByRole('button', { name: '1. Khung container · Đạt' });
  expect(point).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Bên hông' }));
  expect(screen.getByRole('button', { name: 'Bên hông' })).toHaveAttribute('aria-pressed', 'true');
  expect(point).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(point);
  expect(select).toHaveBeenCalledWith('frame_corner_castings', point);
});
it('keeps the original checklist mapping when filtering refrigeration points', () => {
  const select = vi.fn();
  render(<ContainerInspectionModel type="REEFER_20FT" template={template} results={{}} onSelect={select} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cụm lạnh', exact: true }));
  expect(screen.queryByRole('button', { name: /1. Khung container/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '3. Nguồn điện · Chưa kiểm tra' }));
  expect(select).toHaveBeenCalledWith('reefer_power_control', expect.any(HTMLButtonElement));
});

it('applies 4-tier ISO 55000 color classes onto model pins, SVG quality overlays, and legend', () => {
  const { container } = render(
    <ContainerInspectionModel
      type="REEFER_40FT"
      template={template}
      results={{
        frame_corner_castings: { status: 'PASS', measurements: { _conditionPct: '95' } },
        reefer_unit_mount: { status: 'FAIL', measurements: { _conditionPct: '58' } },
        reefer_power_control: { status: 'FAIL', measurements: { _conditionPct: '25' } }
      }}
      onSelect={vi.fn()}
    />
  );

  expect(screen.getByRole('button', { name: '1. Khung container · Đạt' })).toHaveClass('tier-A');
  expect(screen.getByRole('button', { name: '2. Cụm máy lạnh · Không đạt' })).toHaveClass('tier-C');
  expect(screen.getByRole('button', { name: '3. Nguồn điện · Không đạt' })).toHaveClass('tier-D');
  expect(container.querySelector('.model-zone.tier-A')).toBeInTheDocument();
  expect(container.querySelector('.model-zone.tier-D')).toBeInTheDocument();
  expect(screen.getByLabelText('Thang màu đánh giá chất lượng AHI')).toHaveTextContent('Hạng C (50–69%)');
});

it('toggles 4-tier color preview on an uninspected container and lets users inspect zones', () => {
  const select = vi.fn();
  const { container } = render(
    <ContainerInspectionModel type="REEFER_40FT" template={template} results={{}} onSelect={select} />
  );
  const toggleBtn = screen.getByRole('button', { name: /Xem thử màu A–D/i });
  fireEvent.click(toggleBtn);
  expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.model-zone.tier-A')).toBeInTheDocument();
  expect(container.querySelector('.model-zone.tier-C')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '1. Khung container · Chưa kiểm tra' })).toHaveClass('tier-A');
});
