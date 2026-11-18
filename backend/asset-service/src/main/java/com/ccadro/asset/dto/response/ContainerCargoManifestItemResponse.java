package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerCargoManifestItemResponse {
    UUID id;
    String itemCode;
    String containerCode;
    String shipmentCode;
    String hubCode;
    String cargoName;
    String cargoCategory;
    String consigneeName;
    String consigneePhone;
    String deliveryAddress;
    String deliveryZoneName;
    Double deliveryLat;
    Double deliveryLng;
    Double weightKg;
    Integer parcelCount;
    Double requiredTempC;
    Boolean requiresColdChain;
    String slaWindow;
    String dispatchStatus;
    String assignedShipperCode;
    String assignedShipperName;
    Double proximityDistanceKm;
    Double matchScore;
    String dispatchReason;
    Instant assignedAt;
    Instant deliveredAt;
    String recipientPodName;
    Boolean isDeleted;
    Instant deletedAt;
    String deletedBy;
    Instant updatedAt;
}

