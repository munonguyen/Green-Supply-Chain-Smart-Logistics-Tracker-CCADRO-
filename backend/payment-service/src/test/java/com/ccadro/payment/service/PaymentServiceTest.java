package com.ccadro.payment.service;

import com.ccadro.payment.configuration.PaymentProperties;
import com.ccadro.payment.dto.request.ConfirmPaymentRequest;
import com.ccadro.payment.dto.request.CreatePaymentRequest;
import com.ccadro.payment.dto.request.PaymentWebhookCallbackRequest;
import com.ccadro.payment.dto.request.RefundPaymentRequest;
import com.ccadro.payment.dto.response.PaymentTransactionResponse;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.PaymentAuditLog;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.exception.AppException;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.PaymentAuditLogRepository;
import com.ccadro.payment.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentTransactionRepository transactionRepository;

    @Mock
    private PaymentAuditLogRepository auditLogRepository;

    @Mock
    private B2bContractRepository contractRepository;

    @Mock private PaymentEvidenceService evidenceService;
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        PaymentProperties props = new PaymentProperties();
        props.setVatRate(0.08);
        props.setEvGreenDiscountRate(0.05);
        props.setLngGreenDiscountRate(0.03);
        props.setWebhookSecret("ccadro-test-webhook-secret");
        paymentService = new PaymentService(org.mapstruct.factory.Mappers.getMapper(com.ccadro.payment.mapper.PaymentMapper.class), transactionRepository, auditLogRepository, contractRepository, props, evidenceService);
    }

    @Test
    void createPayment_appliesEvDiscountAndVatCorrectly() {
        when(transactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(UUID.randomUUID());
            return tx;
        });
        when(auditLogRepository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatePaymentRequest req = new CreatePaymentRequest();
        req.setShipmentCode("SHP-2026-9901");
        req.setCustomerId("DOANH_NGHIEP_B2B");
        req.setPaymentMethod("VIETQR_NAPAS");
        req.setPowertrainType("EV");
        req.setBaseFreightVnd(2_000_000L);

        PaymentTransactionResponse res = paymentService.createPayment(req);

        assertEquals(100_000L, res.getGreenEsgDiscountVnd());
        assertEquals(152_000L, res.getVatAmountVnd());
        assertEquals(2_052_000L, res.getTotalAmountVnd());
        assertEquals("PENDING", res.getPaymentStatus());
        assertTrue(res.getQrPayload().contains("VIETQR|BANK=VCB"));
        verify(auditLogRepository, times(1)).save(any(PaymentAuditLog.class));
    }

    @Test
    void confirmAndRefundPayment_transitionsLifecycleCleanly() {
        PaymentTransaction existing = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionCode("PAY-2026-TEST01")
                .invoiceNumber("INV-CCADRO-2026-TEST01")
                .shipmentCode("SHP-2026-9902")
                .customerId("DOANH_NGHIEP_B2B")
                .paymentMethod("VNPAY_QR")
                .baseFreightVnd(1_000_000L)
                .greenEsgDiscountVnd(50_000L)
                .vatAmountVnd(76_000L)
                .totalAmountVnd(1_026_000L)
                .paymentStatus("PENDING")
                .build();

        when(transactionRepository.findByTransactionCode("PAY-2026-TEST01")).thenReturn(Optional.of(existing));
        when(transactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditLogRepository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        ConfirmPaymentRequest confirmReq = new ConfirmPaymentRequest();
        confirmReq.setGatewayReference("VNP998877");
        PaymentTransactionResponse paid = paymentService.confirmPayment("PAY-2026-TEST01", confirmReq);
        assertEquals("PAID", paid.getPaymentStatus());
        assertNotNull(paid.getPaidAt());
        verify(evidenceService).capture(existing);

        assertThrows(AppException.class, () -> paymentService.confirmPayment("PAY-2026-TEST01", confirmReq));

        RefundPaymentRequest refundReq = new RefundPaymentRequest();
        refundReq.setReason("Đổi lịch vận chuyển");
        PaymentTransactionResponse refunded = paymentService.refundPayment("PAY-2026-TEST01", refundReq);
        assertEquals("REFUNDED", refunded.getPaymentStatus());
    }

    @Test
    void net30Payment_enforcesMsaCreditLimit_andWebhookVerifiesSecret() {
        B2bContract msa = B2bContract.builder()
                .contractNumber("HDK-CCADRO-2026-0001")
                .contractType("MASTER_MSA")
                .customerId("DOANH_NGHIEP_B2B")
                .creditLimitVnd(2_000_000L)
                .usedCreditVnd(1_500_000L)
                .contractStatus("SIGNED_ACTIVE")
                .build();

        when(contractRepository.findTopByCustomerIdAndContractTypeAndContractStatusOrderByCreatedAtDesc(
                "DOANH_NGHIEP_B2B", "MASTER_MSA", "SIGNED_ACTIVE"
        )).thenReturn(Optional.of(msa));

        CreatePaymentRequest overLimit = new CreatePaymentRequest();
        overLimit.setShipmentCode("SHP-OVER");
        overLimit.setCustomerId("DOANH_NGHIEP_B2B");
        overLimit.setPaymentMethod("GREEN_CREDIT_NET30");
        overLimit.setBaseFreightVnd(1_000_000L);

        assertThrows(AppException.class, () -> paymentService.createPayment(overLimit));

        PaymentTransaction pendingTx = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionCode("PAY-WH-01")
                .invoiceNumber("INV-WH-01")
                .shipmentCode("SHP-WH-01")
                .customerId("DOANH_NGHIEP_B2B")
                .paymentMethod("VNPAY_QR")
                .baseFreightVnd(1_000_000L)
                .greenEsgDiscountVnd(50_000L)
                .vatAmountVnd(76_000L)
                .totalAmountVnd(1_026_000L)
                .paymentStatus("PENDING")
                .build();
        when(transactionRepository.findByTransactionCode("PAY-WH-01")).thenReturn(Optional.of(pendingTx));
        when(transactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditLogRepository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentWebhookCallbackRequest badSig = new PaymentWebhookCallbackRequest();
        badSig.setTransactionCode("PAY-WH-01");
        badSig.setSignature("ccadro-test-webhook-secret"); // Raw static secret without HMAC must be rejected
        assertThrows(AppException.class, () -> paymentService.processWebhookCallback("VNPAY", badSig));

        String validHmac = PaymentService.hmacHex("HmacSHA256", "ccadro-test-webhook-secret", "PAY-WH-01|1026000");

        PaymentWebhookCallbackRequest tamperedAmount = new PaymentWebhookCallbackRequest();
        tamperedAmount.setTransactionCode("PAY-WH-01");
        tamperedAmount.setPaidAmountVnd(1L);
        tamperedAmount.setSignature(PaymentService.hmacHex("HmacSHA256", "ccadro-test-webhook-secret", "PAY-WH-01|1"));
        assertThrows(AppException.class, () -> paymentService.processWebhookCallback("VNPAY", tamperedAmount));

        PaymentWebhookCallbackRequest goodSig = new PaymentWebhookCallbackRequest();
        goodSig.setTransactionCode("PAY-WH-01");
        goodSig.setPaidAmountVnd(1_026_000L);
        goodSig.setSignature(validHmac);
        goodSig.setGatewayReference("VNP-HOOK-7788");
        PaymentTransactionResponse settled = paymentService.processWebhookCallback("VNPAY", goodSig);
        assertEquals("PAID", settled.getPaymentStatus());
        assertEquals("VNP-HOOK-7788", settled.getGatewayReference());
        paymentService.processWebhookCallback("VNPAY", goodSig);
        verify(evidenceService, times(1)).capture(pendingTx);
    }

    @Test
    void hmacSha256Webhook_andVnpayHmacSha512CheckoutSession_workEndToEnd() {
        PaymentTransaction pendingTx = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionCode("PAY-HMAC-01")
                .invoiceNumber("INV-HMAC-01")
                .shipmentCode("SHP-HMAC-01")
                .customerId("DOANH_NGHIEP_B2B")
                .paymentMethod("VNPAY_QR")
                .baseFreightVnd(2_000_000L)
                .greenEsgDiscountVnd(100_000L)
                .vatAmountVnd(152_000L)
                .totalAmountVnd(2_052_000L)
                .qrPayload("VIETQR|BANK=VCB")
                .paymentStatus("PENDING")
                .build();

        when(transactionRepository.findByTransactionCode("PAY-HMAC-01")).thenReturn(Optional.of(pendingTx));

        // 1. Without VNPay keys -> SANDBOX checkout session
        var sandboxSession = paymentService.createCheckoutSession("PAY-HMAC-01", "VNPAY");
        assertEquals("SANDBOX", sandboxSession.get("mode"));
        assertEquals("PAY-HMAC-01", sandboxSession.get("transactionCode"));

        // 2. With VNPay keys -> signed HMAC-SHA512 checkout URL
        PaymentProperties liveProps = new PaymentProperties();
        liveProps.setWebhookSecret("ccadro-test-webhook-secret");
        liveProps.setVnpayTmnCode("CCADRO01");
        liveProps.setVnpayHashSecret("VNPAYSECRET123456");
        liveProps.setVnpayPayUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        liveProps.setVnpayReturnUrl("http://localhost:5173/customer");

        PaymentService liveService = new PaymentService(org.mapstruct.factory.Mappers.getMapper(com.ccadro.payment.mapper.PaymentMapper.class), transactionRepository, auditLogRepository, contractRepository, liveProps, evidenceService);
        var liveSession = liveService.createCheckoutSession("PAY-HMAC-01", "VNPAY");
        assertEquals("LIVE_SIGNED_URL", liveSession.get("mode"));
        String checkoutUrl = String.valueOf(liveSession.get("checkoutUrl"));
        assertTrue(checkoutUrl.contains("vnp_TmnCode=CCADRO01"));
        assertTrue(checkoutUrl.contains("vnp_SecureHash="));

        // 3. Cryptographic HMAC-SHA256 webhook verification
        when(transactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(auditLogRepository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        String expectedHmac = PaymentService.hmacHex("HmacSHA256", "ccadro-test-webhook-secret", "PAY-HMAC-01|2052000");
        PaymentWebhookCallbackRequest hmacReq = new PaymentWebhookCallbackRequest();
        hmacReq.setTransactionCode("PAY-HMAC-01");
        hmacReq.setPaidAmountVnd(2_052_000L);
        hmacReq.setSignature(expectedHmac);
        hmacReq.setGatewayReference("VNPAY-LIVE-999");

        PaymentTransactionResponse settled = liveService.processWebhookCallback("VNPAY", hmacReq);
        assertEquals("PAID", settled.getPaymentStatus());
        assertEquals("VNPAY-LIVE-999", settled.getGatewayReference());
    }
}
