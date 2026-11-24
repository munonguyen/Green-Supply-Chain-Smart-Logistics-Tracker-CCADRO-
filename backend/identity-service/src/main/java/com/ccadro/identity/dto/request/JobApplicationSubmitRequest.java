package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JobApplicationSubmitRequest {
    @NotBlank(message = "Họ và tên ứng viên không được để trống")
    String fullName;

    @NotBlank(message = "Email liên hệ không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    String phone;

    @NotBlank(message = "Số CCCD/CMND không được để trống")
    String nationalId;
    LocalDate dateOfBirth;

    @NotBlank(message = "Vị trí / Role ứng tuyển không được để trống")
    String appliedRoleCode;

    UUID preferredBranchId;
    String preferredBranchCode;
    String preferredHubCode;

    @Min(value = 0, message = "Số năm kinh nghiệm không được âm")
    Integer experienceYears;

    @Min(value = 0, message = "Mức lương mong muốn không được âm")
    Long expectedSalaryVnd;

    String resumeSummary;

    // Hồ sơ dành cho ứng viên Lái xe / Shipper
    String licenseNumber;
    String licenseClass;
    LocalDate licenseIssueDate;
    LocalDate licenseExpiryDate;
    Boolean healthCheckDeclared;
    Boolean safetyTrainingDeclared;

    // Hồ sơ dành cho ứng viên Kiểm soát / Audit
    String certificationCode;
    LocalDate certificateExpiryDate;
    String issuingAuthority;
    String inspectionScope;
}

