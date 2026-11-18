package com.ccadro.notification.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class EmailDispatchResponse {
    private String provider;
    private String mode;
    private String status;
    private String toEmail;
    private String subject;
    private String messageId;
    private String detail;
    private Instant dispatchedAt;
}

