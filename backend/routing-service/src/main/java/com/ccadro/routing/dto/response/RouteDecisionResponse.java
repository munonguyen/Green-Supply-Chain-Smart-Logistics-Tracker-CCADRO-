package com.ccadro.routing.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RouteDecisionResponse {
    UUID id;
    UUID shipmentId;
    UUID selectedCandidateId;
    String decisionType;
    String dispatcherNotes;
    String decidedBy;
    Instant decidedAt;
}

