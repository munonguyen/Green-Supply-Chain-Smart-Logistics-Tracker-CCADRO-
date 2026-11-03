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
public class TelemetryResponse {

    UUID id;
    UUID tripId;
    UUID vehicleId;
    Double latitude;
    Double longitude;
    BigDecimal speedKmh;
    BigDecimal headingDegrees;
    BigDecimal distanceFromRouteMeters;
    Instant timestamp;
}

