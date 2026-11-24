package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffVerificationRequest {
    @NotBlank(message = "Trạng thái kiểm duyệt nghiệp vụ không được để trống")
    String verificationStatus;

    String verificationNotes;
    LocalDate dateOfBirth;
    Boolean backgroundCheckPassed;
    Boolean healthCheckPassed;
    LocalDate healthCheckDate;
    Boolean safetyTrainingCertified;
    Boolean canSignOffCompliance;
    String licenseNumber;
    String licenseClass;
    LocalDate licenseIssueDate;
    LocalDate licenseExpiryDate;
    String certificationCode;
    LocalDate certificateExpiryDate;
    String issuingAuthority;
    String inspectionScope;
}

