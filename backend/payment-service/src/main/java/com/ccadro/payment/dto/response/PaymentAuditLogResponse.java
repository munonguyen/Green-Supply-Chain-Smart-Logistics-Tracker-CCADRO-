package com.ccadro.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAuditLogResponse {
    private UUID id;
    private String transactionCode;
    private String eventType;
    private String previousStatus;
    private String newStatus;
    private String actor;
    private String detail;
    private Instant createdAt;
}

