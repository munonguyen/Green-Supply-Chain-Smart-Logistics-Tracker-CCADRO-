package com.ccadro.incident.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FieldIncidentResponse {
    UUID id;
    String incidentCode;
    UUID tripId;
    UUID driverId;
    String incidentType;
    String severity;
    Double latitude;
    Double longitude;
    String description;
    String status;
    Instant reportedAt;
}

