package com.ccadro.identity.validate;

import com.ccadro.identity.dto.request.JobApplicationDecisionRequest;
import com.ccadro.identity.dto.request.JobApplicationSubmitRequest;
import com.ccadro.identity.entity.JobApplication;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.MapperTextUtils;
import com.ccadro.identity.repository.JobApplicationRepository;
import com.ccadro.identity.repository.StaffProfileRepository;
import com.ccadro.identity.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Validator quy chuẩn cho quy trình tiếp nhận Đơn xin việc & Onboarding (Zero-Trust Screening):
 * - Khóa chặn tuyệt đối tự ứng tuyển role ADMIN hoặc role khách hàng ngoài (CUSTOMER, SHIPPER).
 * - Ngăn spam / trùng lặp đơn đang mở theo Email hoặc CCCD.
 * - Kiểm soát chuyển trạng thái State Machine & điều kiện Compliance trước khi Onboard.
 */
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JobApplicationValidator {

    public static final Set<String> PUBLIC_APPLICABLE_ROLES = Set.of(
            "DRIVER", "HUB_SHIPPER", "DISPATCHER", "SAFETY_MANAGER", "ESG_AUDITOR", "HUB_MANAGER", "HUB_AUDITOR"
    );
    public static final Set<String> ALLOWED_STAGE_STATUSES = Set.of(
            "SUBMITTED", "SCREENING", "INTERVIEW_OR_DRIVE_TEST", "COMPLIANCE_CHECKING",
            "APPROVED_ONBOARDED", "REJECTED", "WITHDRAWN"
    );
    public static final Set<String> TERMINAL_STATUSES = Set.of(
            "APPROVED_ONBOARDED", "REJECTED", "WITHDRAWN"
    );

    JobApplicationRepository jobApplicationRepository;
    UserRepository userRepository;
    StaffProfileRepository staffProfileRepository;
    StaffComplianceValidator staffComplianceValidator;

    public String validatePublicApplicableRole(String roleCode) {
        String normalized = MapperTextUtils.normalizeUpper(roleCode);
        if (normalized == null || !PUBLIC_APPLICABLE_ROLES.contains(normalized)) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Vị trí ứng tuyển không hợp lệ hoặc không mở đăng ký công khai (" + roleCode
                            + "). Chỉ chấp nhận: " + PUBLIC_APPLICABLE_ROLES
            );
        }
        return normalized;
    }

    public void validateSubmitEligibility(JobApplicationSubmitRequest request, String normalizedRole) {
        String cleanEmail = MapperTextUtils.trimLowerOrNull(request.getEmail());
        String cleanNationalId = MapperTextUtils.trimOrNull(request.getNationalId());

        if (cleanEmail != null && userRepository.existsByEmail(cleanEmail)) {
            throw new AppException(ErrorCode.USER_EXISTED,
                    "Email " + cleanEmail + " đã có tài khoản nhân sự/khách hàng trong hệ thống.");
        }

        boolean hasOpenEmail = cleanEmail != null && jobApplicationRepository.findByEmailIgnoreCase(cleanEmail).stream()
                .anyMatch(app -> !TERMINAL_STATUSES.contains(MapperTextUtils.normalizeUpper(app.getApplicationStatus())));
        if (hasOpenEmail) {
            throw new AppException(ErrorCode.USER_EXISTED,
                    "Email " + cleanEmail + " đã có một hồ sơ ứng tuyển đang được xử lý.");
        }

        boolean hasOpenNationalId = cleanNationalId != null && jobApplicationRepository.findByNationalId(cleanNationalId).stream()
                .anyMatch(app -> !TERMINAL_STATUSES.contains(MapperTextUtils.normalizeUpper(app.getApplicationStatus())));
        if (hasOpenNationalId) {
            throw new AppException(ErrorCode.USER_EXISTED,
                    "Số CCCD " + cleanNationalId + " đã có hồ sơ ứng tuyển đang chờ duyệt.");
        }

        boolean staffNationalExists = cleanNationalId != null && staffProfileRepository.findAll().stream()
                .anyMatch(s -> !Boolean.TRUE.equals(s.getIsDeleted())
                        && cleanNationalId.equalsIgnoreCase(s.getNationalId()));
        if (staffNationalExists) {
            throw new AppException(ErrorCode.USER_EXISTED,
                    "Nhân sự mang CCCD " + cleanNationalId + " hiện đang công tác trong hệ thống.");
        }

        if (StaffComplianceValidator.DRIVER_ROLES.contains(normalizedRole)) {
            if (request.getLicenseNumber() == null || request.getLicenseNumber().isBlank()) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Ứng viên Lái xe / Shipper bắt buộc kê khai Số Giấy phép lái xe (GPLX).");
            }
            if (request.getLicenseExpiryDate() != null && request.getLicenseExpiryDate().isBefore(LocalDate.now())) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Giấy phép lái xe đã hết hạn, vui lòng gia hạn trước khi nộp hồ sơ.");
            }
        }
    }

    public String validateStageStatus(JobApplication existing, String targetStatus) {
        String current = MapperTextUtils.normalizeUpper(existing.getApplicationStatus());
        if (TERMINAL_STATUSES.contains(current)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Hồ sơ đã đóng ở trạng thái cuối (" + current + "), không thể chuyển bước.");
        }
        String next = MapperTextUtils.normalizeUpper(targetStatus);
        if (next == null || !ALLOWED_STAGE_STATUSES.contains(next)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Trạng thái quy trình tuyển dụng không hợp lệ: " + targetStatus);
        }
        return next;
    }

    public void validateReadyForOnboarding(JobApplication application, JobApplicationDecisionRequest decision) {
        String currentStatus = MapperTextUtils.normalizeUpper(application.getApplicationStatus());
        if ("APPROVED_ONBOARDED".equals(currentStatus) || "REJECTED".equals(currentStatus) || "WITHDRAWN".equals(currentStatus)) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Không thể xác nhận tiếp nhận hồ sơ đang ở trạng thái: " + currentStatus);
        }

        String role = MapperTextUtils.normalizeUpper(application.getAppliedRoleCode());
        boolean bgPassed = decision != null && decision.getBackgroundCheckPassed() != null
                ? decision.getBackgroundCheckPassed()
                : Boolean.TRUE;
        boolean healthPassed = decision != null && decision.getHealthCheckPassed() != null
                ? decision.getHealthCheckPassed()
                : Boolean.TRUE.equals(application.getHealthCheckDeclared());
        boolean safetyCertified = decision != null && decision.getSafetyTrainingCertified() != null
                ? decision.getSafetyTrainingCertified()
                : (Boolean.TRUE.equals(application.getSafetyTrainingDeclared())
                        && Boolean.TRUE.equals(application.getDriveTestPassed()));
        boolean signOff = decision != null && decision.getCanSignOffCompliance() != null
                ? decision.getCanSignOffCompliance()
                : Boolean.TRUE;

        if (StaffComplianceValidator.DRIVER_ROLES.contains(role) && !Boolean.TRUE.equals(application.getDriveTestPassed())) {
            boolean willApproveNow = decision != null && Boolean.TRUE.equals(decision.getApproveComplianceNow())
                    && Boolean.TRUE.equals(decision.getSafetyTrainingCertified()) && healthPassed;
            if (!willApproveNow) {
                throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Ứng viên Lái xe / Shipper phải đạt sát hạch thực hành (driveTestPassed) hoặc được thẩm định đạt an toàn & sức khỏe trước khi Onboard.");
            }
        }

        boolean approveCompliance = decision == null || !Boolean.FALSE.equals(decision.getApproveComplianceNow());
        if (approveCompliance) {
            List<String> missing = staffComplianceValidator.collectMissingApprovalRequirements(
                    role,
                    bgPassed,
                    application.getLicenseNumber(),
                    application.getLicenseClass(),
                    application.getLicenseExpiryDate(),
                    healthPassed,
                    safetyCertified,
                    application.getCertificationCode(),
                    application.getInspectionScope(),
                    application.getCertificateExpiryDate(),
                    signOff
            );
            if (!missing.isEmpty()) {
                throw new AppException(
                        ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Hồ sơ ứng tuyển chưa đủ điều kiện Onboard (" + String.join(", ", missing) + ")."
                );
            }
        }
    }
}

