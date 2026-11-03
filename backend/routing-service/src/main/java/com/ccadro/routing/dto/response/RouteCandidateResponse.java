package com.ccadro.routing.dto.response;

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
public class RouteCandidateResponse {

    UUID id;
    UUID shipmentId;
    String candidateName;
    String providerName;
    BigDecimal distanceMeters;
    BigDecimal durationSeconds;
    BigDecimal estimatedFuelLiters;
    BigDecimal estimatedCo2Kg;
    BigDecimal compositeScore;
    Boolean isSelected;
    Instant createdAt;
}
