package com.ccadro.shipment.dto.response;

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
public class ShipmentResponse {

    UUID id;
    String shipmentCode;
    String customerId;
    String originName;
    String originAddress;
    Double originLatitude;
    Double originLongitude;
    String destinationName;
    String destinationAddress;
    Double destinationLatitude;
    Double destinationLongitude;
    BigDecimal cargoWeightTons;
    BigDecimal cargoVolumeM3;
    String cargoType;
    Boolean isHazardous;
    Instant pickupTimePlanned;
    Instant deliveryDeadline;
    String status;
    String distance;
    BigDecimal distanceKm;
    String distanceUnit;
    Instant createdAt;
    Instant updatedAt;
}

