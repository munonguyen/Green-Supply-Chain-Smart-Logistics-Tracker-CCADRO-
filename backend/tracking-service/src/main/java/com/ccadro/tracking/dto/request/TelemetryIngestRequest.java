package com.ccadro.tracking.dto.request;

import jakarta.validation.constraints.NotNull;
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
public class TelemetryIngestRequest {

    @NotNull(message = "tripId must not be null")
    UUID tripId;

    UUID vehicleId;

    @NotNull(message = "latitude must not be null")
    Double latitude;

    @NotNull(message = "longitude must not be null")
    Double longitude;

    BigDecimal speedKmh;
    BigDecimal headingDegrees;
    BigDecimal accuracyMeters;
    BigDecimal fuelLevelPercentage;
    Instant timestamp;
}

