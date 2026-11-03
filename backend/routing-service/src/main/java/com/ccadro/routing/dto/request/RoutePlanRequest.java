package com.ccadro.routing.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class RoutePlanRequest {

    @NotNull(message = "shipmentId must not be null")
    UUID shipmentId;

    UUID vehicleId;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "1.0")
    BigDecimal weightDistance;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "1.0")
    BigDecimal weightDuration;

    @DecimalMin(value = "0.0")
    @DecimalMax(value = "1.0")
    BigDecimal weightEmission;

    Boolean avoidTolls;
    Boolean avoidHighways;
}

