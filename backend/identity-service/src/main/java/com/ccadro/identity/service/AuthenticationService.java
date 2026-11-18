package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.AuthenticationRequest;
import com.ccadro.identity.dto.request.ChangePasswordRequest;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.request.LogoutRequest;
import com.ccadro.identity.dto.request.RefreshTokenRequest;
import com.ccadro.identity.dto.request.RegisterCustomerRequest;
import com.ccadro.identity.dto.response.AuthenticationResponse;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.dto.response.UserSessionResponse;
import com.ccadro.identity.entity.HubAuthAuditLog;
import com.ccadro.identity.entity.InvalidatedToken;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.entity.UserSession;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.repository.HubAuthAuditLogRepository;
import com.ccadro.identity.repository.HubIamAccountRepository;
import com.ccadro.identity.repository.InvalidatedTokenRepository;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import com.ccadro.identity.repository.UserSessionRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;
    private static final int MIN_PASSWORD_LENGTH = 3;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private boolean isValidPassword(String password) {
        return password != null && password.trim().length() >= MIN_PASSWORD_LENGTH;
    }

    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;
    HubIamAccountRepository hubIamAccountRepository;
    HubAuthAuditLogRepository hubAuthAuditLogRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;
    UserSessionRepository userSessionRepository;
    TokenBlacklistRedisService tokenBlacklistRedisService;

    public AuthenticationService(
            UserRepository userRepository,
            InvalidatedTokenRepository invalidatedTokenRepository,
            HubIamAccountRepository hubIamAccountRepository,
            HubAuthAuditLogRepository hubAuthAuditLogRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this(
                userRepository,
                invalidatedTokenRepository,
                hubIamAccountRepository,
                hubAuthAuditLogRepository,
                roleRepository,
                passwordEncoder,
                null,
                null
        );
    }

    @Autowired
    public AuthenticationService(
            UserRepository userRepository,
            InvalidatedTokenRepository invalidatedTokenRepository,
            HubIamAccountRepository hubIamAccountRepository,
            HubAuthAuditLogRepository hubAuthAuditLogRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            @Autowired(required = false) UserSessionRepository userSessionRepository,
            @Autowired(required = false) TokenBlacklistRedisService tokenBlacklistRedisService) {
        this.userRepository = userRepository;
        this.invalidatedTokenRepository = invalidatedTokenRepository;
        this.hubIamAccountRepository = hubIamAccountRepository;
        this.hubAuthAuditLogRepository = hubAuthAuditLogRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.userSessionRepository = userSessionRepository;
        this.tokenBlacklistRedisService = tokenBlacklistRedisService;
    }

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration:900}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration:604800}")
    protected long REFRESHABLE_DURATION;

    @Transactional(noRollbackFor = AppException.class)
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        return authenticate(request, null, null);
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthenticationResponse authenticate(AuthenticationRequest request, String deviceInfo, String ipAddress) {
        String cleanUsername = request.getUsername() != null ? request.getUsername().trim() : "";
        log.info("Authenticating user: {}", cleanUsername);
        User user = userRepository.findByUsername(cleanUsername)
                .orElseThrow(() -> {
                    writeAudit(cleanUsername, null, null, "LOGIN_FAILED", 404, "Tài khoản không tồn tại");
                    return new AppException(ErrorCode.USER_NOT_EXISTED);
                });

        var iamAccountOpt = hubIamAccountRepository.findByUsernameIgnoreCase(user.getUsername());
        String resolvedHubCode = user.getAssignedHubCode() != null
                ? user.getAssignedHubCode()
                : iamAccountOpt.map(a -> a.getAssignedHubCode()).orElse(null);
        String resolvedShipperCode = user.getAssignedShipperCode() != null
                ? user.getAssignedShipperCode()
                : iamAccountOpt.map(a -> a.getAssignedShipperCode()).orElse(null);
        String primaryRole = resolvePrimaryRole(user, iamAccountOpt.map(a -> a.getFunctionalRole()).orElse(null));

        ensureUserEligibleToLogin(user, primaryRole, resolvedHubCode);

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) {
            int nextAttempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(nextAttempts);
            if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
                user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            }
            userRepository.save(user);

            iamAccountOpt.ifPresent(acc -> {
                acc.setFailedLoginAttempts(nextAttempts);
                acc.setLockedUntil(user.getLockedUntil());
                hubIamAccountRepository.save(acc);
            });

            writeAudit(
                    user.getUsername(),
                    primaryRole,
                    resolvedHubCode,
                    nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
                    401,
                    "Sai mật khẩu lần thứ " + nextAttempts + "/" + MAX_FAILED_LOGIN_ATTEMPTS
            );
            throw new AppException(
                    ErrorCode.UNAUTHENTICATED,
                    nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
                            ? "Sai mật khẩu 5 lần liên tiếp — Tài khoản đã bị tạm khóa 15 phút."
                            : "Mật khẩu không chính xác (Lần " + nextAttempts + "/" + MAX_FAILED_LOGIN_ATTEMPTS + ")"
            );
        }

        // Reset failure counters on successful login
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        iamAccountOpt.ifPresent(acc -> {
            acc.setFailedLoginAttempts(0);
            acc.setLockedUntil(null);
            acc.setLastLoginAt(Instant.now());
            hubIamAccountRepository.save(acc);
        });

        AuthenticationResponse response = issueTokenPairForUser(
                user,
                primaryRole,
                resolvedHubCode,
                resolvedShipperCode,
                deviceInfo,
                ipAddress
        );

        writeAudit(
                user.getUsername(),
                primaryRole,
                resolvedHubCode,
                "LOGIN_SUCCESS",
                200,
                "Đăng nhập thành công với vai trò " + primaryRole
                        + (resolvedHubCode != null ? " (Cô lập Trụ sở " + resolvedHubCode + ")" : "")
                        + (response.getSessionId() != null ? " [SID=" + response.getSessionId() + "]" : "")
        );

        return response;
    }

    @Transactional(noRollbackFor = AppException.class)
    public AuthenticationResponse refreshAccessToken(RefreshTokenRequest request, String deviceInfo, String ipAddress) {
        String rawRefreshToken = request != null ? request.getRefreshToken() : null;
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Thiếu Refresh Token để cấp lại phiên.");
        }
        if (userSessionRepository == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Chưa cấu hình UserSessionRepository.");
        }

        String tokenHash = hashRefreshToken(rawRefreshToken.trim());

        // 1. Reuse Detection: phát hiện token đã xoay vòng trước đó bị dùng lại -> thu hồi toàn bộ token family
        Optional<UserSession> reusedSession = userSessionRepository.findByPreviousRefreshTokenHash(tokenHash);
        if (reusedSession.isPresent()) {
            UserSession compromised = reusedSession.get();
            revokeFamilySessions(compromised.getFamilyId(), compromised.getUsername(), "REFRESH_TOKEN_REUSE_DETECTED");
            writeAudit(
                    compromised.getUsername(),
                    null,
                    null,
                    "TOKEN_REUSE_DETECTED",
                    401,
                    "Phát hiện Refresh Token cũ bị sử dụng lại cho familyId=" + compromised.getFamilyId() + " — đã thu hồi toàn bộ phiên."
            );
            throw new AppException(
                    ErrorCode.UNAUTHENTICATED,
                    "Phát hiện dấu hiệu dùng lại Refresh Token bất thường. Toàn bộ phiên đã bị thu hồi để bảo vệ tài khoản."
            );
        }

        // 2. Lookup active session by current refresh hash
        UserSession session = userSessionRepository.findByRefreshTokenHash(tokenHash)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED, "Refresh Token không hợp lệ hoặc không tồn tại."));

        Instant now = Instant.now();
        if (session.isRevoked() || session.getExpiresAt().isBefore(now)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Phiên đăng nhập đã bị thu hồi hoặc hết hạn.");
        }

        User user = userRepository.findByUsername(session.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        var iamAccountOpt = hubIamAccountRepository.findByUsernameIgnoreCase(user.getUsername());
        String resolvedHubCode = user.getAssignedHubCode() != null
                ? user.getAssignedHubCode()
                : iamAccountOpt.map(a -> a.getAssignedHubCode()).orElse(null);
        String resolvedShipperCode = user.getAssignedShipperCode() != null
                ? user.getAssignedShipperCode()
                : iamAccountOpt.map(a -> a.getAssignedShipperCode()).orElse(null);
        String primaryRole = resolvePrimaryRole(user, iamAccountOpt.map(a -> a.getFunctionalRole()).orElse(null));

        ensureUserEligibleToLogin(user, primaryRole, resolvedHubCode);

        // 3. Rotate Refresh Token & record previous hash for reuse detection
        String nextRawRefreshToken = generateOpaqueRefreshToken();
        String nextHash = hashRefreshToken(nextRawRefreshToken);
        Date nextRefreshExpiry = new Date(now.plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS).toEpochMilli());

        session.setPreviousRefreshTokenHash(tokenHash);
        session.setRefreshTokenHash(nextHash);
        session.setLastRefreshedAt(now);
        session.setExpiresAt(nextRefreshExpiry.toInstant());
        if (deviceInfo != null && !deviceInfo.isBlank()) {
            session.setDeviceInfo(truncateDeviceInfo(deviceInfo));
        }
        if (ipAddress != null && !ipAddress.isBlank()) {
            session.setIpAddress(ipAddress);
        }
        userSessionRepository.save(session);

        Date accessExpiry = new Date(now.plus(VALID_DURATION, ChronoUnit.SECONDS).toEpochMilli());
        String accessToken = generateToken(
                user,
                primaryRole,
                resolvedHubCode,
                resolvedShipperCode,
                accessExpiry,
                session.getId().toString()
        );

        writeAudit(
                user.getUsername(),
                primaryRole,
                resolvedHubCode,
                "TOKEN_REFRESHED",
                200,
                "Xoay vòng Refresh Token thành công [SID=" + session.getId() + "]"
        );

        return AuthenticationResponse.builder()
                .token(accessToken)
                .expiryToken(accessExpiry)
                .refreshToken(nextRawRefreshToken)
                .refreshExpiry(nextRefreshExpiry)
                .sessionId(session.getId().toString())
                .username(user.getUsername())
                .role(primaryRole)
                .assignedHubCode(resolvedHubCode)
                .assignedShipperCode(resolvedShipperCode)
                .permissions(extractPermissionList(user))
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .build();
    }

    @Transactional(readOnly = true)
    public IntrospectResponse introspect(IntrospectRequest request) {
        String token = request != null ? request.getToken() : null;
        try {
            SignedJWT jwt = verifyToken(token, false);
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            String username = claims.getSubject();
            String jti = claims.getJWTID();
            String sid = claims.getStringClaim("sid");
            Instant issuedAt = claims.getIssueTime() != null ? claims.getIssueTime().toInstant() : null;

            Optional<User> currentUser = userRepository.findByUsername(username);
            if (currentUser.isEmpty()) return IntrospectResponse.builder().valid(false).build();
            User u = currentUser.get();
            if (Boolean.TRUE.equals(u.getIsDeleted()) || !"ACTIVE".equalsIgnoreCase(u.getStatus())) {
                return IntrospectResponse.builder().valid(false).build();
            }

            // Safeguard: reject legacy tokens without sid issued well before password change
            if (sid == null && u.getPasswordChangedAt() != null && issuedAt != null
                    && issuedAt.plusSeconds(1).isBefore(u.getPasswordChangedAt())) {
                return IntrospectResponse.builder().valid(false).build();
            }

            // Check session state in DB when session repository is enabled
            if (sid != null && userSessionRepository != null) {
                try {
                    UUID sidUuid = UUID.fromString(sid);
                    Optional<UserSession> sessionOpt = userSessionRepository.findById(sidUuid);
                    if (sessionOpt.isPresent() && sessionOpt.get().isRevoked()) {
                        if (tokenBlacklistRedisService != null) {
                            tokenBlacklistRedisService.revokeSessionId(sidUuid, sessionOpt.get().getRevokeReason());
                        }
                        return IntrospectResponse.builder().valid(false).build();
                    }
                } catch (IllegalArgumentException ignored) {
                    return IntrospectResponse.builder().valid(false).build();
                }
            }

            return IntrospectResponse.builder()
                    .valid(true)
                    .email(u.getEmail())
                    .username(username)
                    .scope(buildScope(u))
                    .assignedHubCode(u.getAssignedHubCode())
                    .assignedShipperCode(u.getAssignedShipperCode())
                    .customerId(u.getCustomerId())
                    .jti(jti)
                    .sessionId(sid)
                    .build();
        } catch (AppException | JOSEException | ParseException e) {
            return IntrospectResponse.builder()
                    .valid(false)
                    .build();
        }
    }

    @Transactional
    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        String accessToken = request != null ? request.getToken() : null;
        String refreshToken = request != null ? request.getRefreshToken() : null;

        if (accessToken != null && !accessToken.isBlank()) {
            try {
                SignedJWT signToken = verifyToken(accessToken, true);
                JWTClaimsSet claims = signToken.getJWTClaimsSet();
                String jit = claims.getJWTID();
                String subject = claims.getSubject();
                String hubCode = claims.getStringClaim("assignedHubCode");
                String sid = claims.getStringClaim("sid");
                Date expiryTime = claims.getExpirationTime();
                Instant expiryInstant = expiryTime != null
                        ? expiryTime.toInstant()
                        : Instant.now().plus(VALID_DURATION, ChronoUnit.SECONDS);

                // 1. Write-through PostgreSQL blacklist
                InvalidatedToken invalidatedToken = InvalidatedToken.builder()
                        .id(jit)
                        .expiryTime(expiryInstant)
                        .username(subject)
                        .reason("LOGOUT")
                        .build();
                invalidatedTokenRepository.save(invalidatedToken);

                // 2. Write-through Redis Hot Blacklist với TTL = thời gian sống còn lại
                if (tokenBlacklistRedisService != null) {
                    tokenBlacklistRedisService.blacklistJti(jit, expiryInstant, "LOGOUT");
                }

                // 3. Revoke associated session in DB + Redis
                if (sid != null && !sid.isBlank()) {
                    revokeSessionByStringId(sid, "LOGOUT");
                }

                writeAudit(subject, null, hubCode, "LOGOUT", 200, "Đăng xuất & đưa JWT vào Redis/DB Blacklist JTI=" + jit);
                log.info("Token successfully blacklisted (PostgreSQL + Redis): JTI={}, SID={}", jit, sid);
            } catch (AppException exception) {
                log.info("Access token already expired, revoked, or invalid on logout");
            }
        }

        if (refreshToken != null && !refreshToken.isBlank() && userSessionRepository != null) {
            String hash = hashRefreshToken(refreshToken.trim());
            userSessionRepository.findByRefreshTokenHash(hash).ifPresent(session -> {
                if (!session.isRevoked()) {
                    session.setRevoked(true);
                    session.setRevokedAt(Instant.now());
                    session.setRevokeReason("LOGOUT");
                    userSessionRepository.save(session);
                }
                if (tokenBlacklistRedisService != null) {
                    tokenBlacklistRedisService.revokeSessionId(session.getId(), "LOGOUT");
                }
            });
        }
    }

    @Transactional
    public void revokeAllSessionsForUser(String username, String reason) {
        if (username == null || username.isBlank()) {
            return;
        }
        String cleanUser = username.trim();
        Instant now = Instant.now();

        if (userSessionRepository != null) {
            List<UserSession> activeSessions =
                    userSessionRepository.findByUsernameIgnoreCaseAndRevokedFalseOrderByLastRefreshedAtDesc(cleanUser);
            for (UserSession session : activeSessions) {
                session.setRevoked(true);
                session.setRevokedAt(now);
                session.setRevokeReason(reason != null ? reason : "LOGOUT_ALL");
                if (tokenBlacklistRedisService != null) {
                    tokenBlacklistRedisService.revokeSessionId(session.getId(), session.getRevokeReason());
                }
            }
            if (!activeSessions.isEmpty()) {
                userSessionRepository.saveAll(activeSessions);
            }
        }

        if (tokenBlacklistRedisService != null) {
            tokenBlacklistRedisService.markUserRevokedBefore(cleanUser, now);
        }

        writeAudit(cleanUser, null, null, "SESSIONS_REVOKED_ALL", 200,
                "Thu hồi toàn bộ phiên đăng nhập (" + (reason != null ? reason : "LOGOUT_ALL") + ")");
    }

    public List<UserSessionResponse> listActiveSessions(String username, String currentSessionId) {
        if (userSessionRepository == null || username == null || username.isBlank()) {
            return List.of();
        }
        Instant now = Instant.now();
        return userSessionRepository.findByUsernameIgnoreCaseAndRevokedFalseOrderByLastRefreshedAtDesc(username.trim())
                .stream()
                .filter(s -> s.getExpiresAt().isAfter(now))
                .map(s -> UserSessionResponse.builder()
                        .sessionId(s.getId())
                        .username(s.getUsername())
                        .deviceInfo(s.getDeviceInfo())
                        .ipAddress(s.getIpAddress())
                        .issuedAt(s.getIssuedAt())
                        .lastRefreshedAt(s.getLastRefreshedAt())
                        .expiresAt(s.getExpiresAt())
                        .current(currentSessionId != null && currentSessionId.equals(s.getId().toString()))
                        .build())
                .toList();
    }

    @Transactional
    public void revokeSingleSession(String username, UUID sessionId) {
        if (userSessionRepository == null || sessionId == null) {
            return;
        }
        UserSession session = userSessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Không tìm thấy phiên làm việc."));
        if (!session.getUsername().equalsIgnoreCase(username)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền thu hồi phiên của tài khoản khác.");
        }
        if (!session.isRevoked()) {
            session.setRevoked(true);
            session.setRevokedAt(Instant.now());
            session.setRevokeReason("USER_REVOKED_SESSION");
            userSessionRepository.save(session);
        }
        if (tokenBlacklistRedisService != null) {
            tokenBlacklistRedisService.revokeSessionId(session.getId(), "USER_REVOKED_SESSION");
        }
    }

    @Transactional
    public AuthenticationResponse registerCustomer(RegisterCustomerRequest request) {
        return registerCustomer(request, null, null);
    }

    @Transactional
    public AuthenticationResponse registerCustomer(RegisterCustomerRequest request, String deviceInfo, String ipAddress) {
        String cleanUsername = request.getUsername() != null ? request.getUsername().trim().toLowerCase(Locale.ROOT) : "";
        String cleanEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase(Locale.ROOT) : "";
        if (cleanUsername.isBlank() || cleanEmail.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Tên đăng nhập và email không được để trống");
        }
        if (userRepository.existsByUsername(cleanUsername) || userRepository.existsByEmail(cleanEmail)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Tên đăng nhập hoặc email đã được đăng ký");
        }
        if (!isValidPassword(request.getPassword())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mật khẩu tối thiểu 3 ký tự");
        }

        Role customerRole = roleRepository.findById("CUSTOMER")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò mặc định CUSTOMER"));

        User user = User.builder()
                .username(cleanUsername)
                .password(passwordEncoder.encode(request.getPassword()))
                .email(cleanEmail)
                .firstName(request.getFirstName() != null ? request.getFirstName().trim() : cleanUsername)
                .lastName(request.getLastName() != null ? request.getLastName().trim() : "")
                .status("ACTIVE")
                .roles(Set.of(customerRole))
                .lastLoginAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        AuthenticationResponse response = issueTokenPairForUser(savedUser, "CUSTOMER", null, null, deviceInfo, ipAddress);

        writeAudit(savedUser.getUsername(), "CUSTOMER", null, "REGISTER_CUSTOMER", 200,
                "Đăng ký tài khoản Khách hàng B2B mới (" + cleanEmail + ")");

        return response;
    }

    @Transactional
    public void changePassword(String authUsername, String authorizationHeader, ChangePasswordRequest request)
            throws ParseException, JOSEException {
        String resolvedUsername = authUsername != null ? authUsername.trim() : "";
        if (resolvedUsername.isBlank() && authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            SignedJWT jwt = verifyToken(authorizationHeader.substring(7).trim(), false);
            resolvedUsername = jwt.getJWTClaimsSet().getSubject();
        }
        if (resolvedUsername == null || resolvedUsername.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Cần đăng nhập hợp lệ để đổi mật khẩu");
        }

        final String targetUsername = resolvedUsername;
        User user = userRepository.findByUsername(targetUsername)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            writeAudit(targetUsername, resolvePrimaryRole(user, null), user.getAssignedHubCode(),
                    "PASSWORD_CHANGE_FAILED", 400, "Nhập sai mật khẩu hiện tại khi đổi mật khẩu");
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mật khẩu hiện tại không chính xác");
        }

        if (!isValidPassword(request.getNewPassword())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mật khẩu mới tối thiểu 3 ký tự");
        }
        if (Objects.equals(request.getCurrentPassword(), request.getNewPassword())) {
            throw new AppException(ErrorCode.INVALID_REQUEST_ARGUMENT, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        String encodedNew = passwordEncoder.encode(request.getNewPassword());
        Instant now = Instant.now();
        user.setPassword(encodedNew);
        user.setPasswordChangedAt(now);
        user.setMustChangePassword(false);
        user.setUpdatedAt(now);
        userRepository.save(user);

        hubIamAccountRepository.findByUsernameIgnoreCase(targetUsername).ifPresent(acc -> {
            acc.setPasswordHash(encodedNew);
            acc.setUpdatedAt(now);
            hubIamAccountRepository.save(acc);
        });

        // Thu hồi toàn bộ token & phiên cũ sau khi đổi mật khẩu
        revokeAllSessionsForUser(targetUsername, "PASSWORD_CHANGED");

        writeAudit(targetUsername, resolvePrimaryRole(user, null), user.getAssignedHubCode(),
                "PASSWORD_CHANGED", 200, "Đổi mật khẩu thành công & thu hồi toàn bộ phiên cũ");
    }

    private AuthenticationResponse issueTokenPairForUser(
            User user,
            String primaryRole,
            String resolvedHubCode,
            String resolvedShipperCode,
            String deviceInfo,
            String ipAddress) {
        Instant now = Instant.now();
        Date expiryDate = new Date(now.plus(VALID_DURATION, ChronoUnit.SECONDS).toEpochMilli());
        Date refreshExpiryDate = new Date(now.plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS).toEpochMilli());

        String sessionId = null;
        String rawRefreshToken = null;

        if (userSessionRepository != null) {
            UUID sid = UUID.randomUUID();
            rawRefreshToken = generateOpaqueRefreshToken();
            UserSession session = UserSession.builder()
                    .id(sid)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .familyId(UUID.randomUUID())
                    .refreshTokenHash(hashRefreshToken(rawRefreshToken))
                    .deviceInfo(truncateDeviceInfo(deviceInfo))
                    .ipAddress(ipAddress)
                    .issuedAt(now)
                    .lastRefreshedAt(now)
                    .expiresAt(refreshExpiryDate.toInstant())
                    .revoked(false)
                    .build();
            userSessionRepository.save(session);
            sessionId = sid.toString();
        }

        String token = generateToken(user, primaryRole, resolvedHubCode, resolvedShipperCode, expiryDate, sessionId);

        return AuthenticationResponse.builder()
                .token(token)
                .expiryToken(expiryDate)
                .refreshToken(rawRefreshToken)
                .refreshExpiry(refreshExpiryDate)
                .sessionId(sessionId)
                .username(user.getUsername())
                .role(primaryRole)
                .assignedHubCode(resolvedHubCode)
                .assignedShipperCode(resolvedShipperCode)
                .permissions(extractPermissionList(user))
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .build();
    }

    private void ensureUserEligibleToLogin(User user, String primaryRole, String resolvedHubCode) {
        if (Boolean.TRUE.equals(user.getIsDeleted())) {
            writeAudit(user.getUsername(), primaryRole, resolvedHubCode, "LOGIN_BLOCKED_DELETED", 403,
                    "Tài khoản đã bị xóa mềm (is_deleted = true)");
            throw new AppException(ErrorCode.USER_LOCKED,
                    "Tài khoản đã bị xóa mềm khỏi danh sách hoạt động. Liên hệ Admin để khôi phục.");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            writeAudit(user.getUsername(), primaryRole, resolvedHubCode, "LOGIN_BLOCKED", 403,
                    "Tài khoản đang ở trạng thái LOCKED");
            throw new AppException(ErrorCode.USER_LOCKED);
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            writeAudit(user.getUsername(), primaryRole, resolvedHubCode, "ACCOUNT_LOCKED", 403,
                    "Tài khoản đang bị tạm khóa do nhập sai mật khẩu quá 5 lần");
            throw new AppException(ErrorCode.USER_LOCKED, "Tài khoản tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần.");
        }
    }

    private void revokeFamilySessions(UUID familyId, String username, String reason) {
        if (userSessionRepository == null || familyId == null) {
            return;
        }
        Instant now = Instant.now();
        List<UserSession> familySessions = userSessionRepository.findByFamilyIdAndRevokedFalse(familyId);
        for (UserSession s : familySessions) {
            s.setRevoked(true);
            s.setRevokedAt(now);
            s.setRevokeReason(reason);
            if (tokenBlacklistRedisService != null) {
                tokenBlacklistRedisService.revokeSessionId(s.getId(), reason);
            }
        }
        if (!familySessions.isEmpty()) {
            userSessionRepository.saveAll(familySessions);
        }
        if (tokenBlacklistRedisService != null && username != null) {
            tokenBlacklistRedisService.markUserRevokedBefore(username, now);
        }
    }

    private void revokeSessionByStringId(String sid, String reason) {
        try {
            UUID sidUuid = UUID.fromString(sid);
            if (userSessionRepository != null) {
                userSessionRepository.findById(sidUuid).ifPresent(session -> {
                    if (!session.isRevoked()) {
                        session.setRevoked(true);
                        session.setRevokedAt(Instant.now());
                        session.setRevokeReason(reason);
                        userSessionRepository.save(session);
                    }
                });
            }
            if (tokenBlacklistRedisService != null) {
                tokenBlacklistRedisService.revokeSessionId(sidUuid, reason);
            }
        } catch (IllegalArgumentException ignored) {
            // ignore non-UUID legacy sid
        }
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        if (token == null || token.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());
        SignedJWT signedJWT = SignedJWT.parse(token);
        JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

        Date expiryTime = (isRefresh)
                ? new Date(claims.getIssueTime().toInstant().plus(REFRESHABLE_DURATION, ChronoUnit.SECONDS).toEpochMilli())
                : claims.getExpirationTime();

        boolean verified = signedJWT.verify(verifier);
        if (!(verified && expiryTime.after(new Date()))) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        String jti = claims.getJWTID();
        String sid = claims.getStringClaim("sid");
        String subject = claims.getSubject();
        Instant issuedAt = claims.getIssueTime() != null ? claims.getIssueTime().toInstant() : null;

        // 1. Check Redis Hot Blacklist trước (O(1))
        Boolean redisBlacklisted = tokenBlacklistRedisService != null
                ? tokenBlacklistRedisService.isJtiBlacklisted(jti)
                : null;
        if (Boolean.TRUE.equals(redisBlacklisted)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // 2. Kiểm tra session & revoked_before trên Redis
        if (tokenBlacklistRedisService != null) {
            if (sid != null && Boolean.TRUE.equals(tokenBlacklistRedisService.isSessionRevoked(sid))) {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
            if (subject != null && issuedAt != null
                    && Boolean.TRUE.equals(tokenBlacklistRedisService.isIssuedBeforeUserRevocation(subject, issuedAt))) {
                throw new AppException(ErrorCode.UNAUTHENTICATED);
            }
        }

        // 3. Fallback / kiểm chứng chéo PostgreSQL invalidated_tokens nếu Redis chưa có hoặc đang offline
        if (redisBlacklisted == null && invalidatedTokenRepository.existsById(jti)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        if (Boolean.FALSE.equals(redisBlacklisted) && invalidatedTokenRepository.existsById(jti)) {
            if (tokenBlacklistRedisService != null && claims.getExpirationTime() != null) {
                tokenBlacklistRedisService.blacklistJti(jti, claims.getExpirationTime().toInstant(), "DB_WARMED");
            }
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return signedJWT;
    }

    private String generateToken(
            User user,
            String primaryRole,
            String assignedHubCode,
            String assignedShipperCode,
            Date expiryDate,
            String sessionId) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet.Builder claimsBuilder = new JWTClaimsSet.Builder()
                .subject(user.getUsername())
                .issuer("ccadro.com")
                .issueTime(new Date())
                .expirationTime(expiryDate)
                .jwtID(UUID.randomUUID().toString())
                .claim("userId", user.getId() != null ? user.getId().toString() : "")
                .claim("primaryRole", primaryRole)
                .claim("scope", buildScope(user));

        if (sessionId != null && !sessionId.isBlank()) {
            claimsBuilder.claim("sid", sessionId);
        }
        if (assignedHubCode != null && !assignedHubCode.isBlank()) {
            claimsBuilder.claim("assignedHubCode", assignedHubCode);
        }
        if (assignedShipperCode != null && !assignedShipperCode.isBlank()) {
            claimsBuilder.claim("assignedShipperCode", assignedShipperCode);
        }

        Payload payload = new Payload(claimsBuilder.build().toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            log.error("Cannot create token", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi tạo JWT token");
        }
    }

    static String generateOpaqueRefreshToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return "ccr_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hashRefreshToken(String rawRefreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(encoded.length * 2);
            for (byte b : encoded) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String truncateDeviceInfo(String ua) {
        if (ua == null || ua.isBlank()) return "Unknown Client";
        String clean = ua.trim();
        return clean.length() > 250 ? clean.substring(0, 250) : clean;
    }

    private String resolvePrimaryRole(User user, String hubFunctionalRole) {
        if (hubFunctionalRole != null && !hubFunctionalRole.isBlank()) {
            return hubFunctionalRole;
        }
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return "CUSTOMER";
        }
        List<String> priority = List.of("ADMIN", "HUB_MANAGER", "HUB_AUDITOR", "HUB_SHIPPER", "DISPATCHER", "SAFETY_MANAGER", "DRIVER", "ESG_AUDITOR", "SHIPPER", "CUSTOMER");
        Set<String> roleNames = user.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.toSet());
        return priority.stream().filter(roleNames::contains).findFirst().orElseGet(() -> roleNames.iterator().next());
    }

    private List<String> extractPermissionList(User user) {
        Set<String> perms = new LinkedHashSet<>();
        if (user.getRoles() != null) {
            user.getRoles().forEach(role -> {
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(p -> perms.add(p.getName()));
                }
            });
        }
        return new ArrayList<>(perms);
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            user.getRoles().forEach(role -> {
                stringJoiner.add("ROLE_" + role.getName());
                if (role.getPermissions() != null && !role.getPermissions().isEmpty()) {
                    role.getPermissions().forEach(permission -> stringJoiner.add(permission.getName()));
                }
            });
        }
        return stringJoiner.toString();
    }

    private void writeAudit(String username, String role, String hubCode, String eventType, int httpStatus, String detail) {
        try {
            hubAuthAuditLogRepository.save(HubAuthAuditLog.builder()
                    .username(username)
                    .functionalRole(role)
                    .hubCode(hubCode)
                    .eventType(eventType)
                    .httpStatus(httpStatus)
                    .detail(detail)
                    .build());
        } catch (Exception ex) {
            log.debug("Audit log skipped in unit context: {}", ex.getMessage());
        }
    }
}
