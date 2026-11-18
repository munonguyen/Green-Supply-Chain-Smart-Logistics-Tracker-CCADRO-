import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createCustomerPayment, confirmCustomerPayment, triggerWebhookPaymentConfirm } from '../utils/paymentSync';
import { api } from '../services/api';
vi.mock('../services/api', () => ({ api: { createPayment: vi.fn(), confirmPayment: vi.fn(), simulatePaymentWebhook: vi.fn() } }));
beforeEach(() => { vi.stubEnv('VITE_DEMO_MODE', 'false'); vi.clearAllMocks(); Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() } }); });
afterEach(() => vi.unstubAllEnvs());
it('never turns a denied or offline API confirmation into a local paid ledger', async () => {
  api.confirmPayment.mockRejectedValue(new Error('Forbidden'));
  await expect(confirmCustomerPayment('PAY-1')).rejects.toThrow('Forbidden');
  expect(window.localStorage.getItem('ccadro_customer_payments_v1')).toBeNull();
});
it('creates pending server payments and never accepts an unsigned browser webhook', async () => {
  api.createPayment.mockResolvedValue({ result: { transactionCode: 'PAY-1', paymentStatus: 'PENDING' } });
  const result = await createCustomerPayment({ instantConfirm: true });
  expect(api.createPayment).toHaveBeenCalledWith({ instantConfirm: false });
  expect(result.payment.paymentStatus).toBe('PENDING');
  await expect(triggerWebhookPaymentConfirm('VNPAY', { transactionCode: 'PAY-1' })).rejects.toThrow('Chờ webhook');
  expect(api.simulatePaymentWebhook).not.toHaveBeenCalled();
});
