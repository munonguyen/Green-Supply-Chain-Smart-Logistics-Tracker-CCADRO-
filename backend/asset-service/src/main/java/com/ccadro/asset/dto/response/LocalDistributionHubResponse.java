package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocalDistributionHubResponse {
    UUID id;
    String hubCode;
    String hubName;
    String companyName;
    String externalSystemName;
    String webhookEndpoint;
    String address;
    String districtZone;
    Double centerLat;
    Double centerLng;
    Double coverageRadiusKm;
}

