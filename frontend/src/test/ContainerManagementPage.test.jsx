import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContainerManagementPage from '../systems/operations/features/containers/ContainerManagementPage';
import {
  buildContainerChecklist,
  formatNumber,
  sealData
} from '../systems/operations/features/containers/containerPresentation';
import { containerOperationalIssues } from '../systems/operations/features/containers/ContainerConnection';

const api = vi.hoisted(() => ({
  getContainers: vi.fn(),
  getContainerDispatchNotes: vi.fn(),
  getCompanies: vi.fn(),
  getVehicles: vi.fn(),
  getDistributionHubs: vi.fn(),
  getContainerManifestItems: vi.fn(),
  getShipmentById: vi.fn(),
  getRouteCandidates: vi.fn(),
  getActiveRouteVersion: vi.fn(),
  getRouteVersions: vi.fn(),
  calculateRoutes: vi.fn(),
  selectRoute: vi.fn(),
  updateContainerCscData: vi.fn(),
  createContainer: vi.fn(),
  createContainerManifestItem: vi.fn(),
  getContainerControl: vi.fn(),
  getShipmentDispatchOrder: vi.fn(),
  getContainerSafetyInspection: vi.fn(),
  submitContainerSafetyInspection: vi.fn(),
  confirmContainerControlStage: vi.fn()
}));
vi.mock('../services/api', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'DISPATCHER', username: 'dispatcher.test' } }) }));
const company = { id: 'company-1', companyCode: 'VNM', companyName: 'Công ty mẫu' };
const first = {
  id: 'one',
  containerCode: 'DEMU0000016',
  containerType: 'DRY_40FT',
  status: 'AVAILABLE',
  responsibleCompanyName: company.companyName,
  responsibleCompanyId: company.id,
  responsibleCompanyCode: company.companyCode,
  vehicleLicensePlate: '99C-900.01'
};
const second = {
  id: 'two',
  containerCode: 'DEMU0000058',
  containerType: 'DRY_40FT',
  status: 'MAINTENANCE',
  responsibleCompanyName: 'Đơn vị bảo trì'
};
const list = () => screen.getByRole('region', { name: 'Danh sách container' });
const createCard = () => screen.getByRole('dialog', { name: 'Tạo hồ sơ container' });
const item = {
  id: 'cargo-1',
  itemCode: 'SKU-01',
  cargoName: 'Sữa mẫu',
  dispatchStatus: 'IN_CONTAINER',
  weightKg: 120,
  parcelCount: 10
};

beforeEach(() => {
  vi.resetAllMocks();
  api.getContainers.mockResolvedValue({ result: [first, second] });
  api.getContainerDispatchNotes.mockResolvedValue({ result: [] });
  api.getCompanies.mockResolvedValue({ result: [company] });
  api.getVehicles.mockResolvedValue({ result: [] });
  api.getDistributionHubs.mockResolvedValue({
    result: [{ id: 'hub', hubCode: 'HUB-01', hubName: 'Cơ sở mẫu' }]
  });
  api.getContainerManifestItems.mockResolvedValue({ result: [item] });
  api.getShipmentById.mockResolvedValue({ result: {} });
  api.getRouteCandidates.mockResolvedValue({ result: [] });
  api.getActiveRouteVersion.mockRejectedValue(new Error('Not found'));
  api.getRouteVersions.mockResolvedValue({ result: [] });
  api.calculateRoutes.mockResolvedValue({ result: [] });
  api.selectRoute.mockResolvedValue({ result: {} });
  api.updateContainerCscData.mockResolvedValue({ result: {} });
  api.createContainer.mockResolvedValue({ result: {} });
  api.createContainerManifestItem.mockResolvedValue({ result: {} });
  api.getShipmentDispatchOrder.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
  api.getContainerControl.mockResolvedValue({ result: { containerCode: first.containerCode, roundNumber: 0, stages: [], history: [] } });
  api.getContainerSafetyInspection.mockResolvedValue({ result: { containerCode: first.containerCode, containerType: first.containerType,
    roundNumber: 0, templateVersion: '1.0', template: [], inspection: null, history: [] } });
});

async function openPage(code = first.containerCode) {
  render(<ContainerManagementPage />);
  await screen.findByRole('button', { name: 'Thông tin chi tiết ' + code });
}

function openDetails(code = first.containerCode) {
  fireEvent.click(screen.getByRole('button', { name: 'Thông tin chi tiết ' + code }));
}

describe('Container workspace', () => {
  it('links to the independent inspection function from the container header', async () => {
    await openPage(); openDetails();
    const detail = screen.getByRole('region', { name: 'Chi tiết container' });
    expect(within(detail).getByRole('link', { name: 'Kiểm tra an toàn container' })).toHaveAttribute('href', '/container-inspections?container=' + first.containerCode);
    fireEvent.click(within(detail).getByRole('tab', { name: 'Kiểm soát theo đợt' }));
    expect(await screen.findByRole('region', { name: 'Kết quả kiểm tra container' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở hồ sơ kiểm tra' })).toHaveAttribute('href', '/container-inspections?container=' + first.containerCode);
    expect(screen.queryByRole('region', { name: 'Kiểm tra an toàn container' })).not.toBeInTheDocument();
  });

  it('opens the linked container directly from a map detail link', async () => {
    window.history.pushState({}, '', '/containers?container=' + first.containerCode);
    render(<ContainerManagementPage />);
    expect(await screen.findByRole('heading', { name: first.containerCode })).toBeInTheDocument();
    expect(window.location.search).toContain(first.containerCode);
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    await waitFor(() => expect(window.location.search).not.toContain('container='));
    window.history.pushState({}, '', '/containers');
  });
  it('combines advanced filters and resets them together with the general keyword', async () => {
    await openPage();
    fireEvent.click(screen.getByText('Tìm kiếm nâng cao'));
    fireEvent.change(screen.getByLabelText('Đơn vị phụ trách (tên / mã)'), { target: { value: 'cong ty mau' } });
    expect(within(list()).getByRole('button', { name: /DEMU0000016/ })).toBeInTheDocument();
    expect(within(list()).queryByRole('button', { name: /DEMU0000058/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Biển số xe'), { target: { value: '99c90001' } });
    expect(within(list()).getByRole('button', { name: /DEMU0000016/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(screen.getByLabelText('Biển số xe')).toHaveValue('');
    expect(screen.getByLabelText('Đơn vị phụ trách (tên / mã)')).toHaveValue('');
    expect(within(list()).getByRole('button', { name: /DEMU0000058/ })).toBeInTheDocument();
  });

  it('opens creation in a modal and closes without submitting when cancelled', async () => {
    await openPage();
    const trigger = screen.getByRole('button', { name: /Tạo container/ });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = createCard();
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.change(within(dialog).getByLabelText('Mã container *'), { target: { value: 'DRAFT' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog', { name: 'Tạo hồ sơ container' })).not.toBeInTheDocument();
    expect(api.createContainer).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });
  it('opens the cargo form inside the detail dialog while preserving the selected container', async () => {
    await openPage();
    openDetails();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Bổ sung hàng hóa/ }));
    expect(within(dialog).getByRole('region', { name: 'Thêm hàng hóa · ' + first.containerCode })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: first.containerCode })).toBeInTheDocument();
  });


  it('filters by keyword and status, keeping the detail tied to the visible container', async () => {
    await openPage();
    fireEvent.change(screen.getByLabelText('Tìm container'), { target: { value: '99C-900.01' } });
    expect(within(list()).getByRole('button', { name: /DEMU0000016/ })).toBeInTheDocument();
    expect(within(list()).queryByRole('button', { name: /DEMU0000058/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    fireEvent.change(screen.getByLabelText('Lọc trạng thái container'), {
      target: { value: 'MAINTENANCE' }
    });
    expect(screen.queryByRole('region', { name: 'Chi tiết container' })).not.toBeInTheDocument();
    expect(api.getContainerManifestItems).not.toHaveBeenCalled();
    openDetails(second.containerCode);
    expect(screen.getByRole('heading', { name: second.containerCode })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    expect(screen.getByLabelText('Lọc trạng thái container')).toHaveValue('MAINTENANCE');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(within(list()).getByRole('button', { name: /DEMU0000016/ })).toBeInTheDocument();
    expect(within(list()).getByRole('button', { name: /DEMU0000058/ })).toBeInTheDocument();
  });

  it('shows dispatch context, operational exceptions and filters attention cases', async () => {
    const transit = {
      ...first,
      containerCode: 'DEMU0000099',
      containerType: 'REEFER_40FT',
      status: 'IN_TRANSIT',
      vehicleLicensePlate: '51D-123.45',
      assignedVehicleId: 'vehicle-99',
      driverName: 'Nguyễn Văn An',
      assignedDriverId: 'driver-99',
      responsibleCompanyName: 'Công ty mẫu',
      assignedShipmentCode: 'SHP-2601',
      assignedShipmentId: 'shipment-99',
      originName: 'Kho Bình Dương',
      destinationName: 'Cơ sở Đình Bảng',
      lastLocationName: 'Quốc lộ 1A, Hà Nội',
      lastProgressAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      lastEtaAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      lastPositionReceivedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      lastTelemetryReceivedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      progressPct: 62,
      etaMinutes: 48,
      isReefer: true,
      supplyAirTempC: null,
      returnAirTempC: null,
      eSealStatus: 'BROKEN'
    };
    api.getContainers.mockResolvedValue({ result: [first, second, transit] });
    await openPage();

    const row = screen.getByRole('row', { name: /DEMU0000099/ });
    expect(within(row).getByText('51D-123.45')).toBeInTheDocument();
    expect(within(row).getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(within(row).getByText('SHP-2601')).toBeInTheDocument();
    expect(within(row).getByText(/Tiến độ 62% ·/)).toBeInTheDocument();
    expect(within(row).getByText(/ETA 48 phút ·/)).toBeInTheDocument();
    expect(within(row).getAllByText('Chậm tín hiệu').length).toBeGreaterThan(0);
    const summary = within(row).getByLabelText(/điểm cần chú ý.*1 ưu tiên/);
    const disclosure = summary.closest('details');
    expect(summary).toHaveTextContent('Niêm phong bất thường');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute('open');
    expect(within(disclosure).getByText('Thiếu dữ liệu nhiệt')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cần chú ý/ }));
    expect(within(list()).getByRole('row', { name: /DEMU0000099/ })).toBeInTheDocument();
    expect(within(list()).queryByRole('row', { name: /DEMU0000016/ })).not.toBeInTheDocument();
    expect(within(list()).queryByRole('row', { name: /DEMU0000058/ })).not.toBeInTheDocument();
  });

  it('shows shipment commitments, manifest load and flags ETA after the delivery deadline', async () => {
    const transit = {
      ...first,
      containerCode: 'DEMU0000100',
      status: 'IN_TRANSIT',
      maxPayloadTons: 1,
      assignedVehicleId: 'vehicle-100',
      assignedDriverId: 'driver-100',
      assignedShipmentId: 'shipment-100',
      assignedShipmentCode: 'SHP-2602',
      vehicleLicensePlate: '51D-100.00',
      driverName: 'Trần Văn Bình',
      originName: 'Kho Bình Dương',
      destinationName: 'Cơ sở Đình Bảng',
      etaMinutes: 48,
      lastEtaAt: new Date().toISOString(),
      lastPositionReceivedAt: new Date().toISOString(),
      lastTelemetryReceivedAt: new Date().toISOString()
    };
    api.getContainers.mockResolvedValue({ result: [transit] });
    api.getShipmentById.mockResolvedValue({
      result: {
        id: transit.assignedShipmentId,
        shipmentCode: transit.assignedShipmentCode,
        customerId: 'VINAMILK',
        status: 'IN_TRANSIT',
        cargoWeightTons: 1.2,
        cargoVolumeM3: 8,
        isHazardous: true,
        originAddress: 'KCN Sóng Thần, Bình Dương',
        destinationAddress: 'Đình Bảng, Bắc Ninh',
        pickupTimePlanned: new Date().toISOString(),
        deliveryDeadline: new Date(Date.now() + 20 * 60000).toISOString()
      }
    });
    api.getContainerManifestItems.mockResolvedValue({
      result: [{ ...item, shipmentCode: transit.assignedShipmentCode, weightKg: 1200,
        parcelCount: 10, requiresColdChain: true, requiredTempC: -18.4 }]
    });

    await openPage(transit.containerCode);
    openDetails(transit.containerCode);

    expect(await screen.findByText('VINAMILK')).toBeInTheDocument();
    expect(screen.getByText(/1\.200 kg \/ 1\.000 kg/)).toBeInTheDocument();
    expect(screen.getByText('Có · cần đối chiếu khai báo và hướng dẫn xử lý')).toBeInTheDocument();
    expect(screen.getByText(/ETA hiện tại trễ khoảng \d+ phút/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('vượt tải trọng cho phép');
  });

  it('updates CSC examination information on existing container records', async () => {
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin CSC' }));
    fireEvent.change(screen.getByLabelText('Quốc gia / cơ quan phê duyệt'), {
      target: { value: 'Vietnam' }
    });
    fireEvent.change(screen.getByLabelText('Mã tham chiếu phê duyệt'), {
      target: { value: 'CSC-REF-2026' }
    });
    fireEvent.change(screen.getByLabelText('Chương trình kiểm tra'), {
      target: { value: 'PERIODIC' }
    });
    fireEvent.change(screen.getByLabelText('Ngày kiểm tra kế tiếp'), {
      target: { value: '2028-06-30' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu CSC' }));

    await waitFor(() => expect(api.updateContainerCscData).toHaveBeenCalledWith(
      first.containerCode,
      expect.objectContaining({
        cscApprovalCountry: 'Vietnam',
        cscApprovalReference: 'CSC-REF-2026',
        cscInspectionScheme: 'PERIODIC',
        cscNextExaminationDate: '2028-06-30',
        cscAcepProgramNumber: null
      })
    ));
  });

  it('opens the CSC form directly from the checklist and focuses its first field', async () => {
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('tab', { name: 'Checklist hồ sơ' }));
    const checklistItem = screen.getByText('Biển an toàn CSC').closest('li');
    fireEvent.click(within(checklistItem).getByRole('button', { name: /Bổ sung/ }));
    const field = await screen.findByLabelText('Quốc gia / cơ quan phê duyệt');
    await waitFor(() => expect(field).toHaveFocus());
    expect(screen.getByRole('tab', { name: 'Thông tin' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật CSC/ }));
    await waitFor(() => expect(screen.getByLabelText('Quốc gia / cơ quan phê duyệt')).toHaveFocus());
  });

  it('calculates real-provider routes, lets dispatcher compare them, and records the selected version', async () => {
    const assigned = {
      ...first,
      status: 'ASSIGNED',
      assignedShipmentId: 'shipment-route-1',
      assignedShipmentCode: 'SHP-ROUTE-1',
      originName: 'Kho đi',
      destinationName: 'Kho nhận'
    };
    const candidate = {
      id: 'candidate-route-1',
      shipmentId: assigned.assignedShipmentId,
      candidateName: 'OSRM Primary Route',
      providerName: 'OSRM',
      distanceMeters: 28500,
      durationSeconds: 2700,
      estimatedFuelLiters: 9.12,
      estimatedCo2Kg: 23.95,
      compositeScore: 0.2,
      isSelected: false,
      createdAt: new Date().toISOString()
    };
    api.getContainers.mockResolvedValue({ result: [assigned] });
    api.getShipmentById.mockResolvedValue({
      result: {
        id: assigned.assignedShipmentId,
        shipmentCode: assigned.assignedShipmentCode,
        originName: 'Kho Bình Dương',
        originAddress: 'Đường số 1, Bình Dương',
        originLatitude: 10.8,
        originLongitude: 106.7,
        destinationName: 'Kho Bắc Ninh',
        destinationAddress: 'Khu công nghiệp A, Bắc Ninh',
        destinationLatitude: 21.1,
        destinationLongitude: 106.0,
        cargoWeightTons: 12
      }
    });
    api.getRouteCandidates.mockResolvedValue({ result: [candidate] });

    await openPage(assigned.containerCode);
    openDetails(assigned.containerCode);
    fireEvent.click(screen.getByRole('tab', { name: 'Lộ trình' }));

    expect(await screen.findByText('OSRM Primary Route')).toBeInTheDocument();
    expect(screen.getByText(/chưa xét kích thước\/tải trọng xe tải/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối & tính phương án' }));
    await waitFor(() => expect(api.calculateRoutes).toHaveBeenCalledWith(assigned.assignedShipmentId));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn phương án này' }));
    fireEvent.change(screen.getByLabelText('Ghi chú quyết định của dispatcher (không bắt buộc)'), {
      target: { value: 'Đã đối chiếu điểm lấy và giao hàng.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận chốt tuyến' }));

    await waitFor(() => expect(api.selectRoute).toHaveBeenCalledWith({
      shipmentId: assigned.assignedShipmentId,
      selectedCandidateId: candidate.id,
      decisionType: 'DISPATCHER_SELECTED',
      dispatcherNotes: 'Đã đối chiếu điểm lấy và giao hàng.',
      decidedBy: 'dispatcher.test'
    }));
  });

  it('does not let a dispatcher promote a simulated route to the official route', async () => {
    const assigned = {
      ...first,
      status: 'ASSIGNED',
      assignedShipmentId: 'shipment-route-demo',
      assignedShipmentCode: 'SHP-ROUTE-DEMO'
    };
    api.getContainers.mockResolvedValue({ result: [assigned] });
    api.getShipmentById.mockResolvedValue({
      result: {
        id: assigned.assignedShipmentId,
        originLatitude: 10.8,
        originLongitude: 106.7,
        destinationLatitude: 21.1,
        destinationLongitude: 106,
        cargoWeightTons: 12
      }
    });
    api.getRouteCandidates.mockResolvedValue({
      result: [{ id: 'candidate-mock', shipmentId: assigned.assignedShipmentId, providerName: 'MOCK', candidateName: 'Demo route' }]
    });

    await openPage(assigned.containerCode);
    openDetails(assigned.containerCode);
    fireEvent.click(screen.getByRole('tab', { name: 'Lộ trình' }));

    expect(await screen.findByRole('button', { name: 'Không thể chốt mô phỏng' })).toBeDisabled();
    expect(screen.getByText(/Kết quả mô phỏng để thử giao diện/)).toBeInTheDocument();
    expect(api.selectRoute).not.toHaveBeenCalled();
  });

  it('does not discard containers when an optional catalogue request is forbidden', async () => {
    api.getDistributionHubs.mockRejectedValue(new Error('Forbidden'));
    await openPage();
    expect(screen.getByText(/Chưa tải được danh mục cơ sở nhận/)).toBeInTheDocument();
    expect(within(list()).getByRole('button', { name: /DEMU0000016/ })).toBeInTheDocument();
  });

  it('shows a retryable load error instead of reporting an empty fleet', async () => {
    api.getContainers.mockRejectedValueOnce(new Error('Forbidden'));
    render(<ContainerManagementPage />);
    await screen.findByRole('heading', { name: 'Chưa tải được dữ liệu' });
    expect(screen.queryByText('Chưa có container')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));
    await screen.findByRole('button', { name: 'Thông tin chi tiết ' + first.containerCode });
  });

  it('renders creation as an independent labelled card and sends numeric values and company identity', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /Tạo container/ }));
    const card = within(createCard());
    expect(card.getByText('01 · Định danh & đơn vị')).toBeInTheDocument();
    const values = [
      ['Mã container *', 'demu9999991'],
      ['Công ty phụ trách *', company.id],
      ['Trọng lượng vỏ (tấn) *', '3.8'],
      ['Tải trọng hàng tối đa (tấn) *', '26'],
      ['Số niêm phong điện tử', 'SEAL-01'],
      ['Quốc gia / cơ quan phê duyệt', 'Vietnam'],
      ['Mã tham chiếu phê duyệt CSC', 'CSC-VN-001'],
      ['Tháng / ngày sản xuất', '2024-01-15'],
      ['Chương trình kiểm tra', 'PERIODIC'],
      ['Ngày kiểm tra kế tiếp', '2028-01-15']
    ];
    values.forEach(([label, value]) =>
      fireEvent.change(card.getByLabelText(label), { target: { value } })
    );
    fireEvent.submit(card.getByRole('button', { name: 'Tạo hồ sơ' }).closest('form'));
    await waitFor(() =>
      expect(api.createContainer).toHaveBeenCalledWith(
        expect.objectContaining({
          containerCode: 'DEMU9999991',
          tareWeightTons: 3.8,
          maxPayloadTons: 26,
          cubicCapacityM3: null,
          responsibleCompanyCode: 'VNM',
          esealNumber: 'SEAL-01',
          cscApprovalCountry: 'Vietnam',
          cscApprovalReference: 'CSC-VN-001',
          cscManufactureDate: '2024-01-15',
          cscInspectionScheme: 'PERIODIC',
          cscNextExaminationDate: '2028-01-15',
          cscAcepProgramNumber: null
        })
      )
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Tạo hồ sơ container' })).not.toBeInTheDocument()
    );
  });

  it('keeps form data and shows the error in the card when saving fails', async () => {
    api.createContainer.mockRejectedValue(new Error('Mã container đã tồn tại'));
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /Tạo container/ }));
    const card = within(createCard());
    fireEvent.change(card.getByLabelText('Công ty phụ trách *'), { target: { value: company.id } });
    fireEvent.submit(card.getByRole('button', { name: 'Tạo hồ sơ' }).closest('form'));
    expect(await card.findByRole('alert')).toHaveTextContent('Mã container đã tồn tại');
    expect(card.getByLabelText('Công ty phụ trách *')).toHaveValue(company.id);
  });

  it('shows manifest details and opens a separate item card with cold-chain temperature', async () => {
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('tab', { name: /Hàng hóa/ }));
    expect(await screen.findByText('Sữa mẫu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Thêm mặt hàng/ }));
    const card = within(
      screen.getByRole('region', { name: 'Thêm hàng hóa · ' + first.containerCode })
    );
    expect(card.getByLabelText('Cơ sở tiếp nhận *')).toBeInTheDocument();
    fireEvent.click(card.getByLabelText('Hàng yêu cầu chuỗi lạnh'));
    expect(card.getByLabelText('Nhiệt độ yêu cầu (°C) *')).toBeRequired();
    fireEvent.click(card.getByLabelText('Hàng yêu cầu chuỗi lạnh'));
    expect(card.queryByLabelText('Nhiệt độ yêu cầu (°C) *')).not.toBeInTheDocument();
  });

  it('does not allow adding cargo to a container already in transit', async () => {
    api.getContainers.mockResolvedValue({ result: [{ ...first, status: 'IN_TRANSIT' }] });
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('tab', { name: /Hàng hóa/ }));
    expect(screen.getByRole('button', { name: /Thêm mặt hàng/ })).toBeDisabled();
  });

  it('does not let a late manifest response replace the selected container data', async () => {
    let resolveFirst;
    api.getContainerManifestItems.mockImplementation(({ containerCode }) =>
      containerCode === first.containerCode
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve({ result: [{ ...item, cargoName: 'Hàng của container hai' }] })
    );
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách' }));
    openDetails(second.containerCode);
    fireEvent.click(screen.getByRole('tab', { name: /Hàng hóa/ }));
    await screen.findByText('Hàng của container hai');
    await act(async () => resolveFirst({ result: [item] }));
    expect(screen.queryByText('Sữa mẫu')).not.toBeInTheDocument();
    expect(screen.getByText('Hàng của container hai')).toBeInTheDocument();
  });

  it('marks unavailable manifest checks as unknown and offers a retry', async () => {
    api.getContainerManifestItems.mockRejectedValueOnce(new Error('Manifest unavailable'));
    await openPage();
    openDetails();
    fireEvent.click(screen.getByRole('tab', { name: 'Checklist hồ sơ' }));
    await waitFor(() => expect(screen.getAllByText('Chưa xác định').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('tab', { name: /Hàng hóa/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Manifest unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại manifest' }));
    await screen.findByText('Sữa mẫu');
  });
});

describe('Container presentation checks', () => {
  it('flags only actionable issues supported by the current container data', () => {
    const activeTrip = {
      status: 'IN_TRANSIT',
      vehicleLicensePlate: '51D-123.45',
      assignedVehicleId: 'vehicle-1',
      driverName: 'Nguyễn Văn An',
      assignedDriverId: 'driver-1',
      responsibleCompanyName: 'Công ty mẫu',
      assignedShipmentCode: 'SHP-2601',
      assignedShipmentId: 'shipment-1',
      originName: 'Kho Bình Dương',
      destinationName: 'Cơ sở Đình Bảng',
      cscApprovalCountry: 'Vietnam',
      cscApprovalReference: 'CSC-VN-001',
      cscInspectionScheme: 'PERIODIC',
      cscNextExaminationDate: '2027-01-01',
      isReefer: true,
      supplyAirTempC: 3,
      returnAirTempC: 4,
      reeferSetPointTempC: 3,
      reeferTemperatureAlarmStatus: 'NORMAL',
      lastSupplyAirTempAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastReturnAirTempAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastReeferSetPointAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastReeferAlarmAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastEtaAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastTelemetryReceivedAt: new Date(Date.now() - 60 * 1000).toISOString(),
      lastPositionReceivedAt: new Date(Date.now() - 60 * 1000).toISOString()
    };
    expect(containerOperationalIssues(activeTrip)).toEqual([]);
    expect(containerOperationalIssues({ status: 'AVAILABLE' })).toEqual([]);
    expect(containerOperationalIssues({
      ...activeTrip,
      status: 'AVAILABLE',
      cscNextExaminationDate: '2020-01-01'
    }).map((issue) => issue.label)).toContain('CSC đã quá hạn kiểm tra');
    expect(containerOperationalIssues({
      ...activeTrip,
      driverName: null,
      lastEtaAt: null,
      lastTelemetryReceivedAt: null,
      lastPositionReceivedAt: null,
      reeferSetPointTempC: null,
      reeferTemperatureAlarmStatus: 'HIGH_TEMP',
      lastReeferAlarmAt: null,
      returnAirTempC: null,
      eSealStatus: 'TAMPERED'
    }).map((issue) => issue.label)).toEqual([
      'Chưa có tài xế',
      'Chưa có tín hiệu thiết bị',
      'Chưa có GPS',
      'Chưa có ETA cập nhật',
      'Thiếu dữ liệu nhiệt',
      'Chưa có nhiệt độ cài đặt reefer',
      'Cảnh báo nhiệt chưa có mốc mới',
      'Niêm phong bất thường'
    ]);
  });

  it('handles the Jackson eseal spelling and does not lose valid zero telemetry', () => {
    expect(
      sealData({ esealNumber: 'S01', esealStatus: 'LOCKED_SECURE', esealIntegrityPct: 100 })
    ).toEqual({ number: 'S01', status: 'LOCKED_SECURE', integrity: 100 });
    expect(formatNumber(0, ' km/h')).toBe('0 km/h');
    expect(formatNumber(null)).toBe('Chưa có dữ liệu');
  });

  it('detects overweight, missing cold-chain targets and incomplete delivery evidence', () => {
    const checks = buildContainerChecklist(
      {
        ...first,
        maxPayloadTons: 1,
        status: 'DELIVERED',
        isReefer: true,
        supplyAirTempC: 4,
        returnAirTempC: 4
      },
      [{ ...item, weightKg: 1200, requiresColdChain: true }],
      'ready'
    );
    ['Giới hạn tải trọng', 'Chuỗi lạnh', 'Bằng chứng bàn giao'].forEach((label) =>
      expect(checks.find((check) => check.label === label).state).toBe('missing')
    );
  });
});
