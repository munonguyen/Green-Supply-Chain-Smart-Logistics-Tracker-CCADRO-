package com.ccadro.notification.service;

import com.ccadro.notification.dto.request.SendEmailRequest;
import com.ccadro.notification.dto.response.EmailDispatchResponse;
import com.ccadro.notification.listener.PaymentEvidenceKafkaConsumer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentEvidenceKafkaConsumerTest {

    @Test
    @SuppressWarnings("unchecked")
    void consumesKafkaEvidenceVerifiesPdfAndPublishesEmailStatusCallback() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TransactionalEmailService email = mock(TransactionalEmailService.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        ObjectMapper mapper = new ObjectMapper();

        UUID evidenceId = UUID.randomUUID();
        String snapshot = "{\"transactionCode\":\"TX-KAFKA-01\"}";
        String html = "<html><body>Contract Confirmation</body></html>";
        byte[] fakePdf = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF".getBytes(StandardCharsets.UTF_8);
        String pdfB64 = Base64.getEncoder().encodeToString(fakePdf);
        String pdfSha = PaymentEvidenceInbox.digestBytes(fakePdf);
        String snapshotSha = PaymentEvidenceInbox.digest(snapshot);
        String htmlSha = PaymentEvidenceInbox.digest(html);

        String subject = "[CCADRO Legal] Xác nhận thanh toán & Hợp đồng vận tải HD-2026-01 (TX-KAFKA-01)";
        Map<String, Object> inboxRow = new LinkedHashMap<>();
        inboxRow.put("event_id", evidenceId);
        inboxRow.put("recipient_email", "buyer@company.vn");
        inboxRow.put("subject", subject);
        inboxRow.put("snapshot_json", snapshot);
        inboxRow.put("snapshot_sha256", snapshotSha);
        inboxRow.put("html_content", html);
        inboxRow.put("html_sha256", htmlSha);
        inboxRow.put("contract_number", "HD-2026-01");
        inboxRow.put("transaction_code", "TX-KAFKA-01");
        inboxRow.put("contract_pdf_base64", pdfB64);
        inboxRow.put("contract_pdf_sha256", pdfSha);
        inboxRow.put("receipt_pdf_base64", pdfB64);
        inboxRow.put("receipt_pdf_sha256", pdfSha);
        inboxRow.put("attempts", 0);

        when(jdbc.queryForMap(contains("FROM payment_email_inbox"), eq(evidenceId))).thenReturn(inboxRow);
        when(jdbc.queryForList(contains("SELECT event_id,status"), eq(evidenceId)))
                .thenReturn(List.of(Map.of("event_id", evidenceId, "status", "PENDING")));
        when(email.isLiveProviderConfigured()).thenReturn(true);
        when(jdbc.queryForList(contains("FROM payment_email_inbox WHERE event_id=? AND status='PENDING'"), eq(evidenceId)))
                .thenReturn(List.of(inboxRow));
        when(email.sendEmail(any())).thenReturn(EmailDispatchResponse.builder()
                .mode("LIVE").status("SENT").messageId("brevo-msg-99").build());

        PaymentEvidenceInbox inbox = new PaymentEvidenceInbox(jdbc);
        PaymentEvidenceEmailWorker worker = new PaymentEvidenceEmailWorker(jdbc, email, kafkaTemplate, mapper);
        PaymentEvidenceKafkaConsumer consumer = new PaymentEvidenceKafkaConsumer(inbox, worker, mapper);

        String kafkaPayload = mapper.writeValueAsString(Map.ofEntries(
                Map.entry("evidenceId", evidenceId.toString()),
                Map.entry("recipientEmail", "buyer@company.vn"),
                Map.entry("subject", subject),
                Map.entry("snapshotJson", snapshot),
                Map.entry("snapshotSha256", snapshotSha),
                Map.entry("htmlContent", html),
                Map.entry("htmlSha256", htmlSha),
                Map.entry("contractNumber", "HD-2026-01"),
                Map.entry("transactionCode", "TX-KAFKA-01"),
                Map.entry("contractPdfBase64", pdfB64),
                Map.entry("contractPdfSha256", pdfSha),
                Map.entry("receiptPdfBase64", pdfB64),
                Map.entry("receiptPdfSha256", pdfSha)
        ));

        consumer.onPaymentEvidenceMessage(kafkaPayload);

        ArgumentCaptor<SendEmailRequest> emailCaptor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(email).sendEmail(emailCaptor.capture());
        SendEmailRequest sentReq = emailCaptor.getValue();
        assertEquals(3, sentReq.getAttachments().size());
        assertEquals("HopDong_VanTai_HD-2026-01.pdf", sentReq.getAttachments().get(0).get("name"));
        assertEquals("XacNhanThanhToan_TX-KAFKA-01.pdf", sentReq.getAttachments().get(1).get("name"));
        assertTrue(sentReq.getAttachments().get(2).get("name").endsWith(".zip"));

        verify(kafkaTemplate).send(eq("ccadro.payment.email.status.v1"), eq(evidenceId.toString()), contains("\"SENT\""));
    }

    @Test
    @SuppressWarnings("unchecked")
    void rejectsTamperedPdfDigestAndForwardsToDlq() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        TransactionalEmailService email = mock(TransactionalEmailService.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        ObjectMapper mapper = new ObjectMapper();

        UUID evidenceId = UUID.randomUUID();
        String snapshot = "{\"transactionCode\":\"TX-BAD\"}";
        String html = "<html><body>Bad</body></html>";
        byte[] fakePdf = "%PDF-1.4\n%%EOF".getBytes(StandardCharsets.UTF_8);

        PaymentEvidenceInbox inbox = new PaymentEvidenceInbox(jdbc);
        PaymentEvidenceEmailWorker worker = new PaymentEvidenceEmailWorker(jdbc, email, kafkaTemplate, mapper);
        PaymentEvidenceKafkaConsumer consumer = new PaymentEvidenceKafkaConsumer(inbox, worker, mapper);
        ReflectionTestUtils.setField(consumer, "kafkaTemplate", kafkaTemplate);

        String tamperedPayload = mapper.writeValueAsString(Map.of(
                "evidenceId", evidenceId.toString(),
                "recipientEmail", "buyer@company.vn",
                "subject", "Tampered",
                "snapshotJson", snapshot,
                "snapshotSha256", PaymentEvidenceInbox.digest(snapshot),
                "htmlContent", html,
                "htmlSha256", PaymentEvidenceInbox.digest(html),
                "contractPdfBase64", Base64.getEncoder().encodeToString(fakePdf),
                "contractPdfSha256", "0".repeat(64)
        ));

        consumer.onPaymentEvidenceMessage(tamperedPayload);

        verifyNoInteractions(email);
        verify(kafkaTemplate).send(eq("ccadro.payment.evidence.dlq"), eq(tamperedPayload));
    }
}

