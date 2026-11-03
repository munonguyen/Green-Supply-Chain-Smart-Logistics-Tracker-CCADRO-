package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleCreateRequest {

    @NotBlank(message = "vehicleCode must not be blank")
    String vehicleCode;

    @NotBlank(message = "plateNumber must not be blank")
    String plateNumber;

    @NotBlank(message = "fuelType must not be blank")
    String fuelType;

    @NotBlank(message = "euroStandard must not be blank")
    String euroStandard;

    @NotNull(message = "maxPayloadTons must not be null")
    @DecimalMin(value = "0.1", message = "maxPayloadTons must be greater than 0")
    BigDecimal maxPayloadTons;

    @NotNull(message = "emptyWeightTons must not be null")
    @DecimalMin(value = "0.1", message = "emptyWeightTons must be greater than 0")
    BigDecimal emptyWeightTons;
}

