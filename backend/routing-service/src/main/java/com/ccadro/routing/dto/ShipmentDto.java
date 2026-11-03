package com.ccadro.routing.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShipmentDto {
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
    String status;
}
