package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.CompanyRequest;
import com.ccadro.identity.dto.response.CompanyResponse;
import com.ccadro.identity.service.CompanyService;
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
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Company & Partner Governance", description = "Quản lý hồ sơ doanh nghiệp B2B, đối tác 3PL, mã số thuế & hạn mức Net-30")
public class CompanyController {

    CompanyService companyService;

    private void requireAdmin(String callerScope) {
        CallerAuthUtils.requireAdmin(callerScope, "Chỉ Quản trị viên (ADMIN) mới có quyền chỉnh sửa hồ sơ doanh nghiệp.");
    }

    @GetMapping
    @Operation(summary = "Danh sách doanh nghiệp đối tác / công ty (Elastic search ?q= & lọc xóa mềm)")
    public ApiResponse<List<CompanyResponse>> getCompanies(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Không đủ quyền truy cập danh mục doanh nghiệp.",
                "ROLE_ADMIN", "ROLE_OPERATOR", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER"
        );
        return ApiResponse.success(companyService.getCompanies(q, includeDeleted));
    }

    @PostMapping
    @Operation(summary = "Tạo mới hồ sơ doanh nghiệp / đối tác B2B")
    public ApiResponse<CompanyResponse> createCompany(
            @Valid @RequestBody CompanyRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã tạo hồ sơ doanh nghiệp thành công", companyService.createCompany(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin pháp lý, MST, hạn mức & KYC của doanh nghiệp")
    public ApiResponse<CompanyResponse> updateCompany(
            @PathVariable UUID id,
            @Valid @RequestBody CompanyRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã cập nhật hồ sơ doanh nghiệp", companyService.updateCompany(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm hồ sơ công ty")
    public ApiResponse<CompanyResponse> softDeleteCompany(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã xóa mềm doanh nghiệp", companyService.softDeleteCompany(id, callerUsername));
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Khôi phục hồ sơ công ty đã xóa mềm")
    public ApiResponse<CompanyResponse> restoreCompany(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdmin(callerScope);
        return ApiResponse.success("Đã khôi phục doanh nghiệp", companyService.restoreCompany(id));
    }
}

