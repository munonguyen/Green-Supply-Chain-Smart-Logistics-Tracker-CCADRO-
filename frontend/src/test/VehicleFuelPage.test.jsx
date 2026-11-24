import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import VehicleFuelPage from '../systems/operations/features/fuels/VehicleFuelPage';
const api = vi.hoisted(() => ({
  getVehicleFuelCatalog: vi.fn(),
  saveVehicleFuelProfile: vi.fn(),
  assessVehicleFuel: vi.fn(),
  getFuelStations: vi.fn(),
  authorizeFuelPump: vi.fn(),
  ingestFuelTransactions: vi.fn(),
  getFuelTransactions: vi.fn(),
  getContainerFuelUnits: vi.fn(),
  batchOptimizeVehicleFuels: vi.fn()
}));
vi.mock('../services/api', () => ({ api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'DISPATCHER' } }) }));
const fuels = [
  { code: 'DIESEL_DO_0001S', name: 'Diesel DO 0,001S-V', family: 'DIESEL', qualityLevel: 5, sulfurPpm: 10, ethanolPct: 0, priceRegion1: 28140, priceRegion2: 28700, physicalCo2KgPerLiter: 2.69719665, fossilCo2KgPerLiter: 2.69719665, biogenicCo2KgPerLiter: 0, availabilityNote: 'Xác nhận trạm trên tuyến.' },
  { code: 'DIESEL_DO_005S', name: 'Diesel DO 0,05S-II', family: 'DIESEL', qualityLevel: 2, sulfurPpm: 500, ethanolPct: 0, priceRegion1: 26340, priceRegion2: 26860, physicalCo2KgPerLiter: 2.69719665, fossilCo2KgPerLiter: 2.69719665, biogenicCo2KgPerLiter: 0, availabilityNote: 'Không cho động cơ Euro 5.' },
  { code: 'E10_RON95_III', name: 'Xăng E10 RON95-III', family: 'GASOLINE', qualityLevel: 3, ron: 95, ethanolPct: 10, priceRegion1: 19100, priceRegion2: 19480, physicalCo2KgPerLiter: 2.23, fossilCo2KgPerLiter: 2.08, biogenicCo2KgPerLiter: .15 }
];
const profile = { selectedFuelCode: 'DIESEL_DO_0001S', consumptionPer100Km: 30, annualKm: 40000, minQualityLevel: 5, maxSulfurPpm: 10, compatibilityEvidence: 'Manual truck Euro5 page 20', consumptionEvidence: 'Fuel log loaded 20 tons', revision: 2, updatedBy: 'dispatcher', updatedAt: '2026-11-21T10:00:00Z' };
const vehicle = { id: 'diesel', vehicleCode: 'VEH-01', plateNumber: '51C-12345', fuelType: 'DIESEL', euroStandard: 'EURO_5', profile };
const catalog = () => ({ result: { version: 'VN-test', priceEffectiveAt: '2026-11-19T08:00:00Z', priceSource: 'https://petrolimex.com.vn/price', factorSource: 'https://www.epa.gov/factors', compatibilitySource: 'https://petrolimex.com.vn/diesel', marketSource: 'https://moit.gov.vn/e10', energySource: 'https://eia.gov/ethanol', fuels, vehicles: [vehicle], configuredVehicles: 1, coveredVehicles: 1, annualPhysicalCo2Kg: 32366.36, annualFossilCo2Kg: 32366.36, annualBiogenicCo2Kg: 0, assumptions: ['Không gồm WTW.'] } });
const renderPage = (id = 'diesel') => render(<MemoryRouter initialEntries={['/vehicle-fuels?vehicle=' + id]}><VehicleFuelPage /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  api.getVehicleFuelCatalog.mockResolvedValue(catalog());
  api.saveVehicleFuelProfile.mockResolvedValue({ result: { ...profile, revision: 3 } });
  api.getFuelStations.mockResolvedValue({
    result: [
      {
        stationCode: 'DEPOT-CATLAI-01',
        name: 'Trạm Bồn Depot Cát Lái',
        stationType: 'INTERNAL_DEPOT',
        priceRegion: 1,
        corridorTag: 'CAT_LAI_DONG_NAI',
        active: true,
        nozzles: [
          {
            nozzleCode: 'NZ-DO5-01',
            fuelCode: 'DIESEL_DO_0001S',
            fuelName: 'Diesel DO 0,001S-V',
            tankCapacityLiters: 40000,
            currentStockLiters: 31450,
            stockPct: 78.6,
            unitPriceVnd: 27900,
            active: true
          }
        ]
      }
    ]
  });
  api.getFuelTransactions.mockResolvedValue({ result: [] });
  api.getContainerFuelUnits.mockResolvedValue({
    result: [
      {
        containerId: 'c-reefer-1',
        containerCode: 'CCLU-619284-5',
        containerType: 'REEFER_40FT',
        gensetCode: 'GS-CCLU-619284-5',
        preferredFuelCode: 'DIESEL_DO_0001S',
        preferredFuelName: 'Diesel DO 0,001S-V',
        tankCapacityLiters: 240,
        currentFuelPct: 18,
        ratedLitersPerHour: 3.4,
        minQualityLevel: 5,
        maxSulfurPpm: 10,
        lowFuelAlert: true
      }
    ]
  });
});
it('shows source dates, bounded fleet coverage and family-specific vehicle fuel choices', async () => {
  renderPage();
  expect(await screen.findByRole('heading', { name: '51C-12345' })).toBeInTheDocument();
  const form = screen.getByRole('form', { name: 'Khai báo nhiên liệu cho xe' });
  expect(within(form).getByRole('option', { name: 'Diesel DO 0,001S-V' })).toBeInTheDocument();
  expect(within(form).queryByRole('option', { name: 'Xăng E10 RON95-III' })).not.toBeInTheDocument();
  expect(screen.getByText(/Chỉ 1\/1 xe có đủ định mức/)).toBeInTheDocument();
  expect(screen.getByText(/Giá tham chiếu:.*19\/11\/2026/)).toBeInTheDocument();
});
it('persists the retail fuel profile independently of engine family and sends its revision', async () => {
  renderPage();
  const form = await screen.findByRole('form', { name: 'Khai báo nhiên liệu cho xe' });
  fireEvent.change(within(form).getByLabelText(/Định mức đo/), { target: { value: '31.5' } });
  expect(screen.getByRole('button', { name: 'Tính & đề xuất' })).toBeDisabled();
  fireEvent.submit(form);
  await waitFor(() => expect(api.saveVehicleFuelProfile).toHaveBeenCalledWith('diesel', {
    selectedFuelCode: 'DIESEL_DO_0001S', consumptionPer100Km: 31.5, annualKm: 40000, minRon: null, maxEthanolPct: null, maxSulfurPpm: 10, minQualityLevel: 5,
    compatibilityEvidence: 'Manual truck Euro5 page 20', consumptionEvidence: 'Fuel log loaded 20 tons', expectedRevision: 2
  }));
});
it('requires explicit supply choices and invalidates results when the scenario changes', async () => {
  const candidate = { fuelCode: 'DIESEL_DO_0001S', name: 'Diesel DO 0,001S-V', compatible: true, available: true, eligible: true, reasons: [], consumptionPer100Km: 30, consumptionBasis: 'VEHICLE_PROFILE', liters: 30, unitPriceVnd: 28140, priceBasis: 'PETROLIMEX_2026_11_19_REGION_1', costVnd: 844200, physicalCo2Kg: 80.92, fossilCo2Kg: 80.92, biogenicCo2Kg: 0, score: 0, pareto: true, costDeltaVnd: 0, physicalCo2DeltaKg: 0 };
  api.assessVehicleFuel.mockResolvedValue({ result: { selectedFuelCode: candidate.fuelCode, recommendedFuelCode: candidate.fuelCode, carbonMetric: 'PHYSICAL_CO2', carbonWeightPct: 50, explanation: 'Lọc tương thích trước khi xếp hạng.', candidates: [candidate] } });
  renderPage(); const form = await screen.findByRole('form', { name: 'Kịch bản đề xuất nhiên liệu' });
  const boxes = within(form).getAllByRole('checkbox'); expect(boxes.every(b => !b.checked)).toBe(true);
  fireEvent.click(boxes[0]); fireEvent.submit(form);
  expect(await screen.findByRole('region', { name: 'Kết quả so sánh nhiên liệu' })).toBeInTheDocument();
  expect(api.assessVehicleFuel).toHaveBeenCalledWith('diesel', expect.objectContaining({ availableFuelCodes: ['DIESEL_DO_0001S'], distanceKm: 100, carbonMetric: 'PHYSICAL_CO2', carbonWeightPct: 50 }));
  expect(screen.getAllByText('80,92 kg').length).toBeGreaterThan(0);
  fireEvent.change(within(form).getByLabelText(/Quãng đường/), { target: { value: '200' } });
  expect(screen.queryByRole('region', { name: 'Kết quả so sánh nhiên liệu' })).not.toBeInTheDocument();
});
it('does not claim zero-emission fuel selection for electric vehicles', async () => {
  const data = catalog(); data.result.vehicles = [{ ...vehicle, fuelType: 'ELECTRIC', profile: null }]; data.result.configuredVehicles = 0; data.result.coveredVehicles = 0;
  api.getVehicleFuelCatalog.mockResolvedValue(data);renderPage();
  expect(await screen.findByText('Cần phương án riêng cho hệ động lực ELECTRIC')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Lưu hồ sơ xe' })).not.toBeInTheDocument();
});
it('shows backend compatibility rejection and keeps entered evidence for correction', async () => {
  api.saveVehicleFuelProfile.mockRejectedValue(new Error('Vượt ngưỡng lưu huỳnh 10 ppm của xe.'));
  renderPage(); const form = await screen.findByRole('form', { name: 'Khai báo nhiên liệu cho xe' });
  fireEvent.change(within(form).getByLabelText(/Loại nhiên liệu đang dùng/), { target: { value: 'DIESEL_DO_005S' } });
  fireEvent.submit(form);
  expect(await screen.findByRole('alert')).toHaveTextContent('Vượt ngưỡng lưu huỳnh');
  expect(within(form).getByLabelText(/Nguồn xác nhận tương thích/)).toHaveValue('Manual truck Euro5 page 20');
});
it('renders per-vehicle annual CO2 fleet overview by default and opens vehicle workspace on selection', async () => {
  render(<MemoryRouter initialEntries={['/vehicle-fuels']}><VehicleFuelPage /></MemoryRouter>);
  const overview = await screen.findByRole('region', { name: 'Tổng quan CO₂ và nhiên liệu toàn đội xe' });
  expect(within(overview).getByText('51C-12345')).toBeInTheDocument();
  expect(within(overview).getByText(/12\.000 lít/)).toBeInTheDocument();
  fireEvent.click(within(overview).getByRole('button', { name: /Đánh giá/i }));
  expect(await screen.findByRole('heading', { name: '51C-12345' })).toBeInTheDocument();
});
it('selects all compatible fuels cleanly and lets user prefill recommended fuel into profile form', async () => {
  const baseline = { fuelCode: 'DIESEL_DO_005S', name: 'Diesel DO 0,05S-II', compatible: true, available: true, eligible: true, reasons: [], consumptionPer100Km: 30, consumptionBasis: 'VEHICLE_PROFILE', liters: 30, unitPriceVnd: 26340, priceBasis: 'PETROLIMEX_2026_11_19_REGION_1', costVnd: 790200, physicalCo2Kg: 80.92, fossilCo2Kg: 80.92, biogenicCo2Kg: 0, score: 0.5, pareto: true, costDeltaVnd: 0, physicalCo2DeltaKg: 0 };
  const recommended = { fuelCode: 'DIESEL_DO_0001S', name: 'Diesel DO 0,001S-V', compatible: true, available: true, eligible: true, reasons: [], consumptionPer100Km: 29, consumptionBasis: 'ENERGY_INDEX', liters: 29, unitPriceVnd: 28140, priceBasis: 'PETROLIMEX_2026_11_19_REGION_1', costVnd: 816060, physicalCo2Kg: 78.22, fossilCo2Kg: 78.22, biogenicCo2Kg: 0, score: 0.12, pareto: true, costDeltaVnd: 25860, physicalCo2DeltaKg: -2.7 };
  const data = catalog();
  data.result.vehicles = [{ ...vehicle, profile: { ...profile, selectedFuelCode: 'DIESEL_DO_005S' } }];
  api.getVehicleFuelCatalog.mockResolvedValue(data);
  api.assessVehicleFuel.mockResolvedValue({ result: { selectedFuelCode: 'DIESEL_DO_005S', recommendedFuelCode: 'DIESEL_DO_0001S', carbonMetric: 'PHYSICAL_CO2', carbonWeightPct: 70, explanation: 'Ưu tiên giảm phát thải 70%.', candidates: [recommended, baseline] } });
  renderPage();
  const scenarioForm = await screen.findByRole('form', { name: 'Kịch bản đề xuất nhiên liệu' });
  fireEvent.click(within(scenarioForm).getByRole('button', { name: 'Chọn tất cả tương thích' }));
  expect(within(scenarioForm).getAllByRole('checkbox').every(b => b.checked)).toBe(true);
  fireEvent.submit(scenarioForm);
  const results = await screen.findByRole('region', { name: 'Kết quả so sánh nhiên liệu' });
  expect(within(results).getByRole('region', { name: 'Mô hình bài toán tối ưu chọn nhiên liệu' })).toBeInTheDocument();
  fireEvent.click(within(results).getByRole('button', { name: 'Áp dụng đề xuất vào hồ sơ' }));
  const profileForm = screen.getByRole('form', { name: 'Khai báo nhiên liệu cho xe' });
  expect(within(profileForm).getByLabelText(/Loại nhiên liệu đang dùng/)).toHaveValue('DIESEL_DO_0001S');
});
it('runs batch Pareto optimization across trucks and reefer container gensets and checks Pre-Pump Gate', async () => {
  api.batchOptimizeVehicleFuels.mockResolvedValue({
    result: {
      totalAssetsEvaluated: 2,
      optimizedAssetsCount: 2,
      switchSuggestedCount: 1,
      projectedCostDeltaVnd: -72000,
      projectedCo2DeltaKg: -12.4,
      stationCodesUsed: ['DEPOT-CATLAI-01'],
      rows: [
        {
          assetKind: 'CONTAINER_GENSET',
          assetCode: 'CCLU-619284-5',
          assetLabel: 'GS-CCLU-619284-5 (REEFER_40FT)',
          powertrainSpec: 'GENSET · ≤10 ppm',
          currentFuelCode: 'DIESEL_DO_0001S',
          recommendedFuelCode: 'DIESEL_DO_0001S',
          recommendedFuelName: 'Diesel DO 0,001S-V',
          recommendedStationCode: 'DEPOT-CATLAI-01',
          recommendedStationName: 'Trạm Bồn Depot Cát Lái',
          expectedCostVnd: 1138320,
          costDeltaVnd: 0,
          expectedCo2Kg: 110.05,
          co2DeltaKg: 0,
          paretoOptimal: true,
          statusNote: 'Cảnh báo bình dầu < 25% · ưu tiên tiếp nhiên liệu'
        }
      ]
    }
  });
  api.authorizeFuelPump.mockResolvedValue({
    result: {
      allowed: false,
      decisionStatus: 'BLOCKED',
      stationCode: 'DEPOT-CATLAI-01',
      nozzleCode: 'NZ-DO2-02',
      fuelName: 'Diesel DO 0,05S-II',
      assetLabel: '51C-12345',
      maxAuthorizedLiters: 0,
      unitPriceVnd: 0,
      reasons: ['Vượt ngưỡng lưu huỳnh 10 ppm của xe.']
    }
  });

  render(<MemoryRouter initialEntries={['/vehicle-fuels']}><VehicleFuelPage /></MemoryRouter>);
  const overview = await screen.findByRole('region', { name: 'Tổng quan CO₂ và nhiên liệu toàn đội xe' });
  expect(within(overview).getByText('Cần tiếp dầu')).toBeInTheDocument();

  fireEvent.click(within(overview).getByRole('button', { name: 'Tối ưu toàn đội ngay' }));
  expect(await within(overview).findByText('GS-CCLU-619284-5 (REEFER_40FT)')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Trạm bơm & Khóa an toàn/i }));
  const gateForm = await screen.findByRole('form', { name: 'Kiểm tra khóa an toàn trụ bơm' });
  fireEvent.submit(gateForm);
  expect(await screen.findByText(/CHẶN MỞ VÒI NZ-DO2-02/)).toBeInTheDocument();

  // Verify Transactions tab pre-fills reefer liters from currentFuelPct (18% -> ~197L) & supports CSV batch import
  api.ingestFuelTransactions.mockResolvedValue({ result: [] });
  fireEvent.click(screen.getByRole('tab', { name: /Nhật ký bơm tự động/i }));
  fireEvent.change(await screen.findByLabelText('Đối tượng bơm'), { target: { value: 'CONTAINER_GENSET' } });
  expect(screen.getByLabelText(/Số lít thực bơm/)).toHaveValue(197);

  fireEvent.click(screen.getByRole('button', { name: /Nhập nhanh lô CSV/i }));
  fireEvent.change(screen.getByLabelText('Dữ liệu lô giao dịch CSV'), {
    target: { value: 'NZ-DO5-01,VEHICLE,VEH-01,110,51200,HD-CSV-1\nNZ-DO5-01,CONTAINER_GENSET,CCLU-619284-5,197,,HD-CSV-2' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Đồng bộ cả lô' }));
  await waitFor(() =>
    expect(api.ingestFuelTransactions).toHaveBeenCalledWith('DEPOT-CATLAI-01', [
      {
        nozzleCode: 'NZ-DO5-01',
        assetKind: 'VEHICLE',
        assetCode: 'VEH-01',
        liters: 110,
        odometerKm: 51200,
        sourceType: 'MANUAL_IMPORT',
        invoiceRef: 'HD-CSV-1'
      },
      {
        nozzleCode: 'NZ-DO5-01',
        assetKind: 'CONTAINER_GENSET',
        assetCode: 'CCLU-619284-5',
        liters: 197,
        odometerKm: null,
        sourceType: 'MANUAL_IMPORT',
        invoiceRef: 'HD-CSV-2'
      }
    ])
  );
});
