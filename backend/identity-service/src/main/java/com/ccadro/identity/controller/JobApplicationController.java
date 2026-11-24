package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.JobApplicationDecisionRequest;
import com.ccadro.identity.dto.request.JobApplicationStageRequest;
import com.ccadro.identity.dto.response.JobApplicationApproveResponse;
import com.ccadro.identity.dto.response.JobApplicationResponse;
import com.ccadro.identity.service.JobApplicationService;
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
@RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Recruitment & Onboarding Approval", description = "Xác nhận đơn xin việc, sát hạch lái thử & tiếp nhận nhân sự (Admin / Safety / Hub Manager)")
public class JobApplicationController {

    JobApplicationService jobApplicationService;

    private void requireReviewer(String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Chỉ Quản trị viên hoặc Điều hành mới có quyền xem & thẩm định hồ sơ ứng tuyển.",
                "ROLE_ADMIN", "ROLE_OPERATOR", "ROLE_SAFETY_MANAGER", "ROLE_HUB_MANAGER"
        );
    }

    private void requireApprover(String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Chỉ Quản trị viên hoặc Điều hành Trụ sở mới có quyền xác nhận tiếp nhận & cấp tài khoản.",
                "ROLE_ADMIN", "ROLE_OPERATOR", "ROLE_HUB_MANAGER"
        );
    }

    @GetMapping
    @Operation(summary = "Danh sách hồ sơ ứng tuyển (?q=, ?roleCode=, ?status=, ?branchId=)")
    public ApiResponse<List<JobApplicationResponse>> getApplications(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID branchId,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReviewer(callerScope);
        return ApiResponse.success(jobApplicationService.getApplications(q, roleCode, status, branchId));
    }

    @PatchMapping("/{id}/stage")
    @Operation(summary = "Chuyển bước quy trình (Sơ loại / Phỏng vấn & Lái thử / Thẩm định Compliance)")
    public ApiResponse<JobApplicationResponse> advanceStage(
            @PathVariable UUID id,
            @Valid @RequestBody JobApplicationStageRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReviewer(callerScope);
        return ApiResponse.success("Đã cập nhật tiến độ hồ sơ ứng tuyển",
                jobApplicationService.advanceStage(id, request, callerUsername));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Xác nhận tiếp nhận & tự động khởi tạo StaffProfile + Tài khoản IAM (+ Driver)")
    public ApiResponse<JobApplicationApproveResponse> approveAndOnboard(
            @PathVariable UUID id,
            @RequestBody(required = false) JobApplicationDecisionRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireApprover(callerScope);
        return ApiResponse.success("Đã xác nhận tiếp nhận & khởi tạo tài khoản nhân sự thành công",
                jobApplicationService.approveAndOnboard(id, request, callerUsername));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Từ chối hồ sơ ứng tuyển")
    public ApiResponse<JobApplicationResponse> rejectApplication(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReviewer(callerScope);
        return ApiResponse.success("Đã từ chối hồ sơ ứng tuyển",
                jobApplicationService.rejectApplication(id, reason, callerUsername));
    }
}

