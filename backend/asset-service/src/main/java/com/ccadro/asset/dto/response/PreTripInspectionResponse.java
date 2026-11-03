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
public class PreTripInspectionResponse {
    UUID id;
    UUID vehicleId;
    UUID driverId;
    Boolean isPassed;
    String remarks;
    Instant inspectedAt;
}

