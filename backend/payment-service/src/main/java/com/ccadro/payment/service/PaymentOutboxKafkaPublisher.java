package com.ccadro.payment.service;

import com.ccadro.payment.configuration.EvidenceProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Transactional Outbox Relay: reads PENDING payment evidence events and publishes them
 * idempotently to Kafka (acks=all) before marking PUBLISHED.
 */
@Slf4j
@Component
public class PaymentOutboxKafkaPublisher {

    private final JdbcTemplate jdbc;
    private final EvidenceProperties properties;
    private final ObjectMapper json;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public PaymentOutboxKafkaPublisher(
            JdbcTemplate jdbc,
            EvidenceProperties properties,
            ObjectMapper json,
            @Autowired(required = false) KafkaTemplate<String, String> kafkaTemplate
    ) {
        this.jdbc = jdbc;
        this.properties = properties;
        this.json = json;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelayString = "${ccadro.evidence.kafka-poll-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        if (!properties.isKafkaEnabled() || kafkaTemplate == null) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                SELECT id, aggregate_id, kafka_topic, payload_json::text AS payload_text, retry_count
                FROM outbox_event
                WHERE aggregate_type = ? AND status = 'PENDING'
                ORDER BY created_at ASC
                LIMIT 20
                FOR UPDATE SKIP LOCKED
                """,
                PaymentOutboxService.AGGREGATE_TYPE_PAYMENT_EVIDENCE
        );
        for (Map<String, Object> row : rows) {
            UUID outboxId = toUuid(row.get("id"));
            UUID evidenceId = toUuid(row.get("aggregate_id"));
            String topic = row.get("kafka_topic") != null
                    ? row.get("kafka_topic").toString()
                    : properties.getKafkaTopic();
            String payloadText = row.get("payload_text") != null ? row.get("payload_text").toString() : "{}";
            int retries = row.get("retry_count") instanceof Number n ? n.intValue() : 0;

            try {
                String partitionKey = resolvePartitionKey(payloadText, evidenceId);
                kafkaTemplate.send(topic, partitionKey, payloadText).get(5, TimeUnit.SECONDS);

                jdbc.update(
                        "UPDATE outbox_event SET status = 'PUBLISHED', published_at = NOW() WHERE id = ?",
                        outboxId
                );
                if (evidenceId != null) {
                    jdbc.update(
                            """
                            UPDATE payment_evidence
                            SET delivery_status = CASE WHEN delivery_status IN ('DELIVERED','QUEUED') THEN delivery_status ELSE 'KAFKA_PUBLISHED' END,
                                kafka_topic = ?,
                                kafka_published_at = COALESCE(kafka_published_at, NOW()),
                                last_error = NULL
                            WHERE id = ?
                            """,
                            topic,
                            evidenceId
                    );
                }
            } catch (Exception ex) {
                int nextRetries = retries + 1;
                boolean deadLetter = nextRetries >= properties.getMaxAttempts();
                jdbc.update(
                        "UPDATE outbox_event SET retry_count = ?, status = ? WHERE id = ?",
                        nextRetries,
                        deadLetter ? "FAILED_DLQ" : "PENDING",
                        outboxId
                );
                if (evidenceId != null) {
                    jdbc.update(
                            "UPDATE payment_evidence SET attempts = ?, delivery_status = ?, last_error = ? WHERE id = ?",
                            nextRetries,
                            deadLetter ? "FAILED" : "PENDING",
                            "Kafka publish error: " + truncate(ex.getMessage(), 300),
                            evidenceId
                    );
                }
                log.warn("Kafka publish failed for outbox {}: {}", outboxId, ex.getMessage());
            }
        }
    }

    private String resolvePartitionKey(String payloadText, UUID evidenceId) {
        try {
            JsonNode node = json.readTree(payloadText);
            if (node.hasNonNull("customerId") && !node.get("customerId").asText().isBlank()) {
                return node.get("customerId").asText();
            }
            if (node.hasNonNull("transactionCode")) {
                return node.get("transactionCode").asText();
            }
        } catch (Exception ignored) {
        }
        return evidenceId != null ? evidenceId.toString() : UUID.randomUUID().toString();
    }

    private static UUID toUuid(Object value) {
        if (value instanceof UUID u) {
            return u;
        }
        return value != null ? UUID.fromString(value.toString()) : null;
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "Unknown error";
        }
        return text.length() <= max ? text : text.substring(0, max);
    }
}

