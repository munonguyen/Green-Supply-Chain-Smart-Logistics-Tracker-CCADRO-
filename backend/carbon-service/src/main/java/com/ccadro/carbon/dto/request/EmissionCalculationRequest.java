package com.ccadro.carbon.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class EmissionCalculationRequest {

    @NotNull(message = "tripId must not be null")
    UUID tripId;

    @NotBlank(message = "calculationType must not be blank")
    String calculationType; // PLANNING or POST_TRIP

    @NotNull(message = "cargoPayloadTons must not be null")
    @DecimalMin(value = "0.01")
    BigDecimal cargoPayloadTons;

    @NotNull(message = "totalDistanceKm must not be null")
    @DecimalMin(value = "0.01")
    BigDecimal totalDistanceKm;

    BigDecimal emptyRunningDistanceKm;
    String fuelType;
    String euroStandard;
}

