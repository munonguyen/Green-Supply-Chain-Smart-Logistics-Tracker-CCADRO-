package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.PermissionRequest;
import com.ccadro.identity.dto.response.PermissionResponse;
import com.ccadro.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Permission Management", description = "Quản lý danh mục quyền nguyên tử (Permissions)")
public class PermissionController {
    PermissionService permissionService;

    @PostMapping
    @Operation(summary = "Tạo mới Permission", description = "Đăng ký mã quyền nguyên tử mới")
    public ApiResponse<PermissionResponse> create(@RequestBody @Valid PermissionRequest request) {
        return ApiResponse.success(permissionService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách Permissions", description = "Tra cứu toàn bộ quyền nguyên tử trong hệ thống")
    public ApiResponse<List<PermissionResponse>> getAll() {
        return ApiResponse.success(permissionService.getAll());
    }

    @DeleteMapping("/{permission}")
    @Operation(summary = "Xóa Permission", description = "Xóa mã quyền khỏi hệ thống")
    public ApiResponse<Void> delete(@PathVariable String permission) {
        permissionService.delete(permission);
        return ApiResponse.success(null);
    }
}

