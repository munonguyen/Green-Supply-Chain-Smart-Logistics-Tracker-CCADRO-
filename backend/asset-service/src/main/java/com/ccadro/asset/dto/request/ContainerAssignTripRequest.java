package com.ccadro.asset.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerAssignTripRequest {
    UUID assignedShipmentId;
    String assignedShipmentCode;
    UUID assignedDriverId;
    String driverName;
    String driverPhone;
    String driverLicense;
    BigDecimal driverSafetyScore;
    UUID assignedVehicleId;
    String vehicleLicensePlate;
    String vehicleTypeLabel;
    String originName;
    String destinationName;
}

