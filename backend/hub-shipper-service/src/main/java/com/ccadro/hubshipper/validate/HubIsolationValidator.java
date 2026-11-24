package com.ccadro.hubshipper.validate;

import com.ccadro.hubshipper.dto.HubAuthContext;
import com.ccadro.hubshipper.entity.ContainerCargoManifestItem;
import com.ccadro.hubshipper.entity.HubLocalShipper;
import org.springframework.stereotype.Component;

/**
 * Shared RBAC & Hub-isolation validator for Hub-and-Spoke last-mile operations.
 */
@Component
public class HubIsolationValidator {

    public void requireAuthenticatedContext(HubAuthContext authContext) {
        if (authContext == null || !authContext.isAuthenticated()) {
            throw new SecurityException(
                    "Cần xác thực tài khoản hợp lệ qua API Gateway để truy cập không gian Trụ sở & Shipper.");
        }
    }

    public void validateHubReadIsolation(HubAuthContext authContext, String requestedHubCode) {
        requireAuthenticatedContext(authContext);
        if (authContext.isAdmin()) return;

        String boundHub = authContext.assignedHubCode();
        if (boundHub == null || boundHub.isBlank()) {
            throw new SecurityException("Tài khoản không được gán Trụ sở (assignedHubCode), từ chối truy cập.");
        }
        if (requestedHubCode != null && !requestedHubCode.isBlank()
                && !boundHub.equalsIgnoreCase(requestedHubCode.trim())) {
            throw new SecurityException(
                    "Vi phạm chính sách cô lập Trụ sở: Tài khoản @" + authContext.username()
                            + " thuộc " + boundHub + ", không được phép xem dữ liệu của " + requestedHubCode);
        }
    }

    public void validateShipperHubLink(HubAuthContext authContext, HubLocalShipper matchedShipper, String finalHubCode) {
        if (authContext.isShipperScoped()
                && (matchedShipper == null || !finalHubCode.equalsIgnoreCase(matchedShipper.getHubCode()))) {
            throw new SecurityException("Tài khoản chưa liên kết với Shipper trong Trụ sở");
        }
    }

    public void validateManagerRangeAuthority(HubAuthContext authContext, String targetHubCode) {
        requireAuthenticatedContext(authContext);
        if (!authContext.isAdmin() && !authContext.isManager()) {
            throw new SecurityException(
                    "Tài khoản @" + authContext.username()
                            + " không có quyền Giao nhiệm vụ theo dải mã (yêu cầu Điều hành Trụ sở hoặc Quản trị viên).");
        }
        if (!authContext.isAdmin() && authContext.assignedHubCode() != null && !authContext.assignedHubCode().isBlank()
                && !targetHubCode.equalsIgnoreCase(authContext.assignedHubCode().trim())) {
            throw new SecurityException(
                    "Vi phạm cô lập Trụ sở: Trưởng Trụ sở " + authContext.assignedHubCode()
                            + " không được giao nhiệm vụ cho Trụ sở " + targetHubCode);
        }
    }

    public void validateShipperBelongsToHub(String targetHubCode, HubLocalShipper shipper) {
        if (!targetHubCode.equalsIgnoreCase(shipper.getHubCode())) {
            throw new IllegalArgumentException(
                    "Vi phạm chính sách cô lập Trụ sở (Hub Isolation Policy): Shipper "
                            + shipper.getShipperCode() + " thuộc " + shipper.getHubCode()
                            + ", không thuộc " + targetHubCode);
        }
    }

    public void validatePhotoPodMutationAccess(HubAuthContext authContext, ContainerCargoManifestItem item) {
        requireAuthenticatedContext(authContext);
        if (Boolean.TRUE.equals(item.getIsDeleted())) {
            throw new IllegalArgumentException(
                    "Kiện hàng " + item.getItemCode() + " đã bị xóa mềm, hãy khôi phục trước khi cập nhật POD.");
        }
        if (authContext.isAuditorOnly()) {
            throw new SecurityException(
                    "Tài khoản Thanh tra POD (HUB_AUDITOR) chỉ có quyền xem (Read-only), không được cập nhật trạng thái hoặc nộp POD.");
        }
        if (!authContext.isAdmin() && !authContext.hasScope("POD_PHOTO_SUBMIT")
                && !authContext.hasScope("ROLE_DRIVER") && !authContext.hasScope("ROLE_OPERATOR")
                && !authContext.hasScope("ROLE_HUB_SHIPPER") && !authContext.hasScope("ROLE_HUB_MANAGER")
                && !authContext.hasScope("ROLE_SHIPPER")) {
            throw new SecurityException("Tài khoản không có quyền cập nhật trạng thái giao hàng / nộp Ảnh POD.");
        }
        if (!authContext.isAdmin()) {
            if (authContext.assignedHubCode() == null || authContext.assignedHubCode().isBlank()) {
                throw new SecurityException("Tài khoản thiếu phạm vi Trụ sở (assignedHubCode), không được phép cập nhật POD.");
            }
            if (!authContext.assignedHubCode().equalsIgnoreCase(item.getHubCode())) {
                throw new SecurityException(
                        "Vi phạm cô lập Trụ sở: Kiện hàng " + item.getItemCode() + " thuộc " + item.getHubCode()
                                + ", tài khoản thuộc " + authContext.assignedHubCode() + " không được thao tác.");
            }
        }
        if (authContext.isShipperScoped()) {
            if (authContext.assignedShipperCode() == null || authContext.assignedShipperCode().isBlank()) {
                throw new SecurityException("Tài khoản Shipper chưa được gán Mã Shipper (assignedShipperCode), từ chối cập nhật POD.");
            }
            if (!authContext.assignedShipperCode().equalsIgnoreCase(item.getAssignedShipperCode())) {
                throw new SecurityException(
                        "Shipper " + authContext.assignedShipperCode()
                                + " chỉ được phép nộp POD cho kiện hàng thuộc dải mã được giao cho mình.");
            }
        }
    }

    public void validatePodTransitionAndEvidence(
            ContainerCargoManifestItem item,
            String nextStatus,
            boolean requirePhoto,
            String nextPhotoUrl) {
        if ("DELIVERED_POD".equalsIgnoreCase(item.getDispatchStatus()) && !"DELIVERED_POD".equals(nextStatus)) {
            throw new IllegalArgumentException("Kiện hàng đã giao hoàn tất (DELIVERED_POD), không thể quay ngược trạng thái.");
        }
        if ("DELIVERED_POD".equals(nextStatus) && requirePhoto && (nextPhotoUrl == null || nextPhotoUrl.isBlank())) {
            throw new IllegalArgumentException(
                    "Theo Policy của Trụ sở " + item.getHubCode()
                            + ", bắt buộc đính kèm hình ảnh xác thực kiện hàng (Photo POD) trước khi hoàn tất giao hàng!");
        }
    }

    public void validateManagerItemAccess(HubAuthContext authContext, ContainerCargoManifestItem item, String action) {
        requireAuthenticatedContext(authContext);
        if (!authContext.isAdmin() && !authContext.isManager()) {
            throw new SecurityException("Chỉ ADMIN hoặc Trưởng Trụ sở (HUB_MANAGER) mới được " + action + " kiện hàng.");
        }
        if (!authContext.isAdmin() && authContext.assignedHubCode() != null
                && !authContext.assignedHubCode().equalsIgnoreCase(item.getHubCode())) {
            throw new SecurityException("Vi phạm cô lập Trụ sở: Không thể " + action + " kiện hàng của Trụ sở khác.");
        }
    }

    public void validateShipperProfileEditAccess(HubAuthContext authContext, HubLocalShipper shipper) {
        requireAuthenticatedContext(authContext);
        if (authContext.isAuditorOnly()) {
            throw new SecurityException("Tài khoản Thanh tra (HUB_AUDITOR) chỉ có quyền xem hồ sơ Shipper.");
        }
        if (authContext.isAdmin()) return;
        if (authContext.assignedHubCode() == null || !authContext.assignedHubCode().equalsIgnoreCase(shipper.getHubCode())) {
            throw new SecurityException("Vi phạm cô lập Trụ sở: Không thể cập nhật hồ sơ Shipper của Trụ sở khác.");
        }
        if (authContext.isShipperScoped()
                && (authContext.assignedShipperCode() == null
                || !authContext.assignedShipperCode().equalsIgnoreCase(shipper.getShipperCode()))) {
            throw new SecurityException("Tài khoản Shipper chỉ được phép cập nhật hồ sơ của chính mình.");
        }
    }

    public void validateShipperVerificationAccess(HubAuthContext authContext, HubLocalShipper shipper) {
        requireAuthenticatedContext(authContext);
        if (!authContext.isAdmin() && !authContext.isManager()) {
            throw new SecurityException("Chỉ Trưởng Trụ sở (HUB_MANAGER) hoặc ADMIN mới được phê duyệt xác thực hồ sơ Shipper.");
        }
        if (!authContext.isAdmin()
                && (authContext.assignedHubCode() == null || !authContext.assignedHubCode().equalsIgnoreCase(shipper.getHubCode()))) {
            throw new SecurityException("Vi phạm cô lập Trụ sở: Không thể phê duyệt hồ sơ Shipper thuộc Trụ sở khác.");
        }
    }
}

