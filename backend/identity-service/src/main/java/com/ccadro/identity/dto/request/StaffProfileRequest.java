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
public class StaffProfileRequest {
    @NotBlank(message = "Mã nhân viên không được để trống")
    String employeeCode;

    @NotBlank(message = "Họ và tên nhân viên không được để trống")
    String fullName;

    String username;

    @NotBlank(message = "Email nhân viên không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    String email;

    String phone;

    @NotBlank(message = "Vai trò chuyên môn không được để trống")
    String roleCode;

    @NotBlank(message = "Phòng ban không được để trống")
    String department;

    @NotBlank(message = "Chức danh công việc không được để trống")
    String jobTitle;

    UUID branchId;
    String branchCode;
    String contractType;
    String shiftName;

    @Min(value = 0, message = "Lương cơ bản không được âm")
    Long baseSalaryVnd;

    LocalDate hireDate;
    String status;
    String notes;

    // Hồ sơ định danh & kiểm duyệt nghiệp vụ (Lái xe / Kiểm soát)
    String nationalId;
    String staffCategory;
    String verificationStatus;
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
}
