package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.ccadro.payment.entity.B2bContract;
import com.ccadro.payment.entity.ContractSlaEvent;
import com.ccadro.payment.entity.PaymentTransaction;
import com.ccadro.payment.repository.B2bContractRepository;
import com.ccadro.payment.repository.ContractSlaEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentEvidenceOutboxKafkaTest {

    private static ObjectMapper mapper() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Test
    void capturesLegalContractPdfAndEnqueuesKafkaOutboxAtomically() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        B2bContractRepository contracts = mock(B2bContractRepository.class);
        ContractSlaEventRepository sla = mock(ContractSlaEventRepository.class);
        EvidenceProperties props = new EvidenceProperties();
        ObjectMapper json = mapper();

        when(jdbc.queryForList(contains("FROM public.companies"), anyString())).thenReturn(List.of(Map.of(
                "company_name", "Công ty TNHH Thủy Sản Minh Phú",
                "tax_code", "2000393273",
                "business_license_number", "GPKD-2000393273",
                "representative_name", "Lê Văn Quang",
                "representative_title", "Giám Đốc",
                "headquarters_address", "KCN Sóng Thần 2, Dĩ An, Bình Dương",
                "kyc_status", "VERIFIED",
                "company_email", "finance@minhphu.vn"
        )));
        when(jdbc.update(contains("INSERT INTO payment_evidence"), any(Object[].class))).thenReturn(1);
        when(jdbc.update(contains("INSERT INTO outbox_event"), any(Object[].class))).thenReturn(1);

        B2bContract contract = B2bContract.builder()
                .contractNumber("HD-B2B-2026-0099")
                .shipmentCode("SHP-2026-8801")
                .customerId("CUST-MINHPHU")
                .customerName("Thủy Sản Minh Phú")
                .signedByCustomerUser("quang.le")
                .signedAt(Instant.parse("2026-11-10T03:00:00Z"))
                .corridorScope("Cảng Cát Lái -> KCN VSIP 1")
                .paymentTerms("NET_30")
                .contractStatus("SIGNED")
                .slaOnTimeRatePct(99.0)
                .slaMaxTempDeviationC(1.5)
                .slaPenaltyPctPerBreach(5.0)
                .slaPenaltyDeductionVnd(0L)
                .build();
        when(contracts.findTopByShipmentCodeOrderByCreatedAtDesc("SHP-2026-8801")).thenReturn(Optional.of(contract));
        when(sla.findByContractNumberOrderByCreatedAtDesc("HD-B2B-2026-0099")).thenReturn(List.of(
                ContractSlaEvent.builder()
                        .contractNumber("HD-B2B-2026-0099")
                        .eventType("COLD_CHAIN_CHECK")
                        .description("Duy trì nhiệt độ kho lạnh -18.2°C đúng chuẩn")
                        .penaltyAmountVnd(0L)
                        .recordedBy("IOT-GUARD")
                        .build()
        ));

        PaymentTransaction tx = PaymentTransaction.builder()
                .transactionCode("TX-2026-9901")
                .invoiceNumber("INV-2026-9901")
                .shipmentCode("SHP-2026-8801")
                .customerId("CUST-MINHPHU")
                .customerName("Thủy Sản Minh Phú")
                .createdByUsername("buyer1")
                .receiptEmail("accounting@minhphu.vn")
                .payerName("Lê Văn Quang")
                .paymentStatus("PAID")
                .confirmationSource("VNPAY_WEBHOOK")
                .paymentMethod("VIETQR_NAPAS")
                .gatewayProvider("VietQR")
                .gatewayReference("VQR-9901")
                .baseFreightVnd(12_000_000L)
                .greenEsgDiscountVnd(600_000L)
                .vatAmountVnd(912_000L)
                .totalAmountVnd(12_312_000L)
                .paidAt(Instant.parse("2026-11-16T08:00:00Z"))
                .build();

        PaymentOutboxService outbox = new PaymentOutboxService(jdbc, json, props);
        PaymentEvidenceService service = new PaymentEvidenceService(jdbc, json, contracts, sla, props, outbox);

        service.capture(tx);

        ArgumentCaptor<Object[]> evidenceArgs = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(contains("INSERT INTO payment_evidence"), evidenceArgs.capture());
        Object[] ev = evidenceArgs.getValue();
        assertEquals("HD-B2B-2026-0099", ev[9]);
        byte[] contractPdfBytes = Base64.getDecoder().decode((String) ev[10]);
        assertTrue(new String(contractPdfBytes, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));
        assertEquals(PaymentEvidenceService.sha256Bytes(contractPdfBytes), ev[11]);

        byte[] receiptPdfBytes = Base64.getDecoder().decode((String) ev[12]);
        assertTrue(new String(receiptPdfBytes, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));
        assertEquals(PaymentEvidenceService.sha256Bytes(receiptPdfBytes), ev[13]);
        assertEquals("Công ty TNHH Thủy Sản Minh Phú", ev[14]);
        assertEquals("2000393273", ev[15]);
        assertEquals("ccadro.payment.evidence.v1", ev[19]);

        ArgumentCaptor<Object[]> outboxArgs = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(contains("INSERT INTO outbox_event"), outboxArgs.capture());
        Object[] ob = outboxArgs.getValue();
        assertEquals("PAYMENT_EVIDENCE", ob[1]);
        assertEquals("PAYMENT_EVIDENCE_LEGAL_READY", ob[3]);
        assertEquals("ccadro.payment.evidence.v1", ob[4]);
        JsonNode payloadNode = json.readTree((String) ob[5]);
        assertEquals("TX-2026-9901", payloadNode.path("transactionCode").asText());
        assertEquals("HD-B2B-2026-0099", payloadNode.path("contractNumber").asText());
        assertEquals("accounting@minhphu.vn", payloadNode.path("recipientEmail").asText());
        assertEquals(ev[10], payloadNode.path("contractPdfBase64").asText());
    }

    @Test
    @SuppressWarnings("unchecked")
    void publishesPendingOutboxToKafkaAndHandlesStatusCallback() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        EvidenceProperties props = new EvidenceProperties();
        ObjectMapper json = mapper();
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);

        UUID outboxId = UUID.randomUUID();
        UUID evidenceId = UUID.randomUUID();
        String payload = "{\"evidenceId\":\"" + evidenceId + "\",\"transactionCode\":\"TX-1\",\"customerId\":\"CUST-1\"}";
        when(jdbc.queryForList(contains("FROM outbox_event"), eq("PAYMENT_EVIDENCE"))).thenReturn(List.of(Map.of(
                "id", outboxId,
                "aggregate_id", evidenceId,
                "kafka_topic", "ccadro.payment.evidence.v1",
                "payload_text", payload,
                "retry_count", 0
        )));
        when(kafkaTemplate.send("ccadro.payment.evidence.v1", "CUST-1", payload))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

        PaymentOutboxKafkaPublisher publisher = new PaymentOutboxKafkaPublisher(jdbc, props, json, kafkaTemplate);
        publisher.publishPendingEvents();

        verify(kafkaTemplate).send("ccadro.payment.evidence.v1", "CUST-1", payload);
        verify(jdbc).update(contains("UPDATE outbox_event SET status = 'PUBLISHED'"), eq(outboxId));
        verify(jdbc).update(contains("KAFKA_PUBLISHED"), eq("ccadro.payment.evidence.v1"), eq(evidenceId));

        PaymentEmailStatusConsumer statusConsumer = new PaymentEmailStatusConsumer(jdbc, json);
        statusConsumer.onEmailStatus("{\"evidenceId\":\"" + evidenceId + "\",\"status\":\"SENT\",\"providerMessageId\":\"msg-123\",\"sentAt\":\"2026-11-16T08:05:00Z\"}");
        verify(jdbc).update(contains("UPDATE payment_evidence"), eq("DELIVERED"), eq("SENT"), eq("msg-123"), any(), isNull(), eq(evidenceId));
    }
}

