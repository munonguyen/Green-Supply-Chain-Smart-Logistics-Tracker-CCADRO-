package com.ccadro.routing.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RouteRerouteRequest {
    @NotNull(message = "tripId must not be null")
    UUID tripId;
    Double currentLatitude;
    Double currentLongitude;
    String incidentReason;
}

