package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.UserCreationRequest;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.service.UserService;
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

    @PostMapping
    @Operation(summary = "Tạo mới tài khoản", description = "Đăng ký tài khoản người dùng mới và chỉ định vai trò")
    public ApiResponse<UserResponse> createUser(@RequestBody @Valid UserCreationRequest request) {
        return ApiResponse.success(userService.createUser(request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng", description = "Tra cứu toàn bộ tài khoản người dùng trong hệ thống")
    public ApiResponse<List<UserResponse>> getUsers() {
        return ApiResponse.success(userService.getUsers());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem thông tin người dùng theo ID", description = "Tra cứu chi tiết tài khoản theo UUID")
    public ApiResponse<UserResponse> getUser(@PathVariable UUID id) {
        return ApiResponse.success(userService.getUser(id));
    }

    @GetMapping("/username/{username}")
    @Operation(summary = "Xem thông tin người dùng theo username", description = "Tra cứu chi tiết tài khoản theo tên đăng nhập")
    public ApiResponse<UserResponse> getUserByUsername(@PathVariable String username) {
        return ApiResponse.success(userService.getUserByUsername(username));
    }
}

