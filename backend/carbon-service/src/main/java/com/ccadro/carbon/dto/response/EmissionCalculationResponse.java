package com.ccadro.carbon.dto.response;

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
public class EmissionCalculationResponse {

    UUID id;
    UUID tripId;
    String calculationType;
    String calculationMethod;
    BigDecimal totalCo2eKg;
    BigDecimal cargoPayloadTons;
    BigDecimal totalDistanceKm;
    BigDecimal emptyRunningDistanceKm;
    BigDecimal ttwCo2eKg;
    BigDecimal wttCo2eKg;
    BigDecimal wtwCo2eKg;
    String dataQualityTier;
    String factorVersion;
    String calculationStatus;
    String blockedReason;
    Boolean isDafApplied;
    Integer versionNumber;
    Instant createdAt;
}
