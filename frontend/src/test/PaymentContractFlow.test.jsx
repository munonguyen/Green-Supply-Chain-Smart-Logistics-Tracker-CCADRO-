import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerContractModal from '../components/customer/CustomerContractModal';
import CustomerPaymentModal from '../components/customer/CustomerPaymentModal';
import CustomerPortalPage from '../pages/CustomerPortalPage';
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

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
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
    logout: vi.fn(),
    isAuthenticated: true
  })
}));

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() })
}));

vi.mock('../components/map/MapView', () => ({
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
  });
});
