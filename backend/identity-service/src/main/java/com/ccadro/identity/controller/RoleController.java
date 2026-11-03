package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.RoleRequest;
import com.ccadro.identity.dto.response.RoleResponse;
import com.ccadro.identity.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Role Management", description = "Quản lý vai trò (Roles) và ma trận quyền hạn")
public class RoleController {
    RoleService roleService;

    @PostMapping
    @Operation(summary = "Tạo mới Role", description = "Đăng ký vai trò mới và gán danh mục Permissions")
    public ApiResponse<RoleResponse> create(@RequestBody @Valid RoleRequest request) {
        return ApiResponse.success(roleService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách Roles", description = "Tra cứu toàn bộ vai trò và permissions đi kèm")
    public ApiResponse<List<RoleResponse>> getAll() {
        return ApiResponse.success(roleService.getAll());
    }

    @DeleteMapping("/{role}")
    @Operation(summary = "Xóa Role", description = "Xóa vai trò khỏi hệ thống")
    public ApiResponse<Void> delete(@PathVariable String role) {
        roleService.delete(role);
        return ApiResponse.success(null);
    }
}

