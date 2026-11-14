package com.ccadro.payment.service;

import com.ccadro.payment.configuration.PaymentProperties;
import com.ccadro.payment.dto.request.CreateContractRequest;
import com.ccadro.payment.dto.request.RecordSlaEventRequest;
import com.ccadro.payment.dto.request.SettleContractRequest;
import com.ccadro.payment.dto.request.SignContractRequest;
import com.ccadro.payment.dto.response.B2bContractResponse;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.ContractSlaEvent;
import com.ccadro.payment.entity.PaymentAuditLog;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.ContractSlaEventRepository;
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
class ContractServiceTest {

    @Mock
    private B2bContractRepository contractRepository;

    @Mock
    private ContractSlaEventRepository slaEventRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private PaymentAuditLogRepository paymentAuditLogRepository;

    private ContractService contractService;

    @BeforeEach
    void setUp() {
        PaymentProperties props = new PaymentProperties();
        props.setVatRate(0.08);
        contractService = new ContractService(
                contractRepository,
                slaEventRepository,
                paymentTransactionRepository,
                paymentAuditLogRepository,
                props
        );
    }

    @Test
    void contractLifecycle_signRecordSlaPenaltyAndSettleAdjustsPayment() {
        when(contractRepository.save(any(B2bContract.class))).thenAnswer(inv -> {
            B2bContract c = inv.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });
        when(slaEventRepository.save(any(ContractSlaEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateContractRequest createReq = new CreateContractRequest();
        createReq.setContractType("SPOT_TRIP");
        createReq.setShipmentCode("SHP-2026-7700");
        createReq.setCustomerId("DOANH_NGHIEP_B2B");
        createReq.setCustomerName("Vinamilk Logistics Hub");
        createReq.setContractValueVnd(2_000_000L);
        createReq.setSlaPenaltyPctPerBreach(5.0);

        B2bContractResponse draft = contractService.createContract(createReq);
        assertEquals("HD-SHP-2026-7700", draft.getContractNumber());
        assertEquals("DRAFT", draft.getContractStatus());

        B2bContract storedEntity = B2bContract.builder()
                .id(draft.getId())
                .contractNumber(draft.getContractNumber())
                .contractType("SPOT_TRIP")
                .shipmentCode("SHP-2026-7700")
                .customerId("DOANH_NGHIEP_B2B")
                .customerName("Vinamilk Logistics Hub")
                .contractValueVnd(2_000_000L)
                .slaPenaltyPctPerBreach(5.0)
                .slaPenaltyDeductionVnd(0L)
                .finalSettlementVnd(2_000_000L)
                .contractStatus("DRAFT")
                .build();

        when(contractRepository.findByContractNumber("HD-SHP-2026-7700")).thenReturn(Optional.of(storedEntity));

        SignContractRequest signReq = new SignContractRequest();
        signReq.setSignedByUsername("customer");
        B2bContractResponse signed = contractService.signContract("HD-SHP-2026-7700", signReq);
        assertEquals("SIGNED_ACTIVE", signed.getContractStatus());
        assertTrue(signed.getCustomerSignatureHash().startsWith("SHA256:"));

        RecordSlaEventRequest breachReq = new RecordSlaEventRequest();
        breachReq.setEventType("TEMP_BREACH");
        breachReq.setDescription("Nhiệt độ thùng lệch +2.4°C trong 15 phút");
        B2bContractResponse penalized = contractService.recordSlaEvent("HD-SHP-2026-7700", breachReq);
        assertEquals(100_000L, penalized.getSlaPenaltyDeductionVnd());
        assertEquals(1_900_000L, penalized.getFinalSettlementVnd());

        PaymentTransaction openTx = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionCode("PAY-7700")
                .invoiceNumber("INV-7700")
                .shipmentCode("SHP-2026-7700")
                .customerId("DOANH_NGHIEP_B2B")
                .baseFreightVnd(2_000_000L)
                .greenEsgDiscountVnd(100_000L)
                .vatAmountVnd(152_000L)
                .totalAmountVnd(2_052_000L)
                .paymentStatus("PENDING")
                .build();
        when(paymentTransactionRepository.findTopByShipmentCodeOrderByCreatedAtDesc("SHP-2026-7700"))
                .thenReturn(Optional.of(openTx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentAuditLogRepository.save(any(PaymentAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        SettleContractRequest settleReq = new SettleContractRequest();
        settleReq.setEpodSignerName("Kho Đích 3PL");
        B2bContractResponse settled = contractService.settleContractWithEpod("HD-SHP-2026-7700", settleReq);
        assertEquals("SETTLED", settled.getContractStatus());
        // Net taxable = (2,000,000 - 100,000 penalty) - 100,000 ESG = 1,800,000; VAT 8% = 144,000; Total = 1,944,000
        assertEquals(1_944_000L, openTx.getTotalAmountVnd());
        verify(paymentAuditLogRepository, times(1)).save(any(PaymentAuditLog.class));
    }
}

