package com.ccadro.identity.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "job_applications")
public class JobApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "application_code", nullable = false, unique = true, length = 40)
    String applicationCode;

    @Column(name = "lookup_pin", nullable = false, length = 20)
    String lookupPin;

    @Column(name = "full_name", nullable = false, length = 120)
    String fullName;

    @Column(name = "email", nullable = false, length = 100)
    String email;

    @Column(name = "phone", nullable = false, length = 30)
    String phone;

    @Column(name = "national_id", nullable = false, length = 30)
    String nationalId;

    @Column(name = "date_of_birth")
    LocalDate dateOfBirth;

    @Column(name = "applied_role_code", nullable = false, length = 40)
    String appliedRoleCode;

    @Column(name = "preferred_branch_id")
    UUID preferredBranchId;

    @Column(name = "preferred_branch_code", length = 40)
    String preferredBranchCode;

    @Column(name = "preferred_hub_code", length = 50)
    String preferredHubCode;

    @Builder.Default
    @Column(name = "experience_years", nullable = false)
    Integer experienceYears = 0;

    @Builder.Default
    @Column(name = "expected_salary_vnd", nullable = false)
    Long expectedSalaryVnd = 18_000_000L;

    @Column(name = "resume_summary", columnDefinition = "TEXT")
    String resumeSummary;

    @Column(name = "license_number", length = 50)
    String licenseNumber;

    @Column(name = "license_class", length = 20)
    String licenseClass;

    @Column(name = "license_expiry_date")
    LocalDate licenseExpiryDate;

    @Column(name = "license_issue_date")
    LocalDate licenseIssueDate;

    @Builder.Default
    @Column(name = "health_check_declared", nullable = false)
    Boolean healthCheckDeclared = false;

    @Builder.Default
    @Column(name = "safety_training_declared", nullable = false)
    Boolean safetyTrainingDeclared = false;

    @Column(name = "certification_code", length = 60)
    String certificationCode;

    @Column(name = "certificate_expiry_date")
    LocalDate certificateExpiryDate;

    @Column(name = "issuing_authority", length = 140)
    String issuingAuthority;

    @Column(name = "inspection_scope", length = 160)
    String inspectionScope;

    @Builder.Default
    @Column(name = "application_status", nullable = false, length = 40)
    String applicationStatus = "SUBMITTED";

    @Column(name = "screening_notes", columnDefinition = "TEXT")
    String screeningNotes;

    @Column(name = "interview_scheduled_at", length = 40)
    String interviewScheduledAt;

    @Column(name = "interview_score")
    Integer interviewScore;

    @Builder.Default
    @Column(name = "drive_test_passed", nullable = false)
    Boolean driveTestPassed = false;

    @Column(name = "reviewed_by", length = 60)
    String reviewedBy;

    @Column(name = "approved_by", length = 60)
    String approvedBy;

    @Column(name = "approved_at")
    Instant approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    String rejectionReason;

    @Column(name = "created_staff_id")
    UUID createdStaffId;

    @Column(name = "created_user_id")
    UUID createdUserId;

    @Column(name = "created_username", length = 50)
    String createdUsername;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt = Instant.now();
}

