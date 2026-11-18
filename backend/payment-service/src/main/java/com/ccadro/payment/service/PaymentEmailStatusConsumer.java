package com.ccadro.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

/**
 * Consumes email delivery status callbacks published by notification-service
 * on ccadro.payment.email.status.v1 so Admin & B2B Customer UI reflect real-time state.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEmailStatusConsumer {

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    @KafkaListener(
            topics = "${ccadro.evidence.email-status-topic:ccadro.payment.email.status.v1}",
            groupId = "${spring.application.name:payment-service}-email-status"
    )
    @Transactional
    public void onEmailStatus(String payload) {
        try {
            JsonNode node = json.readTree(payload);
            String evidenceIdRaw = node.path("evidenceId").asText("");
            if (evidenceIdRaw.isBlank()) {
                return;
            }
            UUID evidenceId = UUID.fromString(evidenceIdRaw);
            String providerStatus = node.path("status").asText("UNKNOWN");
            String messageId = node.path("providerMessageId").asText(null);
            String sentAtRaw = node.path("sentAt").asText(null);
            String errorMessage = node.path("errorMessage").asText(null);

            String evidenceState;
            if ("SENT".equalsIgnoreCase(providerStatus) || "SKIPPED_TEST_MODE".equalsIgnoreCase(providerStatus)) {
                evidenceState = "DELIVERED";
            } else if ("FAILED".equalsIgnoreCase(providerStatus)) {
                evidenceState = "FAILED";
            } else {
                evidenceState = "QUEUED";
            }

            Timestamp deliveredAt = null;
            if (sentAtRaw != null && !sentAtRaw.isBlank()) {
                try {
                    deliveredAt = Timestamp.from(Instant.parse(sentAtRaw));
                } catch (Exception ignored) {
                }
            }
            if (deliveredAt == null && "DELIVERED".equals(evidenceState)) {
                deliveredAt = Timestamp.from(Instant.now());
            }

            jdbc.update(
                    """
                    UPDATE payment_evidence
                    SET delivery_status = ?,
                        email_provider_status = ?,
                        email_provider_message_id = ?,
                        email_delivered_at = COALESCE(?, email_delivered_at),
                        last_error = ?
                    WHERE id = ?
                    """,
                    evidenceState,
                    providerStatus,
                    messageId,
                    deliveredAt,
                    "FAILED".equals(evidenceState) ? errorMessage : null,
                    evidenceId
            );
        } catch (Exception ex) {
            log.warn("Cannot process payment email status event: {}", ex.getMessage());
        }
    }
}

