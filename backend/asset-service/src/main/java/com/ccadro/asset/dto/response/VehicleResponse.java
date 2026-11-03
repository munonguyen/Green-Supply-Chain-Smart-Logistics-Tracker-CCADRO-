package com.ccadro.asset.dto.response;

import com.ccadro.asset.entity.enums.VehicleStatus;
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
public class VehicleResponse {

    UUID id;
    String vehicleCode;
    String plateNumber;
    String fuelType;
    String euroStandard;
    BigDecimal maxPayloadTons;
    BigDecimal emptyWeightTons;
    VehicleStatus status;
    Instant createdAt;
    Instant updatedAt;
}

