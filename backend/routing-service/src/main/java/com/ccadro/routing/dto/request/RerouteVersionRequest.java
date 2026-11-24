package com.ccadro.routing.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RerouteVersionRequest {
    @NotNull(message = "shipmentId must not be null")
    UUID shipmentId;
    @NotNull
    UUID selectedCandidateId;
    @NotNull
    UUID proposalId;
    BigDecimal distanceMeters;
    BigDecimal durationSeconds;
    String reason;
    String routeGeoJson;
}

