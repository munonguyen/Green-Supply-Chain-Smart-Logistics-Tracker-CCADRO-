package com.ccadro.shipment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShipmentCreationRequest {

    @NotBlank(message = "shipmentCode must not be blank")
    String shipmentCode;

    @NotBlank(message = "customerId must not be blank")
    String customerId;

    @NotBlank(message = "originName must not be blank")
    String originName;

    String originAddress;

    @NotNull(message = "originLatitude must not be null")
    Double originLatitude;

    @NotNull(message = "originLongitude must not be null")
    Double originLongitude;

    @NotBlank(message = "destinationName must not be blank")
    String destinationName;

    String destinationAddress;

    @NotNull(message = "destinationLatitude must not be null")
    Double destinationLatitude;

    @NotNull(message = "destinationLongitude must not be null")
    Double destinationLongitude;

    @NotNull(message = "cargoWeightTons must not be null")
    @DecimalMin(value = "0.01", message = "cargoWeightTons must be greater than 0")
    BigDecimal cargoWeightTons;

    BigDecimal cargoVolumeM3;
    String cargoType;
    Boolean isHazardous;
    Instant pickupTimePlanned;
    Instant deliveryDeadline;

    String distance;
    BigDecimal distanceKm;
    String distanceUnit;
}

