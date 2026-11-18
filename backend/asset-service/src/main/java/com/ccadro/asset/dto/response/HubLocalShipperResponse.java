package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HubLocalShipperResponse {
    UUID id;
    String shipperCode;
    String hubCode;
    String fullName;
    String phone;
    String vehicleType;
    String vehiclePlate;
    String assignedZoneName;
    Double assignedLat;
    Double assignedLng;
    Double coverageRadiusKm;
    Double currentLat;
    Double currentLng;
    Boolean coldChainCapable;
    Double maxCapacityKg;
    Double currentLoadKg;
    Integer activeItemCount;
    String shiftStatus;
    Double rating;
}

