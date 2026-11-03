package com.ccadro.shipment.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Bảng Transactional Outbox đảm bảo ghi DB và xuất bản sự kiện Kafka nguyên tử 100% (Chống lỗi Dual-Write).
 */
@Entity
@Table(name = "outbox_event")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    UUID aggregateId;

    @Column(name = "event_type", nullable = false, length = 60)
    String eventType;

    @Column(name = "kafka_topic", nullable = false, length = 100)
    String kafkaTopic;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", nullable = false, columnDefinition = "jsonb")
    String payloadJson;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    String status = "PENDING"; // PENDING, PUBLISHED, FAILED_DLQ

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    Integer retryCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "published_at")
    Instant publishedAt;
}

