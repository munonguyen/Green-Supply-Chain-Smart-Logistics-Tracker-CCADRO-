package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.ResetPasswordRequest;
import com.ccadro.identity.dto.request.UserCreationRequest;
import com.ccadro.identity.dto.request.UserUpdateRequest;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.service.UserService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "User Management", description = "Quản lý danh sách tài khoản người dùng và gán vai trò")
public class UserController {
    UserService userService;

    private void requireAdminScopeIfHeaderPresent(String callerScope) {
        CallerAuthUtils.requireAdmin(callerScope, "Chỉ Quản trị viên (ADMIN) mới có quyền quản lý người dùng.");
    }

    @PostMapping
    @Operation(summary = "Tạo mới tài khoản", description = "Đăng ký tài khoản người dùng mới và chỉ định vai trò")
    public ApiResponse<UserResponse> createUser(
            @RequestBody @Valid UserCreationRequest request,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success(userService.createUser(request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng (Elastic search ?q= & lọc xóa mềm)", description = "Tra cứu tài khoản người dùng với tìm kiếm đa trường không dấu và chế độ xem thùng rác")
    public ApiResponse<List<UserResponse>> getUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean includeDeleted,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        CallerAuthUtils.requireAnyRole(
                callerScope,
                "Không đủ quyền truy cập danh sách tài khoản hệ thống.",
                "ROLE_ADMIN", "ROLE_DISPATCHER", "ROLE_SAFETY_MANAGER"
        );
        return ApiResponse.success(userService.getUsers(q, includeDeleted));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem thông tin người dùng theo ID", description = "Tra cứu chi tiết tài khoản theo UUID")
    public ApiResponse<UserResponse> getUser(@PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String username,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        UserResponse result = userService.getUser(id);
        requireOwnerOrAdmin(result.getUsername(), username, scope);
        return ApiResponse.success(result);
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> getOwnProfile(@RequestHeader("X-Auth-Username") String username) {
        return ApiResponse.success(userService.getUserByUsername(username));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateOwnProfile(@RequestHeader("X-Auth-Username") String username,
            @Valid @RequestBody UserUpdateRequest input) {
        UserResponse owner = userService.getUserByUsername(username);
        UserUpdateRequest safe = UserUpdateRequest.builder().firstName(input.getFirstName()).lastName(input.getLastName())
                .email(input.getEmail()).phoneNumber(input.getPhoneNumber()).build();
        return ApiResponse.success(userService.updateUser(owner.getId(), safe, username));
    }

    @GetMapping("/username/{username}")
    @Operation(summary = "Xem thông tin người dùng theo username", description = "Tra cứu chi tiết tài khoản theo tên đăng nhập")
    public ApiResponse<UserResponse> getUserByUsername(@PathVariable String username,
            @RequestHeader(value = "X-Auth-Username", required = false) String caller,
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        requireOwnerOrAdmin(username, caller, scope);
        return ApiResponse.success(userService.getUserByUsername(username));
    }

    private void requireOwnerOrAdmin(String owner, String caller, String scope) {
        CallerAuthUtils.requireOwnerOrAdmin(owner, caller, scope);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật hồ sơ chi tiết User, thông tin Công ty & Phân quyền", description = "Admin cập nhật họ tên, liên hệ, chức vụ, công ty B2B, hub và vai trò")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody @Valid UserUpdateRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success("Đã cập nhật hồ sơ người dùng & công ty", userService.updateUser(id, request, callerUsername));
    }

    @PostMapping("/{id}/unlock")
    @Operation(summary = "Mở khóa tài khoản bị khóa brute-force hoặc khóa quản trị")
    public ApiResponse<UserResponse> unlockUser(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success("Đã mở khóa tài khoản thành công", userService.unlockUser(id, callerUsername));
    }

    @PostMapping("/{id}/reset-password")
    @Operation(summary = "Admin đặt lại mật khẩu cho người dùng")
    public ApiResponse<UserResponse> resetUserPassword(
            @PathVariable UUID id,
            @RequestBody @Valid ResetPasswordRequest request,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success("Đã đặt lại mật khẩu tài khoản", userService.resetUserPassword(id, request.getNewPassword(), callerUsername));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mềm tài khoản người dùng", description = "Đánh dấu is_deleted = true để lưu trữ kiểm toán, không xóa vật lý khỏi DB")
    public ApiResponse<UserResponse> softDeleteUser(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Username", required = false) String callerUsername,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success("Đã xóa mềm tài khoản người dùng", userService.softDeleteUser(id, callerUsername));
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Khôi phục tài khoản đã xóa mềm", description = "Khôi phục tài khoản từ trạng thái xóa mềm về ACTIVE")
    public ApiResponse<UserResponse> restoreUser(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Auth-Scope", required = false) String callerScope) {
        requireAdminScopeIfHeaderPresent(callerScope);
        return ApiResponse.success("Đã khôi phục tài khoản", userService.restoreUser(id));
    }
}

