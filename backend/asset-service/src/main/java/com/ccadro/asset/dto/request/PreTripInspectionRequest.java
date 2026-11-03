package com.ccadro.asset.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PreTripInspectionRequest {
    UUID vehicleId;
    UUID driverId;
    Boolean tirePressurePassed;
    Boolean brakeSystemPassed;
    Boolean lightingSystemPassed;
    @JsonAlias({"fluidLevelsPassed", "fluidLevelPassed"})
    Boolean fluidLevelPassed;
    Boolean cargoSecuringPassed;
    Boolean emergencyKitPassed;
    String remarks;
}

