package com.ccadro.tracking.controller.dto;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class IngestTelemetryRequest {

    @NotNull(message = "Trip ID is required")
    private UUID tripId;
    private UUID externalEventId;

    private UUID vehicleId;

    @NotNull(message = "Timestamp is required")
    private Instant timestamp;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    private BigDecimal speedKmh;
    private BigDecimal headingDegrees;
    private String rawPayload;
}
