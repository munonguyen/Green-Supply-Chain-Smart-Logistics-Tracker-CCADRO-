package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.AuthenticationRequest;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.request.LogoutRequest;
import com.ccadro.identity.dto.response.AuthenticationResponse;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.text.ParseException;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Authentication & Authorization", description = "Quản lý phiên đăng nhập, cấp phát JWT và thẩm định Token (BookShop Identity pattern)")
public class AuthController {
    AuthenticationService authenticationService;

    @PostMapping("/token")
    @Operation(summary = "Đăng nhập và lấy JWT Token", description = "Xác thực tài khoản và trả về JWT mang scope phân quyền (roles + permissions)")
    public ApiResponse<AuthenticationResponse> authenticate(@RequestBody @Valid AuthenticationRequest request) {
        var result = authenticationService.authenticate(request);
        return ApiResponse.success(result);
    }

    @PostMapping("/introspect")
    @Operation(summary = "Kiểm tra tính hợp lệ của Token", description = "Thẩm định chữ ký số, hạn dùng và blacklist của JWT token gửi từ API Gateway")
    public ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request) {
        var result = authenticationService.introspect(request);
        return ApiResponse.success(result);
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất tài khoản", description = "Ghi nhận JTI của JWT vào danh sách đen (invalidated_tokens) để vô hiệu hóa token ngay lập tức")
    public ApiResponse<Void> logout(@RequestBody @Valid LogoutRequest request) throws ParseException, JOSEException {
        authenticationService.logout(request);
        return ApiResponse.success(null);
    }
}
