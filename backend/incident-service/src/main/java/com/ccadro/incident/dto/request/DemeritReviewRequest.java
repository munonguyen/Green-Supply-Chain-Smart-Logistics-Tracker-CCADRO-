package com.ccadro.incident.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DemeritReviewRequest {

    @NotBlank(message = "reviewedBy must not be blank")
    String reviewedBy;

    /**
     * Human governance decision per BRULE-18:
     * WARNING, SUSPENDED, BLACKLISTED, DISMISSED
     */
    @NotBlank(message = "auditDecision must not be blank")
    String auditDecision;

    String decisionNotes;
}

