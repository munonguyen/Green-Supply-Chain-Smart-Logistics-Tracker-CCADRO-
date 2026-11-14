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
public class ThirdPartyHandoverResponse {
    UUID id;
    String containerCode;
    String shipmentCode;
    String destinationHub;
    String shipperCompany;
    String externalSystemName;
    String externalTrackingRef;
    String webhookEndpoint;
    String dockGate;
    String handoverStatus;
    String epodSignedBy;
    String epodSignatureHash;
    String lastSyncStatus;
    String lastSyncPayload;
    Instant lastSyncedAt;
    Instant updatedAt;
}

