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
public class StaffProfileResponse {
    UUID id;
    String employeeCode;
    String fullName;
    String username;
    String email;
    String phone;
    String roleCode;
    String department;
    String jobTitle;
    UUID branchId;
    String branchCode;
    String branchName;
    String contractType;
    String shiftName;
    Long baseSalaryVnd;
    LocalDate hireDate;
    String status;
    String notes;
    String nationalId;
    String staffCategory;
    String verificationStatus;
    String verifiedBy;
    Instant verifiedAt;
    String verificationNotes;
    Boolean backgroundCheckPassed;
    String licenseNumber;
    String licenseClass;
    LocalDate licenseExpiryDate;
    Boolean healthCheckPassed;
    LocalDate healthCheckDate;
    Boolean safetyTrainingCertified;
    String assignedVehiclePlate;
    String assignedHubCode;
    Integer demeritPoints;
    String certificationCode;
    LocalDate certificateExpiryDate;
    String issuingAuthority;
    String inspectionScope;
    Boolean canSignOffCompliance;
    Boolean isDeleted;
    Instant deletedAt;
    String deletedBy;
    Instant createdAt;
    Instant updatedAt;
}
