package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.dto.request.AuthenticationRequest;
import com.ccadro.identity.dto.request.ChangePasswordRequest;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.request.LogoutRequest;
import com.ccadro.identity.dto.request.RefreshTokenRequest;
import com.ccadro.identity.dto.request.RegisterCustomerRequest;
import com.ccadro.identity.dto.response.AuthenticationResponse;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.dto.response.UserSessionResponse;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.service.AuthenticationService;
import com.nimbusds.jose.JOSEException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import java.text.ParseException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Authentication & Authorization", description = "Quản lý phiên đăng nhập, Access/Refresh Token Rotation, Redis/DB Blacklist và thẩm định JWT")
public class AuthController {
    private static final String REFRESH_COOKIE_NAME = "ccadro_refresh_token";
    private static final long REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 3600L;

    AuthenticationService authenticationService;
    com.ccadro.identity.repository.UserRepository chatUsers;

    @PostMapping("/token")
    @Operation(summary = "Đăng nhập và lấy cặp Access + Refresh Token", description = "Cấp Access JWT ngắn hạn (15p) và Refresh Token (7 ngày) gắn HttpOnly Cookie + bảng user_sessions")
    public ApiResponse<AuthenticationResponse> authenticate(
            @RequestBody @Valid AuthenticationRequest request,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthenticationResponse result = authenticationService.authenticate(
                request, userAgent, extractClientIp(httpRequest));
        attachRefreshCookie(httpResponse, result.getRefreshToken(), REFRESH_COOKIE_MAX_AGE_SECONDS, httpRequest.isSecure());
        return ApiResponse.success(result);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Xoay vòng Refresh Token & cấp Access Token mới", description = "Refresh Token Rotation + Phát hiện tái sử dụng Token cũ (Reuse Detection)")
    public ApiResponse<AuthenticationResponse> refresh(
            @RequestBody(required = false) RefreshTokenRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieRefreshToken,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String effectiveRefreshToken = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;
        AuthenticationResponse result = authenticationService.refreshAccessToken(
                RefreshTokenRequest.builder().refreshToken(effectiveRefreshToken).build(),
                userAgent,
                extractClientIp(httpRequest)
        );
        attachRefreshCookie(httpResponse, result.getRefreshToken(), REFRESH_COOKIE_MAX_AGE_SECONDS, httpRequest.isSecure());
        return ApiResponse.success(result);
    }

    @PostMapping("/introspect")
    @Operation(summary = "Kiểm tra tính hợp lệ của Token", description = "Thẩm định chữ ký số, hạn dùng, Redis Hot-Blacklist & PostgreSQL invalidated_tokens")
    public ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request) {
        var result = authenticationService.introspect(request);
        return ApiResponse.success(result);
    }

    /** Minimal authenticated directory: no email, phone, password hash or identity documents. */
    @GetMapping("/chat-directory")
    public ApiResponse<java.util.List<java.util.Map<String, String>>> chatDirectory(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        var request = new IntrospectRequest();
        request.setToken(authorization.substring(7));
        if (!authenticationService.introspect(request).isValid()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        var directory = chatUsers.findAll().stream()
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()) && "ACTIVE".equals(u.getStatus()))
                .filter(u -> u.getLockedUntil() == null || !u.getLockedUntil().isAfter(java.time.Instant.now()))
                .map(u -> {
                    String name = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                            + (u.getLastName() == null ? "" : u.getLastName())).trim();
                    String role = u.getRoles() == null ? "USER" : u.getRoles().stream()
                            .map(r -> r.getName()).sorted().findFirst().orElse("USER");
                    return java.util.Map.of("username", u.getUsername(), "fullName", name.isBlank() ? u.getUsername() : name,
                            "role", role.replaceFirst("^ROLE_", ""));
                }).sorted(java.util.Comparator.comparing(u -> u.get("username"))).toList();
        return ApiResponse.success(directory);
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất tài khoản", description = "Đưa Access JWT JTI vào Redis Blacklist + bảng invalidated_tokens và thu hồi Session/Refresh Token")
    public ApiResponse<Void> logout(
            @RequestBody(required = false) LogoutRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieRefreshToken,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) throws ParseException, JOSEException {
        String accessToken = request != null ? request.getToken() : null;
        if ((accessToken == null || accessToken.isBlank()) && authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            accessToken = authorizationHeader.substring(7).trim();
        }
        String refreshToken = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        authenticationService.logout(LogoutRequest.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .build());
        attachRefreshCookie(httpResponse, "", 0, httpRequest.isSecure());
        return ApiResponse.success(null);
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Đăng xuất khỏi tất cả thiết bị", description = "Thu hồi toàn bộ user_sessions và đánh dấu revoked_before trên Redis cho tài khoản hiện tại")
    public ApiResponse<Void> logoutAll(
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String username = resolveCallerUsername(authUsername, authorizationHeader);
        authenticationService.revokeAllSessionsForUser(username, "USER_LOGOUT_ALL");
        attachRefreshCookie(httpResponse, "", 0, httpRequest.isSecure());
        return ApiResponse.success(null);
    }

    @GetMapping("/sessions")
    @Operation(summary = "Danh sách phiên đăng nhập đang hoạt động", description = "Hiển thị thiết bị, IP và hạn phiên của tài khoản đang đăng nhập")
    public ApiResponse<List<UserSessionResponse>> listSessions(
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        IntrospectResponse claims = introspectAuthorization(authorizationHeader);
        String username = (authUsername != null && !authUsername.isBlank()) ? authUsername.trim()
                : (claims != null ? claims.getUsername() : null);
        if (username == null || username.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return ApiResponse.success(
                authenticationService.listActiveSessions(username, claims != null ? claims.getSessionId() : null)
        );
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Thu hồi 1 phiên thiết bị cụ thể", description = "Đăng xuất từ xa phiên làm việc theo sessionId và đẩy sang Redis blacklist")
    public ApiResponse<Void> revokeSession(
            @PathVariable UUID sessionId,
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        String username = resolveCallerUsername(authUsername, authorizationHeader);
        authenticationService.revokeSingleSession(username, sessionId);
        return ApiResponse.success(null);
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản Khách hàng B2B", description = "Mở tài khoản CUSTOMER mới (luôn khóa cứng quyền CUSTOMER, mã hóa BCrypt và cấp cặp Token)")
    public ApiResponse<AuthenticationResponse> registerCustomer(
            @RequestBody @Valid RegisterCustomerRequest request,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthenticationResponse result = authenticationService.registerCustomer(
                request, userAgent, extractClientIp(httpRequest));
        attachRefreshCookie(httpResponse, result.getRefreshToken(), REFRESH_COOKIE_MAX_AGE_SECONDS, httpRequest.isSecure());
        return ApiResponse.success(result);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu tài khoản đang đăng nhập", description = "Xác thực mật khẩu hiện tại, cập nhật BCrypt hash và thu hồi toàn bộ phiên cũ qua Redis + DB")
    public ApiResponse<Void> changePassword(
            @RequestHeader(value = "X-Auth-Username", required = false) String authUsername,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody @Valid ChangePasswordRequest request) throws ParseException, JOSEException {
        authenticationService.changePassword(authUsername, authorizationHeader, request);
        return ApiResponse.success(null);
    }

    private IntrospectResponse introspectAuthorization(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        IntrospectResponse res = authenticationService.introspect(
                IntrospectRequest.builder().token(authorizationHeader.substring(7).trim()).build()
        );
        return (res != null && res.isValid()) ? res : null;
    }

    private String resolveCallerUsername(String authUsername, String authorizationHeader) {
        if (authUsername != null && !authUsername.isBlank()) {
            return authUsername.trim();
        }
        IntrospectResponse claims = introspectAuthorization(authorizationHeader);
        if (claims != null && claims.getUsername() != null && !claims.getUsername().isBlank()) {
            return claims.getUsername();
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }

    private void attachRefreshCookie(HttpServletResponse response, String tokenValue, long maxAgeSeconds, boolean isSecure) {
        if (response == null) return;
        if (tokenValue == null && maxAgeSeconds > 0) return;
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, tokenValue != null ? tokenValue : "")
                .httpOnly(true)
                .secure(isSecure)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(Duration.ofSeconds(Math.max(0, maxAgeSeconds)))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
