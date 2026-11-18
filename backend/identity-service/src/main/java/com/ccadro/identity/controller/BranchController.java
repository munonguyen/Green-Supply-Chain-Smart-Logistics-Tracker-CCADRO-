package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.BranchRequest;
import com.ccadro.identity.dto.response.BranchResponse;
import com.ccadro.identity.service.BranchService;
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
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Branch & Hub Network Governance", description = "Quản lý danh sách Chi nhánh, Trụ sở vận hành & năng lực đội xe theo khu vực")
public class BranchController {

    BranchService branchService;

    private void requireAdmin(String callerScope) {
        CallerAuthUtils.requireAdmin(callerScope, "Chỉ Quản trị viên (ADMIN) mới có quyền thêm, sửa hoặc xóa chi nhánh.");
    }

    private void requireReadAccess(String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Không đủ quyền xem danh sách chi nhánh.",
                "ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER", "ROLE_ESG_AUDITOR"
        );
    }

    @GetMapping
    @Operation(summary = "Danh sách chi nhánh vận hành (Elastic search ?q=, lọc ?region=, ?includeDeleted=)")
    public ApiResponse<List<BranchResponse>> getBranches(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String region,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReadAccess(callerScope);
        return ApiResponse.success(branchService.getBranches(q, region, includeDeleted));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết một chi nhánh")
    public ApiResponse<BranchResponse> getBranchById(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireReadAccess(callerScope);
        return ApiResponse.success(branchService.getBranchById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới chi nhánh vận hành")
    public ApiResponse<BranchResponse> createBranch(
            @Valid @RequestBody BranchRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã tạo chi nhánh mới thành công", branchService.createBranch(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin chi nhánh")
    public ApiResponse<BranchResponse> updateBranch(
            @PathVariable UUID id,
            @Valid @RequestBody BranchRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã cập nhật thông tin chi nhánh", branchService.updateBranch(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm chi nhánh")
    public ApiResponse<BranchResponse> softDeleteBranch(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã xóa mềm chi nhánh", branchService.softDeleteBranch(id, callerUsername));
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Khôi phục chi nhánh đã xóa mềm")
    public ApiResponse<BranchResponse> restoreBranch(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã khôi phục chi nhánh", branchService.restoreBranch(id));
    }
}
