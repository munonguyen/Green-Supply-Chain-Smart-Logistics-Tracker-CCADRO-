import { api } from '../services/api';

const PAYMENT_STORAGE_KEY = 'ccadro_customer_payments_v1';

export const PAYMENT_METHODS = [
  {
    id: 'VIETQR_NAPAS',
    label: 'Chuyển khoản VietQR Napas 24/7',
    shortLabel: 'VietQR 24/7',
    badge: 'Miễn phí GD',
    description: 'Quét mã QR ngân hàng (Vietcombank / NAPAS 247), tự động đối soát tức thì.'
  },
  {
    id: 'VNPAY_QR',
    label: 'Cổng Thanh Toán VNPay-QR',
    shortLabel: 'VNPay QR',
    badge: 'Đa ngân hàng',
    description: 'Hỗ trợ 40+ ứng dụng ngân hàng nội địa và xuất hóa đơn VAT tức thời.'
  },
  {
    id: 'MOMO_WALLET',
    label: 'Ví Điện Tử MoMo Business',
    shortLabel: 'MoMo Business',
    badge: 'Nhanh 5s',
    description: 'Thanh toán nhanh qua ví doanh nghiệp MoMo hoặc mã QR động.'
  },
  {
    id: 'CORPORATE_CARD',
    label: 'Thẻ Doanh Nghiệp Visa / Mastercard',
    shortLabel: 'Thẻ DN',
    badge: 'Instant Paid',
    description: 'Thanh toán tức thì bằng thẻ tín dụng/ghi nợ doanh nghiệp (3DS2).'
  },
  {
    id: 'GREEN_CREDIT_NET30',
    label: 'Công Nợ Xanh Net-30 (Đối Soát Cuối Kỳ)',
    shortLabel: 'Công nợ Net-30',
    badge: 'Hạn mức B2B',
    description: 'Ghi nợ doanh nghiệp kỳ hạn 30 ngày, đối soát kèm báo cáo GLEC v3.'
  }
];

export const PAYMENT_STATUS_META = {
  PAID: { label: 'Đã thanh toán', color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' },
  PENDING: { label: 'Chờ thanh toán', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  NET30_CREDIT: { label: 'Công nợ Net-30', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  REFUNDED: { label: 'Đã hoàn tiền', color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)' }
};

export function calculateGreenInvoiceBreakdown(baseFreightVnd = 0, powertrainId = 'ev') {
  const base = Math.max(0, Math.round(Number(baseFreightVnd) || 0));
  const pt = String(powertrainId || 'ev').toLowerCase();
  const discountRate = pt.includes('ev') ? 0.05 : pt.includes('lng') || pt.includes('hybrid') ? 0.03 : 0;
  const greenEsgDiscountVnd = Math.round(base * discountRate);
  const taxable = Math.max(0, base - greenEsgDiscountVnd);
  const vatAmountVnd = Math.round(taxable * 0.08);
  const totalAmountVnd = taxable + vatAmountVnd;
  return {
    baseFreightVnd: base,
    discountRatePct: Math.round(discountRate * 100),
    greenEsgDiscountVnd,
    vatAmountVnd,
    totalAmountVnd
  };
}

const DEFAULT_SEED_PAYMENTS = [
  {
    transactionCode: 'PAY-2026-819201',
    invoiceNumber: 'INV-CCADRO-2026-0001',
    shipmentCode: 'SHP-2026-8192',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    createdByUsername: 'customer',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'ICD Sóng Thần, Dĩ An, Bình Dương',
    containerCode: 'TCKU-781920-4',
    vehicleType: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    powertrainType: 'EV',
    paymentMethod: 'VIETQR_NAPAS',
    currency: 'VND',
    baseFreightVnd: 1850000,
    greenEsgDiscountVnd: 92500,
    vatAmountVnd: 140600,
    totalAmountVnd: 1898100,
    co2SavedKg: 12.8,
    paymentStatus: 'PAID',
    gatewayProvider: 'NAPAS_VIETQR_247',
    gatewayReference: 'FT263189401822',
    bankCode: 'VCB',
    bankAccountNo: '1038889999',
    qrPayload:
      'VIETQR|BANK=VCB|ACC=1038889999|NAME=CCADRO GREEN LOGISTICS JSC|AMT=1898100|CUR=VND|ADDINFO=CCADRO SHP-2026-8192 PAY-2026-819201',
    payerName: 'Minh Phú & Vinamilk B2B',
    notes: 'Thanh toán VietQR Napas 24/7 kèm ưu đãi cước xanh 5% EV',
    paidAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    dueAt: new Date(Date.now() + 3 * 86400 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    transactionCode: 'PAY-2026-492002',
    invoiceNumber: 'INV-CCADRO-2026-0002',
    shipmentCode: 'SHP-2026-4920',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    createdByUsername: 'customer',
    originName: 'Cảng Cát Lái, TP. Thủ Đức',
    destinationName: 'Cảng Quốc Tế Cái Mép - Thị Vải',
    containerCode: 'MSKU-492011-8',
    vehicleType: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    powertrainType: 'EV',
    paymentMethod: 'VNPAY_QR',
    currency: 'VND',
    baseFreightVnd: 4200000,
    greenEsgDiscountVnd: 210000,
    vatAmountVnd: 319200,
    totalAmountVnd: 4309200,
    co2SavedKg: 38.5,
    paymentStatus: 'PENDING',
    gatewayProvider: 'VNPAY_GATEWAY',
    gatewayReference: 'VNP-INTENT-492002',
    bankCode: 'VCB',
    bankAccountNo: '1038889999',
    qrPayload:
      'VIETQR|BANK=VCB|ACC=1038889999|NAME=CCADRO GREEN LOGISTICS JSC|AMT=4309200|CUR=VND|ADDINFO=CCADRO SHP-2026-4920 PAY-2026-492002',
    payerName: 'Minh Phú & Vinamilk B2B',
    notes: 'Chờ quét mã VNPay QR thanh toán vận đơn Cát Lái → Cái Mép',
    paidAt: null,
    dueAt: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
  },
  {
    transactionCode: 'PAY-2026-305503',
    invoiceNumber: 'INV-CCADRO-2026-0003',
    shipmentCode: 'SHP-2026-3055',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    createdByUsername: 'customer',
    originName: 'KCN Tân Bình, TP.HCM',
    destinationName: 'KCN VSIP 1, Thuận An, Bình Dương',
    containerCode: 'OOLU-305519-2',
    vehicleType: 'Xe tải Hybrid LNG (Low-Carbon)',
    powertrainType: 'LNG',
    paymentMethod: 'GREEN_CREDIT_NET30',
    currency: 'VND',
    baseFreightVnd: 2350000,
    greenEsgDiscountVnd: 70500,
    vatAmountVnd: 182360,
    totalAmountVnd: 2461860,
    co2SavedKg: 16.4,
    paymentStatus: 'NET30_CREDIT',
    gatewayProvider: 'CCADRO_GREEN_CREDIT',
    gatewayReference: 'NET30-2026-3055',
    bankCode: 'VCB',
    bankAccountNo: '1038889999',
    qrPayload:
      'VIETQR|BANK=VCB|ACC=1038889999|NAME=CCADRO GREEN LOGISTICS JSC|AMT=2461860|CUR=VND|ADDINFO=CCADRO SHP-2026-3055 PAY-2026-305503',
    payerName: 'Minh Phú & Vinamilk B2B',
    notes: 'Công nợ Xanh Net-30 đối soát cuối kỳ (ưu đãi 3% LNG)',
    paidAt: null,
    dueAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 86400 * 1000).toISOString()
  }
];

function readLocalPayments() {
  try {
    const raw = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {
    // ignore storage errors
  }
  return DEFAULT_SEED_PAYMENTS;
}

function writeLocalPayments(list) {
  try {
    window.localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore
  }
}

export async function loadCustomerPayments(customerId) {
  const local = readLocalPayments();
  try {
    const res = await api.getPayments(customerId ? { customerId } : {});
    if (Array.isArray(res?.result) && res.result.length > 0) {
      const mergedMap = new Map();
      res.result.forEach((p) => mergedMap.set(p.transactionCode, p));
      local.forEach((p) => {
        if (!mergedMap.has(p.transactionCode)) mergedMap.set(p.transactionCode, p);
      });
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      writeLocalPayments(merged);
      return { payments: merged, source: 'LIVE_DB' };
    }
  } catch (_) {
    // Fallback gracefully to local synced ledger when backend isn't live
  }
  const filtered = customerId
    ? local.filter(
        (p) =>
          p.customerId === customerId ||
          p.createdByUsername === customerId ||
          (customerId === 'DOANH_NGHIEP_B2B' && p.customerId === 'DOANH_NGHIEP_B2B')
      )
    : local;
  return { payments: filtered, source: 'LOCAL_CACHE' };
}

function adjustLocalMsaCredit(customerId, deltaVnd, validateLimit = false) {
  const contracts = readLocalContracts();
  const targetMsa =
    contracts.find(
      (c) =>
        c.contractType === 'MASTER_MSA' &&
        c.contractStatus === 'SIGNED_ACTIVE' &&
        (!customerId || c.customerId === customerId)
    ) || contracts.find((c) => c.contractType === 'MASTER_MSA' && c.contractStatus === 'SIGNED_ACTIVE');

  if (!targetMsa) return;
  const limit = Number(targetMsa.creditLimitVnd || 500000000);
  const currentUsed = Number(targetMsa.usedCreditVnd || 0);
  const nextUsed = Math.max(0, currentUsed + Number(deltaVnd || 0));

  if (validateLimit && deltaVnd > 0 && nextUsed > limit) {
    throw new Error(
      `Vượt hạn mức công nợ Xanh Net-30 (${nextUsed.toLocaleString('vi-VN')} ₫ / ${limit.toLocaleString('vi-VN')} ₫). Vui lòng tất toán các hóa đơn Net-30 trước.`
    );
  }

  const nextContracts = contracts.map((c) => {
    if (c.contractNumber !== targetMsa.contractNumber) return c;
    return {
      ...c,
      usedCreditVnd: nextUsed,
      availableCreditVnd: Math.max(0, limit - nextUsed)
    };
  });
  writeLocalContracts(nextContracts);
}

export async function createCustomerPayment(payload) {
  try {
    const res = await api.createPayment(payload);
    if (res?.result) {
      const next = [
        res.result,
        ...readLocalPayments().filter((p) => p.transactionCode !== res.result.transactionCode)
      ];
      writeLocalPayments(next);
      return { payment: res.result, source: 'LIVE_DB' };
    }
  } catch (err) {
    if (err?.message && err.message.toLowerCase().includes('hạn mức')) {
      throw err;
    }
    // Fallback local deterministic billing creation
  }

  const breakdown = calculateGreenInvoiceBreakdown(payload.baseFreightVnd, payload.powertrainType);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const year = new Date().getFullYear();
  const txCode = `PAY-${year}-${suffix}`;
  const isNet30 = payload.paymentMethod === 'GREEN_CREDIT_NET30';
  if (isNet30) {
    adjustLocalMsaCredit(payload.customerId, breakdown.totalAmountVnd, true);
  }
  const isPaid = Boolean(payload.instantConfirm) && !isNet30;
  const nowIso = new Date().toISOString();

  const localPayment = {
    id: `local-${Date.now()}`,
    transactionCode: txCode,
    invoiceNumber: `INV-CCADRO-${year}-${suffix}`,
    shipmentCode: payload.shipmentCode,
    customerId: payload.customerId,
    customerName: payload.customerName,
    createdByUsername: payload.createdByUsername,
    originName: payload.originName,
    destinationName: payload.destinationName,
    containerCode: payload.containerCode,
    vehicleType: payload.vehicleType,
    powertrainType: payload.powertrainType || 'EV',
    paymentMethod: payload.paymentMethod,
    currency: 'VND',
    baseFreightVnd: breakdown.baseFreightVnd,
    greenEsgDiscountVnd: breakdown.greenEsgDiscountVnd,
    vatAmountVnd: breakdown.vatAmountVnd,
    totalAmountVnd: breakdown.totalAmountVnd,
    co2SavedKg: payload.co2SavedKg || 0,
    paymentStatus: isPaid ? 'PAID' : isNet30 ? 'NET30_CREDIT' : 'PENDING',
    gatewayProvider:
      payload.paymentMethod === 'VIETQR_NAPAS'
        ? 'NAPAS_VIETQR_247'
        : payload.paymentMethod === 'VNPAY_QR'
          ? 'VNPAY_GATEWAY'
          : payload.paymentMethod === 'MOMO_WALLET'
            ? 'MOMO_BUSINESS_WALLET'
            : payload.paymentMethod === 'CORPORATE_CARD'
              ? 'ONEPAY_VISA_MC'
              : 'CCADRO_GREEN_CREDIT',
    gatewayReference: `GW-${suffix}`,
    qrPayload: `VIETQR|BANK=VCB|ACC=1038889999|NAME=CCADRO GREEN LOGISTICS JSC|AMT=${breakdown.totalAmountVnd}|CUR=VND|ADDINFO=CCADRO ${payload.shipmentCode} ${txCode}`,
    bankCode: 'VCB',
    bankAccountNo: '1038889999',
    cardLast4: payload.cardLast4 || null,
    payerName: payload.payerName || payload.customerName,
    notes: payload.notes || 'Hóa đơn dịch vụ vận tải xanh CCADRO',
    paidAt: isPaid ? nowIso : null,
    dueAt: new Date(Date.now() + (isNet30 ? 30 : 3) * 86400 * 1000).toISOString(),
    createdAt: nowIso
  };

  const updated = [localPayment, ...readLocalPayments()];
  writeLocalPayments(updated);
  return { payment: localPayment, source: 'LOCAL_CACHE' };
}

export async function confirmCustomerPayment(transactionCode, payload = {}) {
  try {
    const res = await api.confirmPayment(transactionCode, payload);
    if (res?.result) {
      const updated = readLocalPayments().map((p) =>
        p.transactionCode === transactionCode ? res.result : p
      );
      writeLocalPayments(updated);
      return { payment: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // Fallback local capture
  }

  let matched = null;
  let wasNet30 = false;
  const updated = readLocalPayments().map((p) => {
    if (p.transactionCode !== transactionCode) return p;
    wasNet30 = p.paymentStatus === 'NET30_CREDIT';
    matched = {
      ...p,
      paymentMethod: payload.paymentMethod || p.paymentMethod,
      paymentStatus: 'PAID',
      gatewayReference: payload.gatewayReference || `FT${Date.now().toString().slice(-8)}`,
      payerName: payload.payerName || p.payerName,
      cardLast4: payload.cardLast4 || p.cardLast4,
      notes: payload.notes || 'Đã xác nhận thanh toán hoàn tất trên Customer Portal',
      paidAt: new Date().toISOString()
    };
    return matched;
  });
  writeLocalPayments(updated);
  if (wasNet30 && matched) {
    adjustLocalMsaCredit(matched.customerId, -Number(matched.totalAmountVnd || 0), false);
  }
  return { payment: matched, source: 'LOCAL_CACHE' };
}
export async function triggerWebhookPaymentConfirm(provider, payload) {
  try {
    const res = await api.simulatePaymentWebhook(provider, payload);
    if (res?.result) {
      const updated = readLocalPayments().map((p) =>
        p.transactionCode === res.result.transactionCode ? res.result : p
      );
      writeLocalPayments(updated);
      return { payment: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // Fallback local webhook capture when backend is offline
  }

  return confirmCustomerPayment(payload.transactionCode, {
    gatewayReference: payload.gatewayReference || `WH-${provider}-${Date.now().toString().slice(-6)}`,
    payerName: payload.payerName,
    notes: `Xác nhận tự động qua Webhook ${provider}`
  });
}

// ══════════════════════════════════════════════════════════════════════════
// B2B CONTRACTS (MASTER MSA & SPOT TRIP) & SLA SETTLEMENT SYNC
// ══════════════════════════════════════════════════════════════════════════

const CONTRACT_STORAGE_KEY = 'ccadro_b2b_contracts_v1';
const CONTRACT_EVENTS_STORAGE_KEY = 'ccadro_contract_sla_events_v1';

export const CONTRACT_STATUS_META = {
  DRAFT: { label: 'Dự thảo chờ ký', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  SIGNED_ACTIVE: { label: 'Đã ký số • Hiệu lực', color: '#10b981', bg: 'rgba(16, 185, 129, 0.14)' },
  SETTLED: { label: 'Đã nghiệm thu ePOD & Chốt SLA', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  CANCELLED: { label: 'Đã hủy', color: '#f87171', bg: 'rgba(248, 113, 113, 0.14)' }
};

const DEFAULT_SEED_CONTRACTS = [
  {
    contractNumber: 'HDK-CCADRO-2026-0001',
    contractType: 'MASTER_MSA',
    parentContractNumber: null,
    shipmentCode: null,
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    signedByCustomerUser: 'customer',
    customerSignatureHash: 'SHA256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    providerName: 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridorScope: 'Toàn tuyến Miền Nam (Cát Lái • Cái Mép • VSIP • Sóng Thần • Tân Bình)',
    containerCode: null,
    eSealNumber: null,
    vehicleType: 'Đội xe EV 40T & Hybrid LNG chuẩn GLEC v3',
    licensePlate: null,
    slaOnTimeRatePct: 98.5,
    slaMaxTempDeviationC: 2.0,
    slaPenaltyPctPerBreach: 5.0,
    minCo2ReductionKg: 500.0,
    creditLimitVnd: 500000000,
    usedCreditVnd: 2461860,
    availableCreditVnd: 497538140,
    contractValueVnd: 500000000,
    slaPenaltyDeductionVnd: 0,
    finalSettlementVnd: 0,
    paymentTerms: 'NET30',
    contractStatus: 'SIGNED_ACTIVE',
    effectiveFrom: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    effectiveTo: new Date(Date.now() + 335 * 86400 * 1000).toISOString(),
    signedAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    notes: 'Hợp đồng nguyên tắc vận tải xanh B2B: Ưu đãi 5% EV, 3% LNG, hạn mức tín dụng Net-30 500 triệu VNĐ',
    createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString()
  },
  {
    contractNumber: 'HD-SHP-2026-8192',
    contractType: 'SPOT_TRIP',
    parentContractNumber: 'HDK-CCADRO-2026-0001',
    shipmentCode: 'SHP-2026-8192',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    signedByCustomerUser: 'customer',
    customerSignatureHash: 'SHA256:4a7d1ed414474e4033ac29ccb8653d9b4a7d1ed414474e4033ac29ccb8653d9b',
    providerName: 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridorScope: 'Cảng Cát Lái, TP. Thủ Đức → ICD Sóng Thần, Dĩ An, Bình Dương (18.6 km)',
    containerCode: 'TCKU-781920-4',
    eSealNumber: 'VN-CUST-819204',
    vehicleType: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    licensePlate: '51C-888.99',
    slaOnTimeRatePct: 98.5,
    slaMaxTempDeviationC: 2.0,
    slaPenaltyPctPerBreach: 5.0,
    minCo2ReductionKg: 12.8,
    creditLimitVnd: 500000000,
    usedCreditVnd: 0,
    contractValueVnd: 1850000,
    slaPenaltyDeductionVnd: 0,
    finalSettlementVnd: 1850000,
    paymentTerms: 'PREPAID',
    contractStatus: 'SIGNED_ACTIVE',
    signedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    notes: 'Hợp đồng chuyến lạnh -18°C chuẩn ISO 17712 • Đã quyết toán VietQR',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    contractNumber: 'HD-SHP-2026-4920',
    contractType: 'SPOT_TRIP',
    parentContractNumber: 'HDK-CCADRO-2026-0001',
    shipmentCode: 'SHP-2026-4920',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    signedByCustomerUser: 'customer',
    customerSignatureHash: 'SHA256:7c222fb2927d828af22f592134e8932480637c0d7c222fb2927d828af22f5921',
    providerName: 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridorScope: 'Cảng Cát Lái, TP. Thủ Đức → Cảng Quốc Tế Cái Mép - Thị Vải (67.4 km)',
    containerCode: 'MSKU-492011-8',
    eSealNumber: 'VN-CUST-492011',
    vehicleType: 'Xe đầu kéo điện (EV) • Heavy-Duty BEV',
    licensePlate: '51C-772.18',
    slaOnTimeRatePct: 98.5,
    slaMaxTempDeviationC: 2.0,
    slaPenaltyPctPerBreach: 5.0,
    minCo2ReductionKg: 38.5,
    creditLimitVnd: 500000000,
    usedCreditVnd: 0,
    contractValueVnd: 4200000,
    slaPenaltyDeductionVnd: 0,
    finalSettlementVnd: 4200000,
    paymentTerms: 'PREPAID',
    contractStatus: 'SIGNED_ACTIVE',
    signedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    notes: 'Hợp đồng chuyến linh kiện điện tử • Đang chờ quét VNPay QR',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
  },
  {
    contractNumber: 'HD-SHP-2026-3055',
    contractType: 'SPOT_TRIP',
    parentContractNumber: 'HDK-CCADRO-2026-0001',
    shipmentCode: 'SHP-2026-3055',
    customerId: 'DOANH_NGHIEP_B2B',
    customerName: 'Vinamilk Logistics Hub',
    signedByCustomerUser: 'customer',
    customerSignatureHash: 'SHA256:356a192b7913b04c54574d18c28d46e6395428ab356a192b7913b04c54574d18',
    providerName: 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridorScope: 'KCN Tân Bình, TP.HCM → KCN VSIP 1, Thuận An, Bình Dương (24.2 km)',
    containerCode: 'OOLU-305519-2',
    eSealNumber: 'VN-CUST-305519',
    vehicleType: 'Xe tải Hybrid LNG (Low-Carbon)',
    licensePlate: '51D-603.44',
    slaOnTimeRatePct: 98.5,
    slaMaxTempDeviationC: 2.0,
    slaPenaltyPctPerBreach: 5.0,
    minCo2ReductionKg: 16.4,
    creditLimitVnd: 500000000,
    usedCreditVnd: 2461860,
    contractValueVnd: 2350000,
    slaPenaltyDeductionVnd: 0,
    finalSettlementVnd: 2350000,
    paymentTerms: 'NET30',
    contractStatus: 'SIGNED_ACTIVE',
    signedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    notes: 'Hợp đồng chuyến công nợ Xanh Net-30 theo MSA HDK-CCADRO-2026-0001',
    createdAt: new Date(Date.now() - 86400 * 1000).toISOString()
  }
];

const DEFAULT_SEED_CONTRACT_EVENTS = {
  'HDK-CCADRO-2026-0001': [
    {
      id: 'ev-msa-1',
      contractNumber: 'HDK-CCADRO-2026-0001',
      eventType: 'SIGNED',
      severity: 'INFO',
      penaltyAmountVnd: 0,
      recordedBy: 'customer',
      description: 'Ký số điện tử Hợp đồng khung MSA hạn mức Net-30 500.000.000 VNĐ',
      createdAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    }
  ],
  'HD-SHP-2026-8192': [
    {
      id: 'ev-8192-1',
      contractNumber: 'HD-SHP-2026-8192',
      shipmentCode: 'SHP-2026-8192',
      eventType: 'SIGNED',
      severity: 'INFO',
      penaltyAmountVnd: 0,
      recordedBy: 'customer',
      description: 'Ký hợp đồng chuyến điện tử HD-SHP-2026-8192 (Cont TCKU-781920-4)',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    }
  ],
  'HD-SHP-2026-4920': [
    {
      id: 'ev-4920-1',
      contractNumber: 'HD-SHP-2026-4920',
      shipmentCode: 'SHP-2026-4920',
      eventType: 'SIGNED',
      severity: 'INFO',
      penaltyAmountVnd: 0,
      recordedBy: 'customer',
      description: 'Ký hợp đồng chuyến điện tử HD-SHP-2026-4920 (Cont MSKU-492011-8)',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
    }
  ],
  'HD-SHP-2026-3055': [
    {
      id: 'ev-3055-1',
      contractNumber: 'HD-SHP-2026-3055',
      shipmentCode: 'SHP-2026-3055',
      eventType: 'SIGNED',
      severity: 'INFO',
      penaltyAmountVnd: 0,
      recordedBy: 'customer',
      description: 'Ký hợp đồng chuyến công nợ Net-30 HD-SHP-2026-3055',
      createdAt: new Date(Date.now() - 86400 * 1000).toISOString()
    }
  ]
};

function readLocalContracts() {
  try {
    const raw = window.localStorage.getItem(CONTRACT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {
    // ignore
  }
  return DEFAULT_SEED_CONTRACTS;
}

function writeLocalContracts(list) {
  try {
    window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    // ignore
  }
}

function readLocalContractEventsMap() {
  try {
    const raw = window.localStorage.getItem(CONTRACT_EVENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_) {
    // ignore
  }
  return DEFAULT_SEED_CONTRACT_EVENTS;
}

function appendLocalContractEvent(contractNumber, eventItem) {
  const map = readLocalContractEventsMap();
  const prev = Array.isArray(map[contractNumber]) ? map[contractNumber] : [];
  map[contractNumber] = [eventItem, ...prev];
  try {
    window.localStorage.setItem(CONTRACT_EVENTS_STORAGE_KEY, JSON.stringify(map));
  } catch (_) {
    // ignore
  }
  return map[contractNumber];
}

function buildPseudoSha256(seed) {
  let acc = '';
  let h = 0x811c9dc5;
  for (let round = 0; round < 8; round += 1) {
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i) + round * 17;
      h = Math.imul(h, 0x01000193);
    }
    acc += (h >>> 0).toString(16).padStart(8, '0');
  }
  return `SHA256:${acc}`;
}

export async function loadCustomerContracts(customerId) {
  const local = readLocalContracts();
  try {
    const res = await api.getContracts(customerId ? { customerId } : {});
    if (Array.isArray(res?.result) && res.result.length > 0) {
      const mergedMap = new Map();
      res.result.forEach((c) => mergedMap.set(c.contractNumber, c));
      local.forEach((c) => {
        if (!mergedMap.has(c.contractNumber)) mergedMap.set(c.contractNumber, c);
      });
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      writeLocalContracts(merged);
      return { contracts: merged, source: 'LIVE_DB' };
    }
  } catch (_) {
    // offline fallback
  }
  const filtered = customerId
    ? local.filter(
        (c) => c.customerId === customerId || (customerId === 'DOANH_NGHIEP_B2B' && c.customerId === 'DOANH_NGHIEP_B2B')
      )
    : local;
  return { contracts: filtered, source: 'LOCAL_CACHE' };
}

export async function loadContractSlaEvents(contractNumber) {
  try {
    const res = await api.getContractEvents(contractNumber);
    if (Array.isArray(res?.result)) {
      return res.result;
    }
  } catch (_) {
    // fallback local events
  }
  const map = readLocalContractEventsMap();
  return Array.isArray(map[contractNumber]) ? map[contractNumber] : [];
}

export async function createCustomerContract(payload) {
  try {
    const res = await api.createContract(payload);
    if (res?.result) {
      const next = [
        res.result,
        ...readLocalContracts().filter((c) => c.contractNumber !== res.result.contractNumber)
      ];
      writeLocalContracts(next);
      return { contract: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // fallback local creation
  }

  const contracts = readLocalContracts();
  const isMsa = payload.contractType === 'MASTER_MSA';
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const contractNumber = isMsa
    ? `HDK-CCADRO-${year}-${suffix}`
    : payload.shipmentCode
      ? `HD-${payload.shipmentCode}`
      : `HD-${year}-${suffix}`;
  const activeMsa = contracts.find(
    (c) => c.contractType === 'MASTER_MSA' && c.contractStatus === 'SIGNED_ACTIVE'
  );
  const autoSign = Boolean(payload.autoSign);
  const nowIso = new Date().toISOString();
  const valueVnd = Number(payload.contractValueVnd || 0);
  const limitVnd = Number(payload.creditLimitVnd || 500000000);

  const localContract = {
    id: `local-contract-${Date.now()}`,
    contractNumber,
    contractType: isMsa ? 'MASTER_MSA' : 'SPOT_TRIP',
    parentContractNumber: !isMsa ? payload.parentContractNumber || activeMsa?.contractNumber || null : null,
    shipmentCode: payload.shipmentCode || null,
    customerId: payload.customerId,
    customerName: payload.customerName,
    signedByCustomerUser: autoSign ? payload.signedByCustomerUser || payload.customerId : null,
    customerSignatureHash: autoSign ? buildPseudoSha256(`${contractNumber}|${nowIso}`) : null,
    providerName: 'CCADRO GREEN LOGISTICS ALLIANCE',
    corridorScope: payload.corridorScope || 'Tuyến vận tải xanh Miền Nam',
    containerCode: payload.containerCode || null,
    eSealNumber: payload.eSealNumber || null,
    vehicleType: payload.vehicleType || 'Đội xe EV 40T chuẩn GLEC v3',
    licensePlate: payload.licensePlate || null,
    slaOnTimeRatePct: Number(payload.slaOnTimeRatePct ?? 98.5),
    slaMaxTempDeviationC: Number(payload.slaMaxTempDeviationC ?? 2.0),
    slaPenaltyPctPerBreach: Number(payload.slaPenaltyPctPerBreach ?? 5.0),
    minCo2ReductionKg: Number(payload.minCo2ReductionKg ?? 0),
    creditLimitVnd: limitVnd,
    usedCreditVnd: 0,
    availableCreditVnd: limitVnd,
    contractValueVnd: valueVnd,
    slaPenaltyDeductionVnd: 0,
    finalSettlementVnd: valueVnd,
    paymentTerms: (payload.paymentTerms || 'NET30').toUpperCase(),
    contractStatus: autoSign ? 'SIGNED_ACTIVE' : 'DRAFT',
    effectiveFrom: nowIso,
    effectiveTo: new Date(Date.now() + (isMsa ? 365 : 30) * 86400 * 1000).toISOString(),
    signedAt: autoSign ? nowIso : null,
    settledAt: null,
    notes: payload.notes || 'Hợp đồng điện tử B2B CCADRO',
    createdAt: nowIso
  };

  writeLocalContracts([localContract, ...contracts]);
  appendLocalContractEvent(contractNumber, {
    id: `ev-${Date.now()}`,
    contractNumber,
    shipmentCode: payload.shipmentCode || null,
    eventType: autoSign ? 'SIGNED' : 'CREATED',
    severity: 'INFO',
    penaltyAmountVnd: 0,
    recordedBy: payload.signedByCustomerUser || payload.customerId,
    description: autoSign
      ? `Khởi tạo & ký số hợp đồng ${contractNumber}`
      : `Khởi tạo dự thảo hợp đồng ${contractNumber}`,
    createdAt: nowIso
  });

  return { contract: localContract, source: 'LOCAL_CACHE' };
}

export async function signCustomerContract(contractNumber, payload = {}) {
  try {
    const res = await api.signContract(contractNumber, payload);
    if (res?.result) {
      const updated = readLocalContracts().map((c) =>
        c.contractNumber === contractNumber ? res.result : c
      );
      writeLocalContracts(updated);
      return { contract: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // fallback local signing
  }

  const nowIso = new Date().toISOString();
  const signer = payload.signedByUsername || 'customer';
  const sigHash = buildPseudoSha256(`${contractNumber}|${signer}|${nowIso}`);
  let matched = null;

  const updated = readLocalContracts().map((c) => {
    if (c.contractNumber !== contractNumber) return c;
    matched = {
      ...c,
      signedByCustomerUser: signer,
      customerSignatureHash: sigHash,
      contractStatus: 'SIGNED_ACTIVE',
      signedAt: nowIso,
      notes: payload.notes || c.notes
    };
    return matched;
  });
  writeLocalContracts(updated);
  appendLocalContractEvent(contractNumber, {
    id: `ev-sign-${Date.now()}`,
    contractNumber,
    shipmentCode: matched?.shipmentCode || null,
    eventType: 'SIGNED',
    severity: 'INFO',
    penaltyAmountVnd: 0,
    recordedBy: signer,
    description: `Ký số xác nhận hợp đồng (${sigHash.slice(0, 22)}...)`,
    createdAt: nowIso
  });
  return { contract: matched, source: 'LOCAL_CACHE' };
}

export async function recordCustomerSlaEvent(contractNumber, payload) {
  try {
    const res = await api.recordContractSlaEvent(contractNumber, payload);
    if (res?.result) {
      const updated = readLocalContracts().map((c) =>
        c.contractNumber === contractNumber ? res.result : c
      );
      writeLocalContracts(updated);
      return { contract: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // fallback local SLA calculation
  }

  const evType = String(payload.eventType || 'SLA_ON_TIME_OK').toUpperCase();
  const isBreach = evType.includes('BREACH') || evType.includes('DEVIATION');
  let matched = null;
  let penalty = 0;

  const updated = readLocalContracts().map((c) => {
    if (c.contractNumber !== contractNumber) return c;
    if (isBreach) {
      penalty = payload.penaltyAmountVnd
        ? Number(payload.penaltyAmountVnd)
        : Math.round(Number(c.contractValueVnd || 0) * ((c.slaPenaltyPctPerBreach || 5) / 100));
    }
    const nextDeduction = Math.min(
      Number(c.contractValueVnd || 0),
      Number(c.slaPenaltyDeductionVnd || 0) + penalty
    );
    matched = {
      ...c,
      slaPenaltyDeductionVnd: nextDeduction,
      finalSettlementVnd: Math.max(0, Number(c.contractValueVnd || 0) - nextDeduction)
    };
    return matched;
  });
  writeLocalContracts(updated);
  appendLocalContractEvent(contractNumber, {
    id: `ev-sla-${Date.now()}`,
    contractNumber,
    shipmentCode: matched?.shipmentCode || null,
    eventType: evType,
    severity: isBreach ? 'BREACH' : 'INFO',
    penaltyAmountVnd: penalty,
    recordedBy: payload.recordedBy || 'TELEMETRY_MONITOR',
    description:
      payload.description ||
      (isBreach
        ? `Vi phạm SLA (${evType}) — giảm trừ ${penalty.toLocaleString('vi-VN')} ₫`
        : 'Đạt chuẩn SLA hành trình & nhiệt độ'),
    createdAt: new Date().toISOString()
  });
  return { contract: matched, source: 'LOCAL_CACHE' };
}

export async function settleCustomerContractWithEpod(contractNumber, payload = {}) {
  try {
    const res = await api.settleContractWithEpod(contractNumber, payload);
    if (res?.result) {
      const updated = readLocalContracts().map((c) =>
        c.contractNumber === contractNumber ? res.result : c
      );
      writeLocalContracts(updated);
      return { contract: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // fallback local ePOD settlement + sync linked unpaid payment
  }

  const nowIso = new Date().toISOString();
  const signer = payload.epodSignerName || 'Khách hàng B2B';
  let matched = null;

  const updatedContracts = readLocalContracts().map((c) => {
    if (c.contractNumber !== contractNumber) return c;
    const settledVal = Math.max(
      0,
      Number(c.contractValueVnd || 0) - Number(c.slaPenaltyDeductionVnd || 0)
    );
    matched = {
      ...c,
      finalSettlementVnd: settledVal,
      contractStatus: 'SETTLED',
      settledAt: nowIso,
      notes: payload.notes || c.notes
    };
    return matched;
  });
  writeLocalContracts(updatedContracts);

  if (matched?.shipmentCode) {
    const deduction = Number(matched.slaPenaltyDeductionVnd || 0);
    let net30Delta = 0;
    const updatedPayments = readLocalPayments().map((tx) => {
      if (
        tx.shipmentCode !== matched.shipmentCode ||
        tx.paymentStatus === 'PAID' ||
        tx.paymentStatus === 'REFUNDED'
      ) {
        return tx;
      }
      const prevTotal = Number(tx.totalAmountVnd || 0);
      const netBase = Math.max(0, Number(tx.baseFreightVnd || 0) - deduction);
      const esgDiscount = Math.min(Number(tx.greenEsgDiscountVnd || 0), netBase);
      const taxable = Math.max(0, netBase - esgDiscount);
      const vat = Math.round(taxable * 0.08);
      const nextTotal = taxable + vat;
      if (tx.paymentStatus === 'NET30_CREDIT') {
        net30Delta += nextTotal - prevTotal;
      }
      return {
        ...tx,
        vatAmountVnd: vat,
        totalAmountVnd: nextTotal,
        notes: `Đã chốt ePOD & đối soát hợp đồng ${contractNumber}${
          deduction > 0 ? ` (giảm trừ SLA ${deduction.toLocaleString('vi-VN')} ₫)` : ''
        }`
      };
    });
    writeLocalPayments(updatedPayments);
    if (net30Delta !== 0) {
      adjustLocalMsaCredit(matched.customerId, net30Delta, false);
    }
  }

  appendLocalContractEvent(contractNumber, {
    id: `ev-settle-${Date.now()}`,
    contractNumber,
    shipmentCode: matched?.shipmentCode || null,
    eventType: 'SETTLED',
    severity: 'INFO',
    penaltyAmountVnd: 0,
    recordedBy: signer,
    description: `Nghiệm thu ePOD & chốt đối soát hợp đồng (${Number(
      matched?.finalSettlementVnd || 0
    ).toLocaleString('vi-VN')} ₫)`,
    createdAt: nowIso
  });

  return { contract: matched, source: 'LOCAL_CACHE' };
}

export async function refundCustomerPayment(transactionCode, reason, actor) {
  try {
    const res = await api.refundPayment(transactionCode, { reason, actor });
    if (res?.result) {
      const updated = readLocalPayments().map((p) =>
        p.transactionCode === transactionCode ? res.result : p
      );
      writeLocalPayments(updated);
      return { payment: res.result, source: 'LIVE_DB' };
    }
  } catch (_) {
    // Fallback local refund
  }

  let matched = null;
  let wasNet30 = false;
  const updated = readLocalPayments().map((p) => {
    if (p.transactionCode !== transactionCode) return p;
    wasNet30 = p.paymentStatus === 'NET30_CREDIT';
    matched = {
      ...p,
      paymentStatus: 'REFUNDED',
      notes: reason || 'Khách hàng yêu cầu hoàn tiền / hủy hóa đơn',
      updatedAt: new Date().toISOString()
    };
    return matched;
  });
  writeLocalPayments(updated);
  if (wasNet30 && matched) {
    adjustLocalMsaCredit(matched.customerId, -Number(matched.totalAmountVnd || 0), false);
  }
  return { payment: matched, source: 'LOCAL_CACHE' };
}



