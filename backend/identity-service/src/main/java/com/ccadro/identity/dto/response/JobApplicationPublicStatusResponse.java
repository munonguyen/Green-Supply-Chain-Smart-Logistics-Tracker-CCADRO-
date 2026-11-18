package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationPublicStatusResponse {
    String applicationCode;
    String fullName;
    String appliedRoleCode;
    String preferredBranchCode;
    String applicationStatus;
    String screeningNotes;
    String interviewScheduledAt;
    Integer interviewScore;
    Boolean driveTestPassed;
    String rejectionReason;
    String createdUsername;
    Instant createdAt;
    Instant updatedAt;
}

