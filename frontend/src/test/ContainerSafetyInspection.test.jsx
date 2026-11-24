import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContainerSafetyInspection from '../systems/operations/features/containers/ContainerSafetyInspection';

const api = vi.hoisted(() => ({
  getContainerSafetyInspection: vi.fn(),
  submitContainerSafetyInspection: vi.fn()
}));
vi.mock('../services/api', () => ({ api }));

const container = {
  containerCode: 'RFR-01',
  containerType: 'REEFER_40FT',
  status: 'AVAILABLE',
  cscNextExaminationDate: '2027-06-01',
  cscInspectionScheme: 'PES',
  eSealNumber: 'SEAL-9911'
};

const template = [
  { key: 'frame', label: 'Khung container', group: 'Kết cấu chung', guidance: 'Kiểm tra khung.', critical: true },
  { key: 'tires_brakes_axle', label: 'Lốp xe, trục & phanh moóc', group: 'An toàn vận hành', guidance: 'Kiểm tra độ sâu gai lốp & phanh.', critical: true },
  { key: 'reefer_unit_mount', label: 'Cụm lạnh', group: 'Thiết bị lạnh', guidance: 'Thử nhiệt độ.', critical: true },
  { key: 'csc_plate', label: 'Biển nhận dạng và hồ sơ CSC', group: 'Nhận dạng', guidance: 'Kiểm tra hồ sơ CSC.', critical: true }
];

const record = (status, checks = [], extra = {}) => ({
  id: 'inspection',
  status,
  containerType: container.containerType,
  templateVersion: '1.0',
  inspectionNumber: 1,
  checkedItemsCount: checks.length,
  totalItemsCount: template.length,
  revision: 0,
  inspectedBy: 'dispatcher',
  updatedAt: new Date().toISOString(),
  inspectedAt: status === 'DRAFT' ? null : new Date().toISOString(),
  failedItemsCount: checks.filter((item) => item.status === 'FAIL').length,
  checks,
  ...extra
});

const response = (inspection = null, history) => ({
  result: {
    containerCode: container.containerCode,
    containerType: container.containerType,
    templateVersion: '1.0',
    roundNumber: 0,
    template,
    inspection,
    history: history || (inspection ? [inspection] : [])
  }
});

describe('model-focused container & vehicle safety inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getContainerSafetyInspection.mockResolvedValue(response());
  });

  it('starts inspection cleanly on top model layout without bulky vertical checklist column', async () => {
    api.submitContainerSafetyInspection.mockResolvedValue(response(record('DRAFT')));
    render(<ContainerSafetyInspection container={container} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu kiểm tra' }));
    await waitFor(() =>
      expect(api.submitContainerSafetyInspection).toHaveBeenCalledWith('RFR-01', {
        inspectionId: null,
        revision: null,
        complete: false,
        templateVersion: '1.0',
        summaryNotes: null,
        checks: []
      })
    );
    expect(screen.queryByText('DANH MỤC ĐÁNH GIÁ')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Hoàn tất đánh giá' })).toBeDisabled();
  });

  it('computes real-world tire wear %, safety % and retread recovery % from tread depth mm', async () => {
    api.getContainerSafetyInspection.mockResolvedValue(response(record('DRAFT')));
    render(<ContainerSafetyInspection container={container} />);

    // Open Tire & Axle checkpoint directly on the vehicle diagram
    fireEvent.click(await screen.findByRole('button', { name: '2. Lốp xe, trục & phanh moóc · Chưa kiểm tra' }));
    const card = await screen.findByRole('dialog', { name: 'Lốp xe, trục & phanh moóc' });

    // Tire tread at 2.4mm (between legal 1.6mm and advisory 3.2mm -> retreadable!)
    const treadInput = within(card).getByLabelText(/Chỉ số Độ sâu gai lốp/);
    fireEvent.change(treadInput, { target: { value: '2.4' } });
    const statsRegion = within(card).getByLabelText('Chỉ số an toàn và khả năng phục hồi bộ phận');
    expect(within(statsRegion).getByText(/82%/)).toBeInTheDocument();

    // Worn below legal 1.6mm TWI -> 0% safety, 100% damage, 0% repairable (must replace)
    fireEvent.change(treadInput, { target: { value: '1.2' } });
    expect(within(card).getByText('Vượt ngưỡng')).toBeInTheDocument();
    expect(within(statsRegion).getByText('0%')).toBeInTheDocument();
    expect(within(statsRegion).getByText('100%')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Đạt', exact: true })).toBeDisabled();
  });

  it('evaluates parts by ISO 55000 percentage slider & presets without manual text entry', async () => {
    api.getContainerSafetyInspection.mockResolvedValue(response(record('DRAFT')));
    api.submitContainerSafetyInspection.mockResolvedValue(
      response(
        record('DRAFT', [
          {
            key: 'frame',
            status: 'FAIL',
            measurements: { _conditionPct: '58' },
            notes: '[Đánh giá 58% · Hạng C · Hư hại TB (Cần sửa)] Hư hại 42% · Chi phí sửa/thay ~26% RAV. Khắc phục kỹ thuật theo tiêu chuẩn bảo dưỡng CCADRO (khôi phục ~90%).'
          }
        ])
      )
    );
    render(<ContainerSafetyInspection container={container} />);

    fireEvent.click(await screen.findByRole('button', { name: '1. Khung container · Chưa kiểm tra' }));
    const card = await screen.findByRole('dialog', { name: 'Khung container' });

    // Select 58% · Hạng C preset -> automatically marks FAIL, calculates 42% damage & ~26% RAV, enables Save with no manual typing
    fireEvent.click(within(card).getByRole('button', { name: '58% · Hạng C' }));
    const statsRegion = within(card).getByLabelText('Chỉ số an toàn và khả năng phục hồi bộ phận');
    expect(within(statsRegion).getByText('58%')).toBeInTheDocument();
    expect(within(statsRegion).getByText('42%')).toBeInTheDocument();
    expect(within(statsRegion).getByText('26% RAV')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Lưu kết quả' })).toBeEnabled();

    // Selecting 25% · Hạng D triggers > 45% RAV replacement warning
    fireEvent.click(within(card).getByRole('button', { name: '25% · Hạng D' }));
    expect(within(statsRegion).getByText(/47% RAV · Thay mới/)).toBeInTheDocument();

    // Dragging slider back to 82% automatically switches verdict to PASS
    const slider = within(card).getByRole('slider', { name: 'Phần trăm tình trạng an toàn bộ phận' });
    fireEvent.change(slider, { target: { value: '82' } });
    expect(within(card).getByRole('button', { name: 'Đạt', exact: true })).toHaveAttribute('aria-pressed', 'true');

    // Return to 58% and save without typing into textarea
    fireEvent.click(within(card).getByRole('button', { name: '58% · Hạng C' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Lưu kết quả' }));
    await waitFor(() =>
      expect(api.submitContainerSafetyInspection).toHaveBeenCalledWith(
        'RFR-01',
        expect.objectContaining({
          checks: [
            expect.objectContaining({
              key: 'frame',
              status: 'FAIL',
              measurements: { _conditionPct: '58' }
            })
          ]
        })
      )
    );
  });

  it('opens an actionable point card, saves structured progress and keeps focus on Escape', async () => {
    api.getContainerSafetyInspection.mockResolvedValue(
      response(record('DRAFT', [{ key: 'frame', status: 'PASS' }], { revision: 3 }))
    );
    api.submitContainerSafetyInspection.mockResolvedValue(
      response(
        record('DRAFT', [{ key: 'frame', status: 'FAIL', notes: 'Khung bị cong, cần sửa chữa.' }], {
          revision: 4
        })
      )
    );
    render(<ContainerSafetyInspection container={container} />);
    await screen.findByText('1/4 hạng mục');

    const point = screen.getByRole('button', { name: '1. Khung container · Đạt' });
    fireEvent.click(point);
    const card = await screen.findByRole('dialog', { name: 'Khung container' });
    fireEvent.click(within(card).getByRole('button', { name: 'Không đạt' }));
    expect(within(card).getByRole('button', { name: 'Lưu kết quả' })).toBeDisabled();

    fireEvent.change(within(card).getByRole('textbox'), {
      target: { value: 'Khung bị cong, cần sửa chữa.' }
    });
    fireEvent.click(within(card).getByRole('button', { name: 'Lưu kết quả' }));
    await waitFor(() =>
      expect(api.submitContainerSafetyInspection).toHaveBeenCalledWith(
        'RFR-01',
        expect.objectContaining({
          inspectionId: 'inspection',
          revision: 3,
          complete: false,
          checks: [{ key: 'frame', status: 'FAIL', notes: 'Khung bị cong, cần sửa chữa.' }]
        })
      )
    );
    expect(await within(card).findByText('Đã lưu vào hồ sơ')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(point).toHaveFocus();
  });

  it('auto-populates CSC plate & IoT sensor checks from telemetry/dossier and calculates composite safety index', async () => {
    const iotContainer = {
      ...container,
      supplyAirTempC: -18.2,
      reeferSetPointTempC: -18.0,
      reeferTemperatureAlarmStatus: 'OK',
      batteryPct: 92,
      shockG: 1.1
    };
    const fullTemplate = [
      ...template,
      { key: 'frame_corner_castings', label: 'Khung & góc đúc', group: 'Kết cấu chung', guidance: 'Kiểm tra va đập.', critical: true },
      { key: 'reefer_setpoint_test', label: 'Kiểm thử nhiệt độ lạnh', group: 'Thiết bị lạnh', guidance: 'Kiểm độ lệch nhiệt.', critical: true },
      { key: 'reefer_alarm_airflow', label: 'Cảnh báo ECU & gió lạnh', group: 'Thiết bị lạnh', guidance: 'Đọc cảnh báo ECU.', critical: true }
    ];
    api.getContainerSafetyInspection.mockResolvedValue({
      result: {
        containerCode: iotContainer.containerCode,
        containerType: iotContainer.containerType,
        templateVersion: '1.0',
        roundNumber: 0,
        template: fullTemplate,
        inspection: record('DRAFT'),
        history: [record('DRAFT')]
      }
    });
    render(<ContainerSafetyInspection container={iotContainer} />);

    fireEvent.click(await screen.findByRole('button', { name: /Đối chiếu tự động Telemetry/i }));
    expect(await screen.findByText(/4\/7 hạng mục/)).toBeInTheDocument();
    const banner = screen.getByLabelText('Chỉ số an toàn tổng hợp tổ hợp xe');
    expect(banner).toHaveTextContent(/%/);
  });

  it('switches numbered cards cleanly and makes historical reports read-only', async () => {
    const draft = record('DRAFT', [], { id: 'new', inspectionNumber: 2 });
    const prior = record('PASSED', template.map(({ key }) => ({ key, status: 'PASS' })), { id: 'old' });
    api.getContainerSafetyInspection.mockResolvedValue(response(draft, [draft, prior]));
    render(<ContainerSafetyInspection container={container} />);

    fireEvent.click(await screen.findByRole('button', { name: /Lần #1 · Đạt/ }));
    fireEvent.click(screen.getByRole('button', { name: '1. Khung container · Đạt' }));
    const card = screen.getByRole('dialog', { name: 'Khung container' });
    expect(within(card).queryByRole('button', { name: 'Lưu kết quả' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Không đạt' })).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole('button', { name: 'Đóng card kiểm tra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Về lần kiểm tra hiện tại' }));
    expect(screen.getByRole('button', { name: 'Lưu tiến độ' })).toBeEnabled();
  });

  it('supports bulk-passing remaining unchecked items and reports failures accurately', async () => {
    api.getContainerSafetyInspection.mockResolvedValue(
      response(record('DRAFT', [{ key: 'frame', status: 'FAIL', notes: 'Móp khung góc' }]))
    );
    render(<ContainerSafetyInspection container={container} />);
    await screen.findByText('1/4 hạng mục');
    fireEvent.click(screen.getByRole('button', { name: 'Đạt các mục còn lại' }));
    expect(screen.getByText('4/4 hạng mục')).toBeInTheDocument();
  });

  it('retries failed load and blocks editing while container is in transit', async () => {
    api.getContainerSafetyInspection.mockRejectedValueOnce(new Error('Mất kết nối'));
    render(<ContainerSafetyInspection container={{ ...container, status: 'IN_TRANSIT' }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    expect(await screen.findByText(/Container đang vận chuyển/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu kiểm tra' })).not.toBeInTheDocument();
  });
});
