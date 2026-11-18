package com.ccadro.notification.service;

import com.ccadro.notification.dto.request.SendEmailRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Slf4j
@Component
public class PaymentEvidenceEmailWorker {
    private final JdbcTemplate jdbc;
    private final TransactionalEmailService email;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ccadro.payment-email.max-attempts:10}")
    private int maxAttempts = 10;
    @Value("${ccadro.payment-email.retry-seconds:60}")
    private int retrySeconds = 60;
    @Value("${ccadro.kafka.payment-email-status-topic:ccadro.payment.email.status.v1}")
    private String emailStatusTopic = "ccadro.payment.email.status.v1";

    public PaymentEvidenceEmailWorker(JdbcTemplate jdbc, TransactionalEmailService email) {
        this(jdbc, email, null, null);
    }

    @Autowired
    public PaymentEvidenceEmailWorker(
            JdbcTemplate jdbc,
            TransactionalEmailService email,
            @Nullable KafkaTemplate<String, String> kafkaTemplate,
            @Nullable ObjectMapper objectMapper
    ) {
        this.jdbc = jdbc;
        this.email = email;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Scheduled(fixedDelayString = "${ccadro.payment-email.poll-ms:15000}")
    @Transactional
    public void deliver() {
        // Sandbox must never mark business evidence as sent. Keep queued until real email is configured.
        if (!email.isLiveProviderConfigured()) {
            return;
        }
        var rows = jdbc.queryForList(
                "SELECT * FROM payment_email_inbox WHERE status='PENDING' AND next_attempt_at<=NOW() ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED"
        );
        for (var row : rows) {
            deliverRow(row);
        }
    }

    @Transactional
    public void deliverSingle(UUID eventId) {
        if (!email.isLiveProviderConfigured()) {
            return;
        }
        var rows = jdbc.queryForList(
                "SELECT * FROM payment_email_inbox WHERE event_id=? AND status='PENDING' FOR UPDATE SKIP LOCKED",
                eventId
        );
        for (var row : rows) {
            deliverRow(row);
        }
    }

    private void deliverRow(Map<String, Object> row) {
        int attempts = ((Number) row.get("attempts")).intValue() + 1;
        Object eventId = row.get("event_id");
        try {
            var req = new SendEmailRequest();
            req.setToEmail((String) row.get("recipient_email"));
            req.setSubject((String) row.get("subject"));
            req.setHtmlContent((String) row.get("html_content"));
            req.setReferenceCode(eventId.toString());
            req.setCategory("PAYMENT_EVIDENCE");
            req.setAttachments(buildAttachments(row));
            req.setIdempotencyKey(eventId.toString());

            var result = email.sendEmail(req);
            if ("REVIEW_REQUIRED".equals(result.getStatus())) {
                jdbc.update(
                        "UPDATE payment_email_inbox SET status='REVIEW_REQUIRED',attempts=?,last_error=? WHERE event_id=?",
                        attempts,
                        "Ambiguous provider acknowledgement; reconcile provider logs before retry",
                        eventId
                );
                audit(eventId, "REVIEW_REQUIRED", null);
                publishStatusCallback(row, "REVIEW_REQUIRED", null, "Ambiguous provider acknowledgement");
                return;
            }
            if (!"LIVE".equals(result.getMode()) || !"SENT".equals(result.getStatus())) {
                throw new IllegalStateException("Provider did not accept email");
            }
            jdbc.update(
                    "UPDATE payment_email_inbox SET status='PROVIDER_ACCEPTED',attempts=?,provider_message_id=?,accepted_at=NOW(),last_error=NULL WHERE event_id=?",
                    attempts,
                    result.getMessageId(),
                    eventId
            );
            audit(eventId, "PROVIDER_ACCEPTED", result.getMessageId());
            publishStatusCallback(row, "SENT", result.getMessageId(), null);
        } catch (Exception e) {
            String nextStatus = attempts >= maxAttempts ? "FAILED" : "PENDING";
            jdbc.update(
                    "UPDATE payment_email_inbox SET status=?,attempts=?,next_attempt_at=NOW()+(? * interval '1 second'),last_error=? WHERE event_id=?",
                    nextStatus,
                    attempts,
                    retrySeconds,
                    "Email provider failure; retry required",
                    eventId
            );
            audit(eventId, "FAILED_ATTEMPT", null);
            if ("FAILED".equals(nextStatus)) {
                publishStatusCallback(row, "FAILED", null, e.getMessage());
            }
        }
    }

    private List<Map<String, String>> buildAttachments(Map<String, Object> row) throws java.io.IOException {
        List<Map<String, String>> attachments = new ArrayList<>();
        String contractPdf = asString(row.get("contract_pdf_base64"));
        String receiptPdf = asString(row.get("receipt_pdf_base64"));
        String contractNo = sanitizeFilename(asString(row.get("contract_number")));
        String txCode = sanitizeFilename(asString(row.get("transaction_code")));

        if (contractPdf != null && !contractPdf.isBlank()) {
            String name = contractNo != null ? "HopDong_VanTai_" + contractNo + ".pdf" : "HopDong_VanTai_CCADRO.pdf";
            attachments.add(Map.of("name", name, "content", contractPdf));
        }
        if (receiptPdf != null && !receiptPdf.isBlank()) {
            String name = txCode != null ? "XacNhanThanhToan_" + txCode + ".pdf" : "XacNhanThanhToan_CCADRO.pdf";
            attachments.add(Map.of("name", name, "content", receiptPdf));
        }
        attachments.add(archive(row));
        return attachments;
    }

    // Brevo supports ZIP, but not .json as a standalone attachment.
    private Map<String, String> archive(Map<String, Object> row) throws java.io.IOException {
        var bytes = new java.io.ByteArrayOutputStream();
        try (var zip = new java.util.zip.ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            var entries = new LinkedHashMap<String, String>();
            entries.put("evidence.json", (String) row.get("snapshot_json"));
            entries.put("confirmation.html", (String) row.get("html_content"));
            entries.put("checksums.txt", row.get("snapshot_sha256") + "  evidence.json\n" + row.get("html_sha256") + "  confirmation.html\n");
            for (var entry : entries.entrySet()) {
                var file = new java.util.zip.ZipEntry(entry.getKey());
                file.setTime(0);
                zip.putNextEntry(file);
                zip.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return Map.of(
                "name", "CCADRO-" + row.get("event_id") + ".zip",
                "content", Base64.getEncoder().encodeToString(bytes.toByteArray())
        );
    }

    private void publishStatusCallback(Map<String, Object> row, String status, String messageId, String errorMessage) {
        if (kafkaTemplate == null) {
            return;
        }
        try {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("evidenceId", row.get("event_id") != null ? row.get("event_id").toString() : null);
            event.put("transactionCode", asString(row.get("transaction_code")));
            event.put("contractNumber", asString(row.get("contract_number")));
            event.put("status", status);
            event.put("providerMessageId", messageId);
            event.put("sentAt", "SENT".equals(status) ? Instant.now().toString() : null);
            event.put("errorMessage", errorMessage);
            String json = objectMapper.writeValueAsString(event);
            String key = row.get("event_id") != null ? row.get("event_id").toString() : UUID.randomUUID().toString();
            kafkaTemplate.send(emailStatusTopic, key, json);
        } catch (Exception ex) {
            log.warn("Cannot publish payment email status callback: {}", ex.getMessage());
        }
    }

    private void audit(Object id, String outcome, String messageId) {
        jdbc.update(
                "INSERT INTO payment_email_attempt(id,event_id,outcome,provider_message_id) VALUES(?,?,?,?)",
                UUID.randomUUID(),
                id,
                outcome,
                messageId
        );
    }

    private static String asString(Object v) {
        return v == null ? null : v.toString();
    }

    private static String sanitizeFilename(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
