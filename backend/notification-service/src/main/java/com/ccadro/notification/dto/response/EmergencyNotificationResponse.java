package com.ccadro.notification.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EmergencyNotificationResponse {
    UUID id;
    String notificationCode;
    String eventType;
    String severity;
    String sourceService;
    String targetRole;
    String broadcastType;
    String senderRole;
    String senderUsername;
    String targetAudience;
    String targetCorridor;
    Double radiusMeters;
    String actionDirective;
    UUID recipientId;
    UUID tripId;
    UUID referenceId;
    String title;
    String message;
    Double latitude;
    Double longitude;
    String metadataJson;
    String status;
    String acknowledgedBy;
    Instant acknowledgedAt;
    String actionNotes;
    Instant createdAt;
}

