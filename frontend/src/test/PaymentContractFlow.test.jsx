import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerContractModal from '../systems/customer/shared/CustomerContractModal';
import CustomerPaymentModal from '../systems/customer/shared/CustomerPaymentModal';
import CustomerPortalPage from '../systems/customer/features/portal/CustomerPortalPage';
import ShipperPortalPage, { calculateHaversineKm } from '../systems/hub/features/portal/ShipperPortalPage';
import {
  calculateGreenInvoiceBreakdown,
  confirmCustomerPayment,
  createCustomerContract,
  createCustomerPayment,
  loadContractSlaEvents,
  loadCustomerContracts,
  loadCustomerPayments,
  recordCustomerSlaEvent,
  refundCustomerPayment,
  settleCustomerContractWithEpod,
  signCustomerContract,
  triggerWebhookPaymentConfirm
} from '../utils/paymentSync';

const mockAuthState = vi.hoisted(() => ({
  currentUser: {
    userId: '10000000-0000-0000-0000-000000000007',
    username: 'customer',
    fullName: 'Minh Phú & Vinamilk B2B (Chủ Hàng)',
    companyName: 'Vinamilk Logistics Hub',
    customerId: 'DOANH_NGHIEP_B2B',
    email: 'customer@ccadro.com',
    phone: '028 5415 5555',
    role: 'CUSTOMER',
    permissions: [
      'CONTRACT_READ_OWN',
      'CONTRACT_CREATE',
      'CONTRACT_SIGN',
      'PAYMENT_READ_OWN',
      'PAYMENT_CREATE'
    ]
  },
  accounts: [
    {
      username: 'hub_mgr_dinhbang',
      fullName: 'Trần Minh Quang (Trưởng Trụ Sở Đình Bảng)',
      role: 'HUB_MANAGER',
      primaryRole: 'HUB_MANAGER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: null,
      status: 'ACTIVE',
      failedLoginAttempts: 0
    },
    {
      username: 'shipper',
      fullName: 'Nguyễn Văn Toàn (Shipper Đình Bảng #1)',
      role: 'HUB_SHIPPER',
      primaryRole: 'HUB_SHIPPER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: 'SHP-BN-001',
      status: 'ACTIVE',
      failedLoginAttempts: 0
    },
    {
      username: 'hub_inspector_bn',
      fullName: 'Vũ Thu Hà (Kiểm Tra Viên Ảnh POD & SLA)',
      role: 'HUB_AUDITOR',
      primaryRole: 'HUB_AUDITOR',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: null,
      status: 'ACTIVE',
      failedLoginAttempts: 0
    }
  ],
  hubAuthAuditLogs: [
    {
      id: 'audit-test-01',
      eventType: 'LOGIN_SUCCESS',
      username: 'hub_mgr_dinhbang',
      assignedHubCode: 'HUB-DINHBANG-BN',
      outcome: 'SUCCESS',
      detail: 'Đăng nhập thành công HUB_MANAGER • HUB-DINHBANG-BN',
      createdAt: '2026-11-14T08:30:00Z'
    }
  ],
  provisionHubAccount: vi.fn(async (payload) => {
    const created = {
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role,
      primaryRole: payload.role,
      assignedHubCode: payload.assignedHubCode,
      assignedShipperCode: payload.assignedShipperCode || null,
      status: 'ACTIVE',
      failedLoginAttempts: 0
    };
    mockAuthState.accounts = [...mockAuthState.accounts, created];
    return created;
  }),
  toggleHubAccountStatus: vi.fn(async (targetUsername, nextStatus) => {
    mockAuthState.accounts = mockAuthState.accounts.map((a) =>
      a.username === targetUsername ? { ...a, status: nextStatus } : a
    );
    return mockAuthState.accounts;
  })
}));

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: mockAuthState.currentUser,
      accounts: mockAuthState.accounts,
      hubAuthAuditLogs: mockAuthState.hubAuthAuditLogs,
      provisionHubAccount: mockAuthState.provisionHubAccount,
      toggleHubAccountStatus: mockAuthState.toggleHubAccountStatus,
      logout: vi.fn(),
      isAuthenticated: true
    })
  };
});

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() })
}));

vi.mock('../shared/map/MapView', () => ({
  default: () => <div data-testid="map-view-stub" />
}));

vi.mock('../services/api', () => ({
  api: {
    getPayments: vi.fn(() => Promise.reject(new Error('offline'))),
    createPayment: vi.fn(() => Promise.reject(new Error('offline'))),
    confirmPayment: vi.fn(() => Promise.reject(new Error('offline'))),
    refundPayment: vi.fn(() => Promise.reject(new Error('offline'))),
    simulatePaymentWebhook: vi.fn(() => Promise.reject(new Error('offline'))),
    getContracts: vi.fn(() => Promise.reject(new Error('offline'))),
    getContractDetail: vi.fn(() => Promise.reject(new Error('offline'))),
    getContractEvents: vi.fn(() => Promise.reject(new Error('offline'))),
    createContract: vi.fn(() => Promise.reject(new Error('offline'))),
    signContract: vi.fn(() => Promise.reject(new Error('offline'))),
    recordContractSlaEvent: vi.fn(() => Promise.reject(new Error('offline'))),
    settleContractWithEpod: vi.fn(() => Promise.reject(new Error('offline')))
  }
}));

describe('B2B Contract, SLA Settlement, Net-30 Credit & Payment Webhook E2E Flow', () => {
  beforeEach(() => {
  vi.stubEnv('VITE_DEMO_MODE', 'true');
    mockAuthState.currentUser = {
      userId: '10000000-0000-0000-0000-000000000007',
      username: 'customer',
      fullName: 'Minh Phú & Vinamilk B2B (Chủ Hàng)',
      companyName: 'Vinamilk Logistics Hub',
      customerId: 'DOANH_NGHIEP_B2B',
      email: 'customer@ccadro.com',
      phone: '028 5415 5555',
      role: 'CUSTOMER',
      permissions: [
        'CONTRACT_READ_OWN',
        'CONTRACT_CREATE',
        'CONTRACT_SIGN',
        'PAYMENT_READ_OWN',
        'PAYMENT_CREATE'
      ]
    };
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
  });

  it('loads seeded Master MSA, Spot Trip contracts, and B2B payment ledger', async () => {
    const { contracts } = await loadCustomerContracts('DOANH_NGHIEP_B2B');
    const { payments } = await loadCustomerPayments('DOANH_NGHIEP_B2B');

    const msa = contracts.find((c) => c.contractType === 'MASTER_MSA');
    expect(msa).toBeDefined();
    expect(msa.contractNumber).toBe('HDK-CCADRO-2026-0001');
    expect(msa.creditLimitVnd).toBe(500000000);
    expect(msa.usedCreditVnd).toBe(2461860);
    expect(msa.customerSignatureHash).toMatch(/^SHA256:/);

    expect(contracts.some((c) => c.contractNumber === 'HD-SHP-2026-8192')).toBe(true);
    expect(payments.some((p) => p.paymentStatus === 'PENDING')).toBe(true);
    expect(payments.some((p) => p.paymentStatus === 'NET30_CREDIT')).toBe(true);
  });

  it('executes full Draft -> SHA-256 Sign -> SLA Breach (-5%) -> ePOD Settlement -> Webhook Paid flow', async () => {
    const shipmentCode = 'SHP-2026-TEST01';

    // 1. Create Draft Spot Trip Contract
    const { contract: draft } = await createCustomerContract({
      contractType: 'SPOT_TRIP',
      shipmentCode,
      customerId: 'DOANH_NGHIEP_B2B',
      customerName: 'Vinamilk Logistics Hub',
      corridorScope: 'Cảng Cát Lái → KCN VSIP 1',
      contractValueVnd: 2000000,
      paymentTerms: 'PREPAID',
      autoSign: false
    });
    expect(draft.contractStatus).toBe('DRAFT');
    expect(draft.customerSignatureHash).toBeNull();

    // 2. Sign Contract with SHA-256
    const { contract: signed } = await signCustomerContract(draft.contractNumber, {
      signedByUsername: 'customer',
      notes: 'Ký số xác nhận hợp đồng'
    });
    expect(signed.contractStatus).toBe('SIGNED_ACTIVE');
    expect(signed.customerSignatureHash).toMatch(/^SHA256:[a-f0-9]{64}$/);

    // 3. Create Pending VietQR Invoice (EV 5% discount + 8% VAT => 2,052,000 VND)
    const expectedBreakdown = calculateGreenInvoiceBreakdown(2000000, 'EV');
    expect(expectedBreakdown.greenEsgDiscountVnd).toBe(100000);
    expect(expectedBreakdown.vatAmountVnd).toBe(152000);
    expect(expectedBreakdown.totalAmountVnd).toBe(2052000);

    const { payment: pendingTx } = await createCustomerPayment({
      shipmentCode,
      customerId: 'DOANH_NGHIEP_B2B',
      customerName: 'Vinamilk Logistics Hub',
      createdByUsername: 'customer',
      paymentMethod: 'VIETQR_NAPAS',
      powertrainType: 'EV',
      baseFreightVnd: 2000000,
      instantConfirm: false
    });
    expect(pendingTx.paymentStatus).toBe('PENDING');
    expect(pendingTx.totalAmountVnd).toBe(2052000);

    // 4. Record SLA Temp Breach (-5% = 100,000 VND deduction)
    const { contract: afterBreach } = await recordCustomerSlaEvent(draft.contractNumber, {
      eventType: 'TEMP_BREACH',
      severity: 'BREACH',
      recordedBy: 'IOT_REEFER_SENSOR',
      description: 'Nhiệt độ lệch +2.4°C vượt ngưỡng SLA'
    });
    expect(afterBreach.slaPenaltyDeductionVnd).toBe(100000);
    expect(afterBreach.finalSettlementVnd).toBe(1900000);

    // 5. Settle Contract with ePOD -> Reconciles open payment downward!
    const { contract: settled } = await settleCustomerContractWithEpod(draft.contractNumber, {
      epodSignerName: 'Nguyễn Minh Phú'
    });
    expect(settled.contractStatus).toBe('SETTLED');
    expect(settled.finalSettlementVnd).toBe(1900000);

    const { payments: refreshedPayments } = await loadCustomerPayments('DOANH_NGHIEP_B2B');
    const syncedTx = refreshedPayments.find((p) => p.transactionCode === pendingTx.transactionCode);
    // netBase = 2,000,000 - 100,000 = 1,900,000; esg = 100,000; taxable = 1,800,000; vat = 144,000 -> total = 1,944,000
    expect(syncedTx.totalAmountVnd).toBe(1944000);

    // 6. Confirm open invoice automatically via Bank Webhook 24/7
    const { payment: webhookPaid } = await triggerWebhookPaymentConfirm('VIETQR_NAPAS', {
      transactionCode: syncedTx.transactionCode,
      gatewayReference: 'WH-TEST-991122',
      payerName: 'Vinamilk Logistics Hub'
    });
    expect(webhookPaid.paymentStatus).toBe('PAID');
    expect(webhookPaid.gatewayReference).toBe('WH-TEST-991122');

    // Verify full audit timeline recorded
    const timeline = await loadContractSlaEvents(draft.contractNumber);
    const types = timeline.map((ev) => ev.eventType);
    expect(types).toContain('CREATED');
    expect(types).toContain('SIGNED');
    expect(types).toContain('TEMP_BREACH');
    expect(types).toContain('SETTLED');
  });

  it('enforces Master MSA Net-30 credit limit and releases credit on payment/refund', async () => {
    const initialMsa = (await loadCustomerContracts('DOANH_NGHIEP_B2B')).contracts.find(
      (c) => c.contractType === 'MASTER_MSA'
    );
    const initialUsed = initialMsa.usedCreditVnd; // 2,461,860

    // Create a Net-30 payment of 10,000,000 base EV => 10,260,000 VND total
    const { payment: net30Tx } = await createCustomerPayment({
      shipmentCode: 'SHP-NET30-01',
      customerId: 'DOANH_NGHIEP_B2B',
      customerName: 'Vinamilk Logistics Hub',
      createdByUsername: 'customer',
      paymentMethod: 'GREEN_CREDIT_NET30',
      powertrainType: 'EV',
      baseFreightVnd: 10000000
    });
    expect(net30Tx.paymentStatus).toBe('NET30_CREDIT');

    const msaAfterCreate = (await loadCustomerContracts('DOANH_NGHIEP_B2B')).contracts.find(
      (c) => c.contractType === 'MASTER_MSA'
    );
    expect(msaAfterCreate.usedCreditVnd).toBe(initialUsed + net30Tx.totalAmountVnd);

    // Exceeding 500M VND Net-30 credit limit should throw explicit error
    await expect(
      createCustomerPayment({
        shipmentCode: 'SHP-NET30-OVER',
        customerId: 'DOANH_NGHIEP_B2B',
        customerName: 'Vinamilk Logistics Hub',
        createdByUsername: 'customer',
        paymentMethod: 'GREEN_CREDIT_NET30',
        powertrainType: 'EV',
        baseFreightVnd: 600000000
      })
    ).rejects.toThrow(/Vượt hạn mức công nợ Xanh Net-30/i);

    // Confirming Net-30 invoice releases reserved credit on MSA
    await confirmCustomerPayment(net30Tx.transactionCode, { paymentMethod: 'VIETQR_NAPAS' });
    const msaAfterPay = (await loadCustomerContracts('DOANH_NGHIEP_B2B')).contracts.find(
      (c) => c.contractType === 'MASTER_MSA'
    );
    expect(msaAfterPay.usedCreditVnd).toBe(initialUsed);

    // Create another Net-30 and refund it -> also releases credit cleanly
    const { payment: net30RefundTx } = await createCustomerPayment({
      shipmentCode: 'SHP-NET30-02',
      customerId: 'DOANH_NGHIEP_B2B',
      customerName: 'Vinamilk Logistics Hub',
      createdByUsername: 'customer',
      paymentMethod: 'GREEN_CREDIT_NET30',
      powertrainType: 'EV',
      baseFreightVnd: 5000000
    });
    await refundCustomerPayment(net30RefundTx.transactionCode, 'Hủy chuyến thử nghiệm', 'customer');
    const msaAfterRefund = (await loadCustomerContracts('DOANH_NGHIEP_B2B')).contracts.find(
      (c) => c.contractType === 'MASTER_MSA'
    );
    expect(msaAfterRefund.usedCreditVnd).toBe(initialUsed);
  });

  it('renders CustomerContractModal & CustomerPaymentModal and triggers contract/payment actions accurately', async () => {
    const onSignContract = vi.fn(() => Promise.resolve());
    const onRecordSlaEvent = vi.fn(() => Promise.resolve());
    const onSettleWithEpod = vi.fn(() => Promise.resolve());

    const draftContract = {
      contractNumber: 'HD-SHP-UI-01',
      contractType: 'SPOT_TRIP',
      shipmentCode: 'SHP-UI-01',
      customerId: 'DOANH_NGHIEP_B2B',
      customerName: 'Vinamilk Logistics Hub',
      corridorScope: 'Cảng Cát Lái → ICD Sóng Thần',
      contractValueVnd: 3000000,
      slaPenaltyDeductionVnd: 0,
      finalSettlementVnd: 3000000,
      paymentTerms: 'PREPAID',
      contractStatus: 'DRAFT'
    };

    const { rerender } = render(
      <CustomerContractModal
        isOpen
        onClose={vi.fn()}
        contract={draftContract}
        user={{ username: 'customer', customerId: 'DOANH_NGHIEP_B2B', fullName: 'Minh Phú' }}
        onSignContract={onSignContract}
        onRecordSlaEvent={onRecordSlaEvent}
        onSettleWithEpod={onSettleWithEpod}
      />
    );

    expect(screen.getByText('HD-SHP-UI-01')).toBeInTheDocument();
    expect(screen.getByText('Khởi tạo Dự thảo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ký Số SHA-256 Kích Hoạt/i }));
    await waitFor(() => {
      expect(onSignContract).toHaveBeenCalledWith('HD-SHP-UI-01', {
        signedByUsername: 'customer',
        notes: expect.any(String)
      });
    });

    // Switch modal to SIGNED_ACTIVE state & trigger SLA breach + ePOD settle
    rerender(
      <CustomerContractModal
        isOpen
        onClose={vi.fn()}
        contract={{
          ...draftContract,
          contractStatus: 'SIGNED_ACTIVE',
          customerSignatureHash: 'SHA256:abcdef0123456789'
        }}
        user={{ username: 'customer', customerId: 'DOANH_NGHIEP_B2B', fullName: 'Minh Phú' }}
        onSignContract={onSignContract}
        onRecordSlaEvent={onRecordSlaEvent}
        onSettleWithEpod={onSettleWithEpod}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Mô Phỏng Lệch Nhiệt/i }));
    await waitFor(() => {
      expect(onRecordSlaEvent).toHaveBeenCalledWith(
        'HD-SHP-UI-01',
        expect.objectContaining({ eventType: 'TEMP_BREACH', severity: 'BREACH' })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Nghiệm Thu ePOD & Chốt Đối Soát/i }));
    await waitFor(() => {
      expect(onSettleWithEpod).toHaveBeenCalledWith(
        'HD-SHP-UI-01',
        expect.objectContaining({ epodSignerName: 'Minh Phú' })
      );
    });

    // Verify CustomerPaymentModal resets state properly and handles Net-30 vs VietQR
    const onCreateAndConfirm = vi.fn(() => Promise.resolve());
    render(
      <CustomerPaymentModal
        isOpen
        onClose={vi.fn()}
        targetOrder={{
          shipmentCode: 'SHP-UI-PAY',
          originName: 'Cát Lái',
          destinationName: 'Sóng Thần',
          containerCode: 'TCKU-123',
          estimatedCostVnd: 2000000,
          powertrainId: 'ev'
        }}
        user={{ companyName: 'Vinamilk Logistics Hub', customerId: 'DOANH_NGHIEP_B2B' }}
        onCreateAndConfirm={onCreateAndConfirm}
      />
    );

    fireEvent.click(screen.getByText(/Công Nợ Xanh Net-30/i));
    const net30Btn = screen.getByRole('button', { name: /Ghi Nợ Công Nợ Net-30/i });
    fireEvent.click(net30Btn);
    await waitFor(() => {
      expect(onCreateAndConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ shipmentCode: 'SHP-UI-PAY' }),
        expect.objectContaining({ paymentMethod: 'GREEN_CREDIT_NET30', instantConfirm: false })
      );
    });
  });

  it('runs complete CustomerPortalPage UI flow from Contracts & SLA tab through ePOD & Webhook Payment', async () => {
    render(
      <MemoryRouter initialEntries={['/customer']}>
        <CustomerPortalPage />
      </MemoryRouter>
    );

    // 1. Navigate to Contracts & SLA tab
    const contractsNavBtns = await screen.findAllByRole('button', { name: /Hợp Đồng & SLA/i });
    fireEvent.click(contractsNavBtns[0]);

    // Verify Bento KPIs & seeded Master MSA + Spot Trip table render
    expect(await screen.findByText('Hạn Mức Net-30 Khả Dụng')).toBeInTheDocument();
    expect(screen.getByText(/HDK-CCADRO-2026-0001 • Vinamilk Logistics Hub/i)).toBeInTheDocument();
    const spotRowCell = await screen.findByText('HD-SHP-2026-4920');
    expect(spotRowCell).toBeInTheDocument();

    // 2. Create Draft MSA & Sign with SHA-256 directly in CustomerContractModal
    fireEvent.click(screen.getByRole('button', { name: /Tạo Dự Thảo Chờ Ký/i }));
    const contractDialog = await screen.findByRole('dialog', {
      name: /Chi Tiết Hợp Đồng Điện Tử & Đối Soát SLA/i
    });
    expect(within(contractDialog).getByText('Khởi tạo Dự thảo')).toBeInTheDocument();
    fireEvent.click(
      within(contractDialog).getByRole('button', { name: /Ký Số SHA-256 Kích Hoạt/i })
    );
    await waitFor(() => {
      expect(within(contractDialog).getByText(/Đã ký số SHA-256 và kích hoạt hợp đồng thành công/i)).toBeInTheDocument();
    });
    fireEvent.click(within(contractDialog).getByRole('button', { name: /Đóng hợp đồng/i }));

    // 3. Open HD-SHP-2026-4920 -> Record SLA Breach (-5%) -> Settle ePOD -> Open Payment
    const row4920 = screen.getByText('HD-SHP-2026-4920').closest('tr');
    fireEvent.click(within(row4920).getByRole('button', { name: /Chi Tiết SLA/i }));

    const spotDialog = await screen.findByRole('dialog', {
      name: /Chi Tiết Hợp Đồng Điện Tử & Đối Soát SLA/i
    });
    fireEvent.click(within(spotDialog).getByRole('button', { name: /Mô Phỏng Lệch Nhiệt/i }));
    await waitFor(() => {
      expect(within(spotDialog).getByText(/-210\.000 ₫/)).toBeInTheDocument();
    });

    fireEvent.click(within(spotDialog).getByRole('button', { name: /Nghiệm Thu ePOD & Chốt Đối Soát/i }));
    await waitFor(() => {
      expect(within(spotDialog).getByText(/Đã nghiệm thu ePOD & Chốt SLA/i)).toBeInTheDocument();
    });

    // 4. Jump straight from Contract Modal into Payment Modal -> Confirm via Webhook 24/7
    fireEvent.click(within(spotDialog).getByRole('button', { name: /Mở Thanh Toán Hóa Đơn/i }));
    const payDialog = await screen.findByRole('dialog', {
      name: /Cổng Thanh Toán & Hóa Đơn Điện Tử CCADRO/i
    });
    expect(within(payDialog).getAllByText(/4\.082\.400 ₫/).length).toBeGreaterThan(0);
    fireEvent.click(within(payDialog).getByRole('button', { name: /Webhook Đối Soát 24\/7/i }));

    // 5. Switch to Payments tab & confirm PAY-2026-492002 is now PAID
    const paymentNavBtns = screen.getAllByRole('button', { name: /^Thanh Toán/i });
    fireEvent.click(paymentNavBtns[0]);

    const txRow = (await screen.findByText('PAY-2026-492002')).closest('tr');
    expect(within(txRow).getByText('Đã thanh toán')).toBeInTheDocument();
  }, 20000);

  it('ingests container cargo manifest into Local Hub and auto-dispatches each cargo item to the nearest assigned Shipper as HUB_MANAGER', async () => {
    const distNorth = calculateHaversineKm(10.9532, 106.8978, 10.952, 106.8965);
    expect(distNorth).toBeLessThan(0.25);

    mockAuthState.currentUser = {
      userId: '10000000-0000-0000-0000-000000000012',
      username: 'hub_mgr_amata',
      fullName: 'Lê Hoàng Nam (Trưởng Trụ Sở Amata)',
      companyName: 'Trụ sở Amata - Biên Hòa',
      role: 'HUB_MANAGER',
      assignedHubCode: 'HUB-AMATA-BH',
      assignedShipperCode: null,
      permissions: ['CONTAINER_MANIFEST_INGEST', 'HUB_DISPATCH_AUTO', 'HUB_TASK_RANGE_ASSIGN']
    };

    render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Trụ sở Giao nhận Khu vực Amata • Biên Hòa/i)
    ).toBeInTheDocument();

    // 1. Ingest manifest from Container TCKU-781920-4 to Hub HUB-AMATA-BH
    fireEvent.click(screen.getByTestId('btn-ingest-manifest'));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Đã gửi dữ liệu sang Trụ sở \(Chờ chia Shipper\)/i).length
      ).toBeGreaterThanOrEqual(3);
    });

    // 2. Run Geo-Proximity Auto-Dispatch across Hub Shippers
    fireEvent.click(screen.getByTestId('btn-auto-dispatch-proximity'));
    await waitFor(() => {
      const card1 = screen.getByTestId('manifest-item-WB-AMATA-8192-01');
      const card2 = screen.getByTestId('manifest-item-WB-AMATA-8192-02');
      const card3 = screen.getByTestId('manifest-item-WB-AMATA-8192-03');

      expect(within(card1).getAllByText(/Đặng Quốc Bảo \(SHP-BH-101\)/).length).toBeGreaterThan(0);
      expect(within(card2).getAllByText(/Võ Minh Khang \(SHP-BH-102\)/).length).toBeGreaterThan(0);
      expect(within(card3).getAllByText(/Huỳnh Gia Huy \(SHP-BH-103\)/).length).toBeGreaterThan(0);
    });
  });

  it('enforces Hub & Shipper RBAC Isolation for HUB_SHIPPER (HUB-DINHBANG-BN / SHP-BN-001) and requires Photo POD', async () => {
    mockAuthState.currentUser = {
      userId: '10000000-0000-0000-0000-000000000006',
      username: 'shipper',
      fullName: 'Nguyễn Văn Toàn (Shipper Đình Bảng #1)',
      companyName: 'Trụ sở Đình Bảng - Từ Sơn, Bắc Ninh',
      role: 'HUB_SHIPPER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: 'SHP-BN-001',
      permissions: ['HUB_WORKSPACE_READ', 'SHIPPER_POLICY_READ', 'POD_PHOTO_SUBMIT']
    };

    render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(/Trụ sở Giao nhận Đình Bảng • Từ Sơn, Bắc Ninh/i).length
      ).toBeGreaterThan(0);
      expect(screen.queryByTestId('hub-pill-HUB-AMATA-BH')).not.toBeInTheDocument();
      expect(screen.getByTestId('hub-pill-HUB-DINHBANG-BN')).toBeInTheDocument();
      // HUB_SHIPPER cannot see manager ingest/dispatch CTA or IAM admin tab
      expect(screen.queryByTestId('btn-ingest-manifest')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-auto-dispatch-proximity')).not.toBeInTheDocument();
    });

    // Strict shipper-level scoping: sees SHP-BN-001's PKG-DB-0001..0003, NOT SHP-BN-002's PKG-DB-0004
    const pkg1 = screen.getByTestId('manifest-item-PKG-DB-0001');
    expect(within(pkg1).getByText(/Nhà máy Chế biến Thực phẩm CP Hải Dương/i)).toBeInTheDocument();
    expect(within(pkg1).getByText(/Siêu thị Dabaco Từ Sơn - Chi nhánh Đình Bảng/i)).toBeInTheDocument();
    expect(screen.queryByTestId('manifest-item-PKG-DB-0004')).not.toBeInTheDocument();

    // Open Photo POD Modal for PKG-DB-0002 (OUT_FOR_DELIVERY) and submit Photo POD
    fireEvent.click(screen.getByTestId('btn-open-pod-PKG-DB-0002'));
    const podDialog = await screen.findByRole('dialog', {
      name: /Xác thực Giao hàng & Ảnh POD - PKG-DB-0002/i
    });
    expect(within(podDialog).getByText(/Công ty Điện tử Hansol Tech Việt Nam/i)).toBeInTheDocument();
    fireEvent.click(within(podDialog).getByTestId('btn-confirm-photo-pod'));

    await waitFor(() => {
      const pkg2 = screen.getByTestId('manifest-item-PKG-DB-0002');
      expect(within(pkg2).getByText(/Đã có Ảnh POD/i)).toBeInTheDocument();
    });

    // Open Policy tab: HUB_SHIPPER sees policy & scope, CANNOT assign code range
    fireEvent.click(screen.getByTestId('btn-open-policy-tab'));
    expect(await screen.findByText(/CHÍNH SÁCH DÀNH RIÊNG CHO SHIPPER/i)).toBeInTheDocument();
    expect(screen.queryByTestId('btn-assign-code-range')).not.toBeInTheDocument();
    expect(screen.getByTestId('code-range-rbac-notice')).toBeInTheDocument();
  });

  it('allows HUB_MANAGER (@hub_mgr_dinhbang) to assign code range & manage hub_iam accounts, while HUB_AUDITOR is strictly Read-Only', async () => {
    mockAuthState.currentUser = {
      userId: '10000000-0000-0000-0000-000000000011',
      username: 'hub_mgr_dinhbang',
      fullName: 'Trần Minh Quang (Trưởng Trụ Sở Đình Bảng)',
      role: 'HUB_MANAGER',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: null,
      permissions: ['HUB_TASK_RANGE_ASSIGN', 'HUB_ACCOUNT_MANAGE']
    };

    const { unmount } = render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    // 1. HUB_MANAGER can see & assign code range PKG-DB-0001 -> PKG-DB-0003
    fireEvent.click(await screen.findByTestId('btn-open-policy-tab'));
    fireEvent.change(screen.getByTestId('select-range-from'), { target: { value: 'PKG-DB-0001' } });
    fireEvent.change(screen.getByTestId('select-range-to'), { target: { value: 'PKG-DB-0003' } });
    fireEvent.click(screen.getByTestId('btn-assign-code-range'));

    await waitFor(() => {
      expect(screen.getAllByText(/PKG-DB-0001 → PKG-DB-0003/i).length).toBeGreaterThan(0);
    });

    // 2. HUB_MANAGER can open Kho Tài khoản & Bảo mật IAM tab and view hub_iam directory + audit log
    const iamButtons = screen.getAllByRole('button', { name: /Kho Tài khoản & Bảo mật IAM/i });
    fireEvent.click(iamButtons[0]);
    expect(await screen.findByTestId('hub-iam-row-shipper')).toBeInTheDocument();
    expect(screen.getByTestId('hub-iam-row-hub_inspector_bn')).toBeInTheDocument();

    unmount();

    // 3. HUB_AUDITOR is strictly Read-Only
    mockAuthState.currentUser = {
      userId: '10000000-0000-0000-0000-000000000016',
      username: 'hub_inspector_bn',
      fullName: 'Vũ Thu Hà (Kiểm Tra Viên Ảnh POD & SLA)',
      role: 'HUB_AUDITOR',
      assignedHubCode: 'HUB-DINHBANG-BN',
      assignedShipperCode: null,
      permissions: ['HUB_AUDIT_READ', 'POD_PHOTO_VIEW']
    };

    render(
      <MemoryRouter initialEntries={['/shipper']}>
        <ShipperPortalPage />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('auditor-readonly-pill-PKG-DB-0002')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-open-pod-PKG-DB-0002')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kho Tài khoản & Bảo mật IAM/i })).not.toBeInTheDocument();
  });
});
