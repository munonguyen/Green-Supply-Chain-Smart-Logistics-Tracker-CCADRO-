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
@Table(name = "staff_profiles")
public class StaffProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "employee_code", nullable = false, unique = true, length = 40)
    String employeeCode;

    @Column(name = "full_name", nullable = false, length = 120)
    String fullName;

    @Column(name = "username", length = 50)
    String username;

    @Column(name = "email", nullable = false, length = 100)
    String email;

    @Column(name = "phone", length = 30)
    String phone;

    @Column(name = "role_code", nullable = false, length = 40)
    String roleCode;

    @Column(name = "department", nullable = false, length = 120)
    String department;

    @Column(name = "job_title", nullable = false, length = 120)
    String jobTitle;

    @Column(name = "branch_id")
    UUID branchId;

    @Column(name = "branch_code", length = 40)
    String branchCode;

    @Builder.Default
    @Column(name = "contract_type", nullable = false, length = 40)
    String contractType = "FULL_TIME";

    @Builder.Default
    @Column(name = "shift_name", length = 40)
    String shiftName = "CA_HANH_CHINH";

    @Builder.Default
    @Column(name = "base_salary_vnd", nullable = false)
    Long baseSalaryVnd = 15_000_000L;

    @Builder.Default
    @Column(name = "hire_date", nullable = false)
    LocalDate hireDate = LocalDate.now();

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    String status = "ACTIVE";

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;

    @Column(name = "national_id", length = 30)
    String nationalId;

    @Builder.Default
    @Column(name = "staff_category", nullable = false, length = 30)
    String staffCategory = "OPS_DISPATCH";

    @Builder.Default
    @Column(name = "verification_status", nullable = false, length = 30)
    String verificationStatus = "PENDING_REVIEW";

    @Column(name = "verified_by", length = 60)
    String verifiedBy;

    @Column(name = "verified_at")
    Instant verifiedAt;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    String verificationNotes;

    @Builder.Default
    @Column(name = "background_check_passed", nullable = false)
    Boolean backgroundCheckPassed = false;

    @Column(name = "license_number", length = 50)
    String licenseNumber;

    @Column(name = "license_class", length = 20)
    String licenseClass;

    @Column(name = "license_expiry_date")
    LocalDate licenseExpiryDate;

    @Builder.Default
    @Column(name = "health_check_passed", nullable = false)
    Boolean healthCheckPassed = false;

    @Column(name = "health_check_date")
    LocalDate healthCheckDate;

    @Builder.Default
    @Column(name = "safety_training_certified", nullable = false)
    Boolean safetyTrainingCertified = false;

    @Column(name = "assigned_vehicle_plate", length = 30)
    String assignedVehiclePlate;

    @Column(name = "assigned_hub_code", length = 50)
    String assignedHubCode;

    @Builder.Default
    @Column(name = "demerit_points", nullable = false)
    Integer demeritPoints = 0;

    @Column(name = "certification_code", length = 60)
    String certificationCode;

    @Column(name = "certificate_expiry_date")
    LocalDate certificateExpiryDate;

    @Column(name = "issuing_authority", length = 140)
    String issuingAuthority;

    @Column(name = "inspection_scope", length = 160)
    String inspectionScope;

    @Builder.Default
    @Column(name = "can_sign_off_compliance", nullable = false)
    Boolean canSignOffCompliance = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    Boolean isDeleted = false;

    @Column(name = "deleted_at")
    Instant deletedAt;

    @Column(name = "deleted_by", length = 60)
    String deletedBy;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt = Instant.now();
}
