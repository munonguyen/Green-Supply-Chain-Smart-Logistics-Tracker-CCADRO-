package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.StaffProfileRequest;
import com.ccadro.identity.dto.request.StaffVerificationRequest;
import com.ccadro.identity.dto.response.RoleStaffSummaryResponse;
import com.ccadro.identity.dto.response.StaffProfileResponse;
import com.ccadro.identity.service.StaffProfileService;
import com.ccadro.identity.util.CallerAuthUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Staff Directory by Role", description = "Quản lý danh sách nhân viên theo từng vai trò chuyên môn & chi nhánh trực thuộc")
public class StaffProfileController {

    StaffProfileService staffProfileService;

    private void requireAdmin(String callerScope) {
        CallerAuthUtils.requireAdmin(callerScope, "Chỉ Quản trị viên (ADMIN) mới có quyền thêm, sửa hoặc xóa hồ sơ nhân viên.");
    }

    private void requireReadAccess(String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Không đủ quyền truy cập danh sách nhân viên.",
                "ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER", "ROLE_ESG_AUDITOR"
        );
    }

    private void requireComplianceVerifier(String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Chỉ ADMIN hoặc SAFETY_MANAGER mới có quyền thẩm định & phê duyệt nghiệp vụ nhân sự.",
                "ROLE_ADMIN", "ROLE_SAFETY_MANAGER"
        );
    }

    @GetMapping
    @Operation(summary = "Danh sách nhân viên (lọc ?roleCode=, ?staffCategory=, ?verificationStatus=, ?branchId=, ?status=, Elastic search ?q=)")
    public ApiResponse<List<StaffProfileResponse>> getStaff(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String staffCategory,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) UUID branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReadAccess(callerScope);
        return ApiResponse.success(staffProfileService.getStaff(
                q, roleCode, staffCategory, verificationStatus, branchId, status, includeDeleted));
    }

    @GetMapping("/summary-by-role")
    @Operation(summary = "Thống kê số lượng nhân sự và quỹ lương theo từng vai trò")
    public ApiResponse<List<RoleStaffSummaryResponse>> getRoleSummaries(
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReadAccess(callerScope);
        return ApiResponse.success(staffProfileService.getRoleSummaries());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết hồ sơ nhân viên")
    public ApiResponse<StaffProfileResponse> getStaffById(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReadAccess(callerScope);
        return ApiResponse.success(staffProfileService.getStaffById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới hồ sơ nhân viên theo vai trò & chi nhánh")
    public ApiResponse<StaffProfileResponse> createStaff(
            @Valid @RequestBody StaffProfileRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã tạo hồ sơ nhân viên thành công", staffProfileService.createStaff(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật hồ sơ, vai trò hoặc điều chuyển chi nhánh nhân viên")
    public ApiResponse<StaffProfileResponse> updateStaff(
            @PathVariable UUID id,
            @Valid @RequestBody StaffProfileRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã cập nhật hồ sơ nhân viên", staffProfileService.updateStaff(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm hồ sơ nhân viên")
    public ApiResponse<StaffProfileResponse> softDeleteStaff(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã xóa mềm hồ sơ nhân viên", staffProfileService.softDeleteStaff(id, callerUsername));
    }

    @PostMapping("/{id}/verify")
    @Operation(summary = "Kiểm duyệt hồ sơ nghiệp vụ nhân viên Lái xe / Kiểm soát")
    public ApiResponse<StaffProfileResponse> verifyStaff(
            @PathVariable UUID id,
            @Valid @RequestBody StaffVerificationRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireComplianceVerifier(callerScope);
        return ApiResponse.success("Đã cập nhật kết quả kiểm duyệt nghiệp vụ",
                staffProfileService.verifyStaff(id, request, callerUsername));
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Khôi phục hồ sơ nhân viên đã xóa mềm")
    public ApiResponse<StaffProfileResponse> restoreStaff(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã khôi phục hồ sơ nhân viên", staffProfileService.restoreStaff(id));
    }
}
