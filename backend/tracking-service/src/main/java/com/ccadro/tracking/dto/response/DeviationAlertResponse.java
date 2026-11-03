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
public class DeviationAlertResponse {

    UUID id;
    UUID tripId;
    String severity;
    BigDecimal deviationDistanceMeters;
    Double latitude;
    Double longitude;
    String status;
    Instant detectedAt;
    Instant resolvedAt;
    Integer persistenceCount;
}

