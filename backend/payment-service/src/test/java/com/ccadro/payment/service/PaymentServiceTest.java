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

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        PaymentProperties props = new PaymentProperties();
        props.setVatRate(0.08);
        props.setEvGreenDiscountRate(0.05);
        props.setLngGreenDiscountRate(0.03);
        props.setWebhookSecret("ccadro-test-webhook-secret");
        paymentService = new PaymentService(transactionRepository, auditLogRepository, contractRepository, props);
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
        badSig.setSignature("wrong-secret");
        assertThrows(AppException.class, () -> paymentService.processWebhookCallback("VNPAY", badSig));

        PaymentWebhookCallbackRequest goodSig = new PaymentWebhookCallbackRequest();
        goodSig.setTransactionCode("PAY-WH-01");
        goodSig.setSignature("ccadro-test-webhook-secret");
        goodSig.setGatewayReference("VNP-HOOK-7788");
        PaymentTransactionResponse settled = paymentService.processWebhookCallback("VNPAY", goodSig);
        assertEquals("PAID", settled.getPaymentStatus());
        assertEquals("VNP-HOOK-7788", settled.getGatewayReference());
    }
}
