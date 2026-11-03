package com.ccadro.notification.event;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EmergencyNotificationEvent {

    String notificationCode;

    @NotBlank(message = "eventType is required")
    String eventType;

    @Builder.Default
    String severity = "CRITICAL";

    @Builder.Default
    String sourceService = "incident-service";

    @Builder.Default
    String targetRole = "DISPATCHER";

    UUID recipientId;
    UUID tripId;
    UUID referenceId;

    @NotBlank(message = "title is required")
    String title;

    @NotBlank(message = "message is required")
    String message;

    Double latitude;
    Double longitude;

    @Builder.Default
    String metadataJson = "{}";
}

