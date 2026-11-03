package com.ccadro.tracking.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RerouteProposalResponse {
    UUID id;
    UUID tripId;
    String triggerReason;
    BigDecimal originalRemainingDistanceMeters;
    BigDecimal proposedDistanceMeters;
    BigDecimal benefitRatio;
    String status;
    Instant createdAt;
}

