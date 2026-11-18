package com.ccadro.identity.validate;

import com.ccadro.identity.entity.StaffProfile;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.MapperTextUtils;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Shared compliance validator for Driver/Controller verification and recruitment onboarding.
 * Centralizes mandatory role-based readiness rules so StaffProfileService and JobApplicationService share one rulebook.
 */
@Component
public class StaffComplianceValidator {

    public static final Set<String> ALLOWED_VERIFICATION_STATUSES = Set.of(
            "PENDING_REVIEW", "APPROVED", "REVISION_REQUIRED", "REJECTED", "EXPIRED"
    );
    public static final Set<String> DRIVER_ROLES = Set.of("DRIVER", "HUB_SHIPPER");
    public static final Set<String> CONTROLLER_ROLES = Set.of("SAFETY_MANAGER", "ESG_AUDITOR", "HUB_AUDITOR");

    public String validateVerificationStatus(String status) {
        String normalized = MapperTextUtils.normalizeUpper(status);
        if (normalized == null || !ALLOWED_VERIFICATION_STATUSES.contains(normalized)) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Trạng thái kiểm duyệt không hợp lệ. Chỉ chấp nhận: " + ALLOWED_VERIFICATION_STATUSES
            );
        }
        return normalized;
    }

    public void enforceApprovalComplianceRules(StaffProfile staff) {
        List<String> missing = collectMissingApprovalRequirements(
                staff.getRoleCode(),
                staff.getBackgroundCheckPassed(),
                staff.getLicenseNumber(),
                staff.getLicenseClass(),
                staff.getLicenseExpiryDate(),
                staff.getHealthCheckPassed(),
                staff.getSafetyTrainingCertified(),
                staff.getCertificationCode(),
                staff.getInspectionScope(),
                staff.getCertificateExpiryDate(),
                staff.getCanSignOffCompliance()
        );
        if (!missing.isEmpty()) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Chưa đủ điều kiện phê duyệt nghiệp vụ (" + String.join(", ", missing) + ")."
            );
        }
    }

    public List<String> collectMissingApprovalRequirements(
            String roleCode,
            Boolean backgroundCheckPassed,
            String licenseNumber,
            String licenseClass,
            LocalDate licenseExpiryDate,
            Boolean healthCheckPassed,
            Boolean safetyTrainingCertified,
            String certificationCode,
            String inspectionScope,
            LocalDate certificateExpiryDate,
            Boolean canSignOffCompliance) {
        List<String> missing = new ArrayList<>();
        if (!Boolean.TRUE.equals(backgroundCheckPassed)) {
            missing.add("Xác minh lý lịch / CCCD");
        }
        String role = MapperTextUtils.normalizeUpper(roleCode);
        LocalDate today = LocalDate.now();
        if (role != null && DRIVER_ROLES.contains(role)) {
            if (isBlank(licenseNumber)) {
                missing.add("Số Giấy phép lái xe (GPLX)");
            }
            if (isBlank(licenseClass)) {
                missing.add("Hạng GPLX");
            }
            if (licenseExpiryDate == null || licenseExpiryDate.isBefore(today)) {
                missing.add("Hạn GPLX còn hiệu lực");
            }
            if (!Boolean.TRUE.equals(healthCheckPassed)) {
                missing.add("Giấy khám sức khỏe đạt chuẩn");
            }
            if (!Boolean.TRUE.equals(safetyTrainingCertified)) {
                missing.add("Chứng chỉ tập huấn an toàn EV/PCCC");
            }
        } else if (role != null && CONTROLLER_ROLES.contains(role)) {
            if (isBlank(certificationCode)) {
                missing.add("Mã chứng chỉ kiểm định / kiểm toán");
            }
            if (isBlank(inspectionScope)) {
                missing.add("Phạm vi kiểm soát nghiệp vụ");
            }
            if (certificateExpiryDate == null || certificateExpiryDate.isBefore(today)) {
                missing.add("Hiệu lực chứng chỉ hành nghề");
            }
            if (!Boolean.TRUE.equals(canSignOffCompliance)) {
                missing.add("Cấp quyền ký duyệt chứng từ nghiệp vụ");
            }
        }
        return missing;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}

