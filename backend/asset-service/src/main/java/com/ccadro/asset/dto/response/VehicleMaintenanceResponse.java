package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleMaintenanceResponse {
    UUID id;
    UUID vehicleId;
    String maintenanceType;
    String status;
    LocalDate scheduledDate;
    LocalDate completedDate;
}
