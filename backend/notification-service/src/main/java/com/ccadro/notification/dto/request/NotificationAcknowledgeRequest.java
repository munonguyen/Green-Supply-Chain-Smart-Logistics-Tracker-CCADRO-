package com.ccadro.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationAcknowledgeRequest {

    @NotBlank(message = "acknowledgedBy is required")
    String acknowledgedBy;

    String actionNotes;
}

