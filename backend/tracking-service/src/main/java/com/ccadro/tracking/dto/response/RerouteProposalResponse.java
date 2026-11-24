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
    boolean routeGeometryAvailable;
    UUID sourceCandidateId;
    BigDecimal proposedDurationSeconds;
    String routingMetadataJson;
    java.util.List<java.util.List<Double>> routeWaypoints;
    Instant createdAt;
}

