package com.ccadro.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emergency_notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EmergencyNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "notification_code", nullable = false, unique = true, length = 60)
    String notificationCode;

    @Column(name = "event_type", nullable = false, length = 50)
    String eventType;

    @Builder.Default
    @Column(name = "severity", nullable = false, length = 20)
    String severity = "CRITICAL";

    @Builder.Default
    @Column(name = "source_service", nullable = false, length = 50)
    String sourceService = "incident-service";

    @Builder.Default
    @Column(name = "target_role", nullable = false, length = 30)
    String targetRole = "DISPATCHER";

    @Builder.Default
    @Column(name = "broadcast_type", nullable = false, length = 30)
    String broadcastType = "AUTOMATED";

    @Builder.Default
    @Column(name = "sender_role", length = 30)
    String senderRole = "SYSTEM";

    @Builder.Default
    @Column(name = "sender_username", length = 100)
    String senderUsername = "system";

    @Builder.Default
    @Column(name = "target_audience", length = 50)
    String targetAudience = "DISPATCHER";

    @Column(name = "target_corridor", length = 100)
    String targetCorridor;

    @Column(name = "radius_meters")
    Double radiusMeters;

    @Column(name = "action_directive", columnDefinition = "text")
    String actionDirective;

    @Column(name = "recipient_id")
    UUID recipientId;

    @Column(name = "trip_id")
    UUID tripId;

    @Column(name = "reference_id")
    UUID referenceId;

    @Column(name = "title", nullable = false)
    String title;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    String message;

    @Column(name = "latitude")
    Double latitude;

    @Column(name = "longitude")
    Double longitude;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "jsonb")
    String metadataJson = "{}";

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    String status = "UNREAD";

    @Column(name = "acknowledged_by", length = 100)
    String acknowledgedBy;

    @Column(name = "acknowledged_at")
    Instant acknowledgedAt;

    @Column(name = "action_notes", columnDefinition = "text")
    String actionNotes;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}

