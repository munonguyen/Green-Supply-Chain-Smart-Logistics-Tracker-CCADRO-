package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationResponse {
    UUID id;
    String applicationCode;
    String fullName;
    String email;
    String phone;
    String nationalId;
    LocalDate dateOfBirth;
    String appliedRoleCode;
    UUID preferredBranchId;
    String preferredBranchCode;
    String preferredBranchName;
    String preferredHubCode;
    Integer experienceYears;
    Long expectedSalaryVnd;
    String resumeSummary;
    String licenseNumber;
    String licenseClass;
    LocalDate licenseIssueDate;
    LocalDate licenseExpiryDate;
    Boolean healthCheckDeclared;
    Boolean safetyTrainingDeclared;
    String certificationCode;
    LocalDate certificateExpiryDate;
    String issuingAuthority;
    String inspectionScope;
    String applicationStatus;
    String screeningNotes;
    String interviewScheduledAt;
    Integer interviewScore;
    Boolean driveTestPassed;
    String reviewedBy;
    String approvedBy;
    Instant approvedAt;
    String rejectionReason;
    UUID createdStaffId;
    UUID createdUserId;
    String createdUsername;
    Instant createdAt;
    Instant updatedAt;
}

