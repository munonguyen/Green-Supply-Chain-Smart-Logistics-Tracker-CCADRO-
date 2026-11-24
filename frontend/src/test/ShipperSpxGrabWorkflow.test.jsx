import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import ShipperPortalPage from '../systems/hub/features/portal/ShipperPortalPage';

const mapCapture = vi.hoisted(() => ({
  lastProps: null
}));

const mockAuthState = vi.hoisted(() => ({
  currentUser: {
    userId: '10000000-0000-0000-0000-000000000006',
    username: 'shipper',
    fullName: 'Nguyễn Văn Bắc (Shipper Đình Bảng #1)',
    companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
    role: 'HUB_SHIPPER',
    assignedHubCode: 'HUB-DINHBANG-BN',
    assignedShipperCode: 'SHP-BN-001',
    permissions: ['HUB_WORKSPACE_READ', 'SHIPPER_POLICY_READ', 'POD_PHOTO_SUBMIT']
  }
}));

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: mockAuthState.currentUser,
      accounts: [],
      hubAuthAuditLogs: [],
      provisionHubAccount: vi.fn(),
      toggleHubAccountStatus: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true
    })
  };
});

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() })
}));

vi.mock('../shared/map/MapView', () => ({
  default: (props) => {
    mapCapture.lastProps = props;
    return (
      <div data-testid="leaflet-map-view" data-hud={props.hudTitle}>
        {props.children}
      </div>
    );
  }
}));

vi.mock('../services/api', () => ({
  api: {
    getDistributionHubs: vi.fn(() => Promise.reject(new Error('offline'))),
    getHubLocalShippers: vi.fn(() => Promise.reject(new Error('offline'))),
    getContainerManifestItems: vi.fn(() => Promise.reject(new Error('offline'))),
    getShipperHandovers: vi.fn(() => Promise.reject(new Error('offline'))),
    getHubShipperWorkspace: vi.fn(() => Promise.reject(new Error('offline'))),
    getHubShipperStreamUrl: vi.fn(() => 'http://localhost:8888/api/v1/hub-shipper/stream'),
    batchPickupHubItems: vi.fn(() => Promise.resolve({ result: [] })),
    executeHubItemFieldAction: vi.fn(() => Promise.resolve({ result: null })),
    updateHubShipperTelemetry: vi.fn(() => Promise.resolve({ result: null })),
    checkInHubShipperShift: vi.fn(() => Promise.resolve({ result: null })),
    endHubShipperShift: vi.fn(() => Promise.resolve({ result: null })),
    remitHubShipperCod: vi.fn(() =>
      Promise.resolve({
        result: {
          remittanceCode: 'REMIT-BN-001-20261124',
          shipperCode: 'SHP-BN-001',
          remittedAmountVnd: 2450000,
          remittanceMethod: 'CASH_TO_CASHIER',
          status: 'CONFIRMED'
        }
      })
    ),
    settleHubShipperShift: vi.fn(() =>
      Promise.resolve({
        result: {
          settlementCode: 'STL-BN-001-20261124',
          shipperCode: 'SHP-BN-001',
          deliveredPodCount: 3,
          totalEarnedVnd: 210600
        }
      })
    ),
    updateHubShipperProfile: vi.fn(() => Promise.resolve({ result: null })),
    updateManifestItemStatus: vi.fn(() => Promise.resolve({ result: null })),
    submitItemPhotoPod: vi.fn(() => Promise.resolve({ result: null }))
  }
}));

describe('ShipperPortalPage - Real MapView & Strict Last-Mile Operational Rules', () => {
  beforeEach(() => {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      }
    });
    mapCapture.lastProps = null;
    vi.clearAllMocks();
  });

  it('renders real MapView, enforces shift lock while carrying cargo, blocks POD before Hub pickup, enforces SPX 3-call rule, executes On-Hold, and scans Hub Return', async () => {
    render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    // 1. Real Leaflet MapView mounted inside ShipperFieldCockpit with street layer
    expect(await screen.findByTestId('shipper-real-route-map')).toBeInTheDocument();
    expect(screen.getByTestId('leaflet-map-view')).toBeInTheDocument();
    expect(mapCapture.lastProps?.defaultLayer).toBe('google_street');

    // 2. Shift consistency: PKG-DB-0002 is OUT_FOR_DELIVERY -> "Đang đi giao (1)" is active & "Tạm nghỉ" is locked
    const deliveringBtn = screen.getByRole('button', { name: /Đang đi giao \(1\)/i });
    const pauseShiftBtn = screen.getByRole('button', { name: /Tạm nghỉ/i });
    expect(deliveringBtn).toHaveAttribute('aria-pressed', 'true');
    expect(pauseShiftBtn).toBeDisabled();

    // 3. Strict Hub Pickup Guard: selecting PKG-DB-0003 (ASSIGNED_TO_SHIPPER) locks POD & NDR until picked up
    fireEvent.click(screen.getByRole('button', { name: /#3 PKG-DB-0003/i }));
    expect(screen.getByTestId('hub-pickup-required-guard')).toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-open-pod')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-toggle-ndr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-open-pod-PKG-DB-0003')).not.toBeInTheDocument();

    // 4. Switch back to active stop #2 (PKG-DB-0002): Check COD banner & Check-in GPS arrival
    fireEvent.click(screen.getByRole('button', { name: /#2 PKG-DB-0002/i }));
    expect(screen.getByTestId('stop-cod-banner')).toHaveTextContent(/Thu hộ COD/i);

    fireEvent.click(screen.getByTestId('btn-checkin-arrival'));
    await waitFor(() => {
      expect(api.executeHubItemFieldAction).toHaveBeenCalledWith(
        'PKG-DB-0002',
        expect.objectContaining({ action: 'CHECKIN_ARRIVAL' })
      );
      const pkg2 = screen.getByTestId('manifest-item-PKG-DB-0002');
      expect(within(pkg2).getByText(/Check-in GPS tại điểm giao/i)).toBeInTheDocument();
    });

    // 5. SPX 3-Call Rule: Open NDR -> select uncontactable reason -> blocked if < 3 calls
    fireEvent.click(screen.getByTestId('btn-toggle-ndr'));
    const uncontactableReasonBtn = screen.getByRole('button', {
      name: /Không liên lạc được người nhận/i
    });
    fireEvent.click(uncontactableReasonBtn);

    // Warning is visible and submit is blocked
    expect(screen.getByTestId('spx-3call-rule-warning')).toBeInTheDocument();
    expect(screen.getByTestId('btn-submit-ndr')).toBeDisabled();

    // Perform 3 calls via the SPX direct calling button
    const callBtn = screen.getByTestId('btn-call-recipient');
    fireEvent.click(callBtn);
    fireEvent.click(callBtn);
    fireEvent.click(callBtn);

    await waitFor(() => {
      expect(api.executeHubItemFieldAction).toHaveBeenCalledWith(
        'PKG-DB-0002',
        expect.objectContaining({ action: 'LOG_CALL' })
      );
    });

    // Now callAttempts >= 3 -> warning disappears & submit NDR unlocks!
    expect(screen.queryByTestId('spx-3call-rule-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-submit-ndr')).not.toBeDisabled();

    // Submit On-Hold exception
    fireEvent.click(screen.getByTestId('btn-submit-ndr'));
    await waitFor(() => {
      expect(api.executeHubItemFieldAction).toHaveBeenCalledWith(
        'PKG-DB-0002',
        expect.objectContaining({ action: 'REPORT_NDR' })
      );
    });

    // 6. Test Hub Return Scan: Stop #2 is now On-Hold -> Scan return to Hub
    fireEvent.click(screen.getByRole('button', { name: /#2 PKG-DB-0002/i }));
    const returnHubBtn = await screen.findByTestId('btn-scan-hub-return');
    fireEvent.click(returnHubBtn);
    await waitFor(() => {
      expect(api.executeHubItemFieldAction).toHaveBeenCalledWith(
        'PKG-DB-0002',
        expect.objectContaining({ action: 'SCAN_HUB_RETURN' })
      );
      expect(screen.getByText(/Đã quét trả kho Bưu cục thành công/i)).toBeInTheDocument();
    });

    // Now 0 items are OUT_FOR_DELIVERY on the truck -> "Tạm nghỉ" unlocks!
    expect(screen.getByRole('button', { name: /Tạm nghỉ/i })).not.toBeDisabled();
  });

  it('supports Hub pickup scan -> barcode scan -> Cold-Chain Photo POD verification -> COD Remittance -> daily earnings & 3-Gate Checkout', async () => {
    render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    await screen.findByTestId('spx-next-stop-card');

    // 1. Deliver Stop #2 (PKG-DB-0002) which is currently OUT_FOR_DELIVERY
    const scanInput = screen.getByLabelText('Quét mã vạch kiện hàng');
    fireEvent.change(scanInput, { target: { value: 'pkg-db-0002' } });
    fireEvent.submit(scanInput.closest('form'));

    const podDialog2 = await screen.findByRole('dialog', {
      name: /Xác thực Giao hàng & Ảnh POD - PKG-DB-0002/i
    });
    fireEvent.click(within(podDialog2).getByTestId('btn-confirm-photo-pod'));
    await waitFor(() => {
      expect(api.submitItemPhotoPod).toHaveBeenCalledWith(
        'PKG-DB-0002',
        expect.objectContaining({ dispatchStatus: 'DELIVERED_POD' })
      );
    });

    // 2. Pickup PKG-DB-0003 (cold-chain 4°C) from Hub so it transitions ASSIGNED_TO_SHIPPER -> OUT_FOR_DELIVERY
    fireEvent.click(screen.getByTestId('btn-batch-pickup-scan'));
    await waitFor(() => {
      expect(api.batchPickupHubItems).toHaveBeenCalledWith(['PKG-DB-0003']);
      expect(screen.queryByTestId('btn-batch-pickup-scan')).not.toBeInTheDocument();
    });

    // 3. Scan barcode PKG-DB-0003 -> opens PhotoPodModal with Cold-Chain temperature check
    fireEvent.change(scanInput, { target: { value: 'pkg-db-0003' } });
    fireEvent.submit(scanInput.closest('form'));

    const podDialog3 = await screen.findByRole('dialog', {
      name: /Xác thực Giao hàng & Ảnh POD - PKG-DB-0003/i
    });
    expect(within(podDialog3).getByTestId('pod-handover-methods')).toBeInTheDocument();
    const tempInput = within(podDialog3).getByTestId('input-pod-temp-c');
    expect(tempInput).toHaveValue(4);

    fireEvent.change(tempInput, { target: { value: '4.2' } });
    fireEvent.click(within(podDialog3).getByTestId('btn-confirm-photo-pod'));

    await waitFor(() => {
      expect(api.submitItemPhotoPod).toHaveBeenCalledWith(
        'PKG-DB-0003',
        expect.objectContaining({
          dispatchStatus: 'DELIVERED_POD',
          handoverMethod: 'COLD_DOCK_GATE',
          measuredTempC: 4.2
        })
      );
      const pkg3 = screen.getByTestId('manifest-item-PKG-DB-0003');
      expect(within(pkg3).getByText(/Đã có Ảnh POD/i)).toBeInTheDocument();
    });

    // 4. Open GrabDriver / SPX Earnings, SLA Gem Quest, COD Wallet & Settlement tab
    const earningsTabs = screen.getAllByRole('button', { name: /Thu Nhập & Đối Soát/i });
    fireEvent.click(earningsTabs[0]);

    expect(
      await screen.findByText(/VÍ THU NHẬP & THƯỞNG NĂNG SUẤT CA LÀM VIỆC/i)
    ).toBeInTheDocument();

    // Verify COD cash holding card exists
    expect(screen.getByTestId('card-cod-holding')).toBeInTheDocument();

    // Test COD Remittance modal: remit collected COD cash to Hub Cashier
    fireEvent.click(screen.getByTestId('btn-open-remit-modal'));
    expect(screen.getByTestId('cod-remittance-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-confirm-remit-cod'));

    await waitFor(() => {
      expect(api.remitHubShipperCod).toHaveBeenCalledWith(
        expect.objectContaining({
          hubCode: 'HUB-DINHBANG-BN',
          shipperCode: 'SHP-BN-001'
        })
      );
      expect(screen.queryByTestId('cod-remittance-modal')).not.toBeInTheDocument();
    });

    // Settle shift PODs
    const settleBtn = screen.getByTestId('btn-settle-shift-pod');
    expect(settleBtn).toHaveTextContent(/Đối soát & Bàn giao chứng từ/i);
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(api.settleHubShipperShift).toHaveBeenCalledWith(
        expect.objectContaining({
          hubCode: 'HUB-DINHBANG-BN',
          shipperCode: 'SHP-BN-001'
        })
      );
      expect(settleBtn).toHaveTextContent(/Đã nộp đối soát cuối ca/i);
      expect(screen.getAllByText(/STL-BN-001-20261124/i).length).toBeGreaterThanOrEqual(1);
    });

    // 5. Switch back to Dispatch Cockpit tab and test 3-Gate Shift End Checkout
    const dispatchTabs = screen.getAllByRole('button', { name: /Điều Phối & POD/i });
    fireEvent.click(dispatchTabs[0]);

    fireEvent.click(screen.getByTestId('btn-open-end-shift'));
    expect(
      screen.getByRole('dialog', {
        name: /Khóa kiểm tra 3 điều kiện Kết thúc ca làm việc Bưu cục/i
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-confirm-end-shift'));
    await waitFor(() => {
      expect(api.endHubShipperShift).toHaveBeenCalledWith('SHP-BN-001');
    });
  });
});
