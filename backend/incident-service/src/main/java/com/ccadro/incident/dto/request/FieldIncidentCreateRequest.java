package com.ccadro.incident.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FieldIncidentCreateRequest {
    @NotBlank(message = "incidentCode must not be blank")
    String incidentCode;
    UUID tripId;
    @NotNull(message = "driverId must not be null")
    UUID driverId;
    @NotBlank(message = "incidentType must not be blank")
    String incidentType;
    String severity;
    Double latitude;
    Double longitude;
    @NotBlank(message = "description must not be blank")
    String description;
}

