package com.ccadro.notification.listener;

import com.ccadro.notification.dto.request.PaymentEvidenceRequest;
import com.ccadro.notification.event.EmergencyNotificationEvent;
import com.ccadro.notification.service.EmergencyNotificationService;
import com.ccadro.notification.service.PaymentEvidenceEmailWorker;
import com.ccadro.notification.service.PaymentEvidenceInbox;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.lang.Nullable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Consumes Payment Evidence + Legal Contract PDFs from Kafka, verifies SHA-256 checksums,
 * persists idempotently into payment_email_inbox, triggers immediate delivery, and escalates DLQ alerts.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEvidenceKafkaConsumer {

    private final PaymentEvidenceInbox inbox;
    private final PaymentEvidenceEmailWorker emailWorker;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    @Nullable
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired(required = false)
    @Nullable
    private EmergencyNotificationService emergencyNotificationService;

    @Value("${ccadro.kafka.payment-evidence-dlq-topic:ccadro.payment.evidence.dlq}")
    private String dlqTopic = "ccadro.payment.evidence.dlq";

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 1000, multiplier = 2.0),
            autoCreateTopics = "false",
            exclude = {ResponseStatusException.class, IllegalArgumentException.class}
    )
    @KafkaListener(
            topics = "${ccadro.kafka.payment-evidence-topic:ccadro.payment.evidence.v1}",
            groupId = "${spring.kafka.consumer.group-id:notification-service-group}"
    )
    public void onPaymentEvidenceMessage(String rawJsonPayload) {
        UUID evidenceId = null;
        try {
            JsonNode node = objectMapper.readTree(rawJsonPayload);
            evidenceId = UUID.fromString(node.path("evidenceId").asText());
            PaymentEvidenceRequest request = new PaymentEvidenceRequest(
                    textOrNull(node, "recipientEmail"),
                    textOrNull(node, "subject"),
                    textOrNull(node, "snapshotJson"),
                    textOrNull(node, "snapshotSha256"),
                    textOrNull(node, "htmlContent"),
                    textOrNull(node, "htmlSha256"),
                    textOrNull(node, "contractNumber"),
                    textOrNull(node, "transactionCode"),
                    textOrNull(node, "contractPdfBase64"),
                    textOrNull(node, "contractPdfSha256"),
                    textOrNull(node, "receiptPdfBase64"),
                    textOrNull(node, "receiptPdfSha256")
            );
            inbox.accept(evidenceId, request);
            emailWorker.deliverSingle(evidenceId);
        } catch (ResponseStatusException | IllegalArgumentException ex) {
            log.error("Payment evidence message rejected permanently (evidenceId={}): {}", evidenceId, ex.getMessage());
            routeToDlqAndNotifyAdmin(rawJsonPayload, ex.getMessage());
        } catch (Exception ex) {
            log.warn("Transient failure consuming payment evidence (evidenceId={}): {}", evidenceId, ex.getMessage());
            throw new IllegalStateException("Transient error processing payment evidence Kafka message", ex);
        }
    }

    @DltHandler
    public void onDeadLetterMessage(
            String rawJsonPayload,
            @Header(value = KafkaHeaders.RECEIVED_TOPIC, required = false) String receivedTopic,
            @Header(value = KafkaHeaders.EXCEPTION_MESSAGE, required = false) String exceptionMessage
    ) {
        log.error("Payment evidence moved to DLQ from {}: {}", receivedTopic, exceptionMessage);
        routeToDlqAndNotifyAdmin(rawJsonPayload, exceptionMessage);
    }

    private void routeToDlqAndNotifyAdmin(String rawJsonPayload, String reason) {
        if (kafkaTemplate != null) {
            try {
                kafkaTemplate.send(dlqTopic, rawJsonPayload);
            } catch (Exception ex) {
                log.warn("Failed forwarding rejected payment evidence to {}: {}", dlqTopic, ex.getMessage());
            }
        }
        if (emergencyNotificationService != null) {
            try {
                EmergencyNotificationEvent alert = EmergencyNotificationEvent.builder()
                        .notificationCode("DLQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                        .eventType("PAYMENT_EVIDENCE_EMAIL_DLQ")
                        .severity("HIGH")
                        .sourceService("notification-service")
                        .targetRole("ADMIN")
                        .title("Lỗi gửi Email Hợp Đồng & Chứng từ Thanh Toán qua Kafka")
                        .message("Sự kiện hồ sơ thanh toán chuyển vào hàng đợi lỗi (" + dlqTopic + "): " + reason)
                        .build();
                emergencyNotificationService.dispatchEmergencyNotification(alert);
            } catch (Exception ex) {
                log.warn("Unable to dispatch DLQ emergency alert: {}", ex.getMessage());
            }
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }
}
