package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.ProvisionHubAccountRequest;
import com.ccadro.identity.entity.HubAuthAuditLog;
import com.ccadro.identity.dto.response.HubIamAccountResponse;
import com.ccadro.identity.mapper.HubIamAccountMapper;
import com.ccadro.identity.service.HubIamAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Hub Shipper IAM & Security Audit", description = "Kho tài khoản chuyên biệt hub_iam.hub_accounts, phân quyền role Trụ sở/Shipper & nhật ký kiểm toán bảo mật")
public class HubIamController {

    HubIamAccountService hubIamAccountService;
    HubIamAccountMapper accountMapper;

    @GetMapping("/hub-accounts")
    @Operation(summary = "Danh sách tài khoản trong kho hub_iam theo Trụ sở (Elastic search ?q= & Xóa mềm)")
    public ApiResponse<List<HubIamAccountResponse>> getHubAccounts(
            @RequestParam(required = false) String hubCode,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        return ApiResponse.success(
                hubIamAccountService.getAccountsByHubScope(hubCode, q, includeDeleted, callerScope, callerHubCode)
                        .stream().map(accountMapper::toResponse).toList()
        );
    }

    @DeleteMapping("/hub-accounts/{username}")
    @Operation(summary = "Xóa mềm tài khoản Trụ sở khỏi kho hub_iam")
    public ApiResponse<HubIamAccountResponse> softDeleteHubAccount(
            @PathVariable String username,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        return ApiResponse.success(
                "Đã xóa mềm tài khoản Trụ sở @" + username,
                accountMapper.toResponse(hubIamAccountService.softDeleteAccount(username, callerUsername, callerScope, callerHubCode))
        );
    }

    @PostMapping("/hub-accounts/{username}/restore")
    @Operation(summary = "Khôi phục tài khoản Trụ sở đã xóa mềm")
    public ApiResponse<HubIamAccountResponse> restoreHubAccount(
            @PathVariable String username,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        return ApiResponse.success(
                "Đã khôi phục tài khoản Trụ sở @" + username,
                accountMapper.toResponse(hubIamAccountService.restoreAccount(username, callerUsername, callerScope, callerHubCode))
        );
    }

    @PostMapping("/hub-accounts")
    @Operation(summary = "Cấp tài khoản mới vào kho hub_iam với mật khẩu BCrypt & cô lập Trụ sở")
    public ApiResponse<HubIamAccountResponse> provisionHubAccount(
            @RequestBody @Valid ProvisionHubAccountRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        return ApiResponse.success(
                accountMapper.toResponse(hubIamAccountService.provisionAccount(request, callerUsername, callerScope, callerHubCode))
        );
    }

    @PatchMapping("/hub-accounts/{username}/status")
    @Operation(summary = "Khóa hoặc mở khóa tài khoản trong kho hub_iam")
    public ApiResponse<HubIamAccountResponse> updateHubAccountStatus(
            @PathVariable String username,
            @RequestBody Map<String, String> payload,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        String status = payload != null ? payload.getOrDefault("status", "ACTIVE") : "ACTIVE";
        return ApiResponse.success(
                accountMapper.toResponse(hubIamAccountService.toggleStatus(username, status, callerUsername, callerScope, callerHubCode))
        );
    }

    @GetMapping("/hub-audit-logs")
    @Operation(summary = "Nhật ký kiểm toán bảo mật đăng nhập & truy cập Trụ sở")
    public ApiResponse<List<HubAuthAuditLog>> getHubAuthAuditLogs(
            @RequestParam(required = false) String hubCode,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope,
            @RequestHeader(value = "X-Auth-Hub-Code", required = false) String callerHubCode) {
        return ApiResponse.success(hubIamAccountService.getAuditLogs(hubCode, callerScope, callerHubCode));
    }
}

