package com.ccadro.asset.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleMaintenanceRequest {
    UUID vehicleId;
    String maintenanceType;
    String description;
    LocalDate scheduledDate;
}
