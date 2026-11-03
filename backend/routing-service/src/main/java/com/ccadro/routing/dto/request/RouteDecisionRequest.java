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
public class RouteDecisionRequest {

    @NotNull(message = "shipmentId must not be null")
    UUID shipmentId;

    @NotNull(message = "selectedCandidateId must not be null")
    UUID selectedCandidateId;

    String decisionType;
    String dispatcherNotes;
    String decidedBy;
}

