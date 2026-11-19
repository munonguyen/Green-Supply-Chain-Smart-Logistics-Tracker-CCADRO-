package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.ProvisionHubAccountRequest;
import com.ccadro.identity.entity.HubAuthAuditLog;
import com.ccadro.identity.entity.HubIamAccount;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.repository.HubAuthAuditLogRepository;
import com.ccadro.identity.repository.HubIamAccountRepository;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class HubIamAccountService {

    private static final Set<String> HUB_ROLES = Set.of("HUB_MANAGER", "HUB_SHIPPER", "HUB_AUDITOR");
    private static final int MIN_PASSWORD_LENGTH = 3;

    HubIamAccountRepository hubIamAccountRepository;
    HubAuthAuditLogRepository auditLogRepository;
    UserRepository userRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Autowired(required = false)
    AuthenticationService authenticationService;

    private boolean hasValidScope(String callerScope) {
        return callerScope != null && !callerScope.isBlank();
    }

    private boolean isGlobalAdmin(String callerScope) {
        return hasScope(callerScope, "ROLE_ADMIN");
    }

    private boolean hasScope(String scope, String required) {
        return scope != null && Arrays.asList(scope.trim().split("\\s+")).contains(required);
    }

    public List<HubIamAccount> getAccountsByHubScope(String requestedHubCode, String callerScope,
            String callerHubCode) {
        return getAccountsByHubScope(requestedHubCode, null, false, callerScope, callerHubCode);
    }

    public List<HubIamAccount> getAccountsByHubScope(
            String requestedHubCode,
            String q,
            boolean includeDeleted,
            String callerScope,
            String callerHubCode) {
        if (!hasValidScope(callerScope)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Yêu cầu xác thực danh tính và phân quyền (X-Auth-Scope).");
        }
        boolean isAdmin = isGlobalAdmin(callerScope);
        List<HubIamAccount> scoped;
        if (!isAdmin) {
            if (callerHubCode == null || callerHubCode.isBlank()) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản chưa được gắn Trụ sở (assignedHubCode).");
            }
            if (requestedHubCode != null && !requestedHubCode.isBlank()
                    && !requestedHubCode.trim().equalsIgnoreCase(callerHubCode.trim())) {
                recordAudit(
                        "GATEWAY_CALLER",
                        callerScope,
                        callerHubCode,
                        "CROSS_HUB_FORBIDDEN",
                        403,
                        "Từ chối xem danh sách tài khoản của Trụ sở " + requestedHubCode + " (Caller thuộc "
                                + callerHubCode + ")");
                throw new AppException(ErrorCode.UNAUTHORIZED,
                        "Bạn chỉ được xem danh bạ tài khoản thuộc Trụ sở " + callerHubCode);
            }
            scoped = hubIamAccountRepository.findByAssignedHubCodeOrderByAccountCodeAsc(callerHubCode.trim());
        } else if (requestedHubCode != null && !requestedHubCode.isBlank() && !"ALL".equalsIgnoreCase(requestedHubCode)) {
            scoped = hubIamAccountRepository.findByAssignedHubCodeOrderByAccountCodeAsc(requestedHubCode.trim());
        } else {
            scoped = hubIamAccountRepository.findAllByOrderByAccountCodeAsc();
        }

        List<HubIamAccount> activeFiltered = scoped.stream()
                .filter(acc -> includeDeleted || !Boolean.TRUE.equals(acc.getIsDeleted()))
                .toList();

        return ElasticSearchSupport.filterAndRank(
                activeFiltered,
                q,
                acc -> List.of(
                        new ElasticSearchSupport.WeightedField(acc.getUsername(), 5.0),
                        new ElasticSearchSupport.WeightedField(acc.getAccountCode(), 4.5),
                        new ElasticSearchSupport.WeightedField(acc.getFullName(), 4.0),
                        new ElasticSearchSupport.WeightedField(acc.getEmail(), 3.0),
                        new ElasticSearchSupport.WeightedField(acc.getFunctionalRole(), 2.5),
                        new ElasticSearchSupport.WeightedField(acc.getAssignedHubCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(acc.getAssignedShipperCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(acc.getScopeSummary(), 1.5)
                )
        );
    }

    public List<HubAuthAuditLog> getAuditLogs(String requestedHubCode, String callerScope, String callerHubCode) {
        if (!hasValidScope(callerScope)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Yêu cầu xác thực phân quyền để xem nhật ký bảo mật.");
        }
        boolean isAdmin = isGlobalAdmin(callerScope);
        if (!isAdmin) {
            if (callerHubCode == null || callerHubCode.isBlank()) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản chưa được gắn Trụ sở (assignedHubCode).");
            }
            return auditLogRepository.findTop50ByHubCodeOrderByCreatedAtDesc(callerHubCode.trim());
        }
        if (requestedHubCode != null && !requestedHubCode.isBlank() && !"ALL".equalsIgnoreCase(requestedHubCode)) {
            return auditLogRepository.findTop50ByHubCodeOrderByCreatedAtDesc(requestedHubCode.trim());
        }
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @Transactional
    public HubIamAccount provisionAccount(
            ProvisionHubAccountRequest request,
            String callerUsername,
            String callerScope,
            String callerHubCode) {
        if (!hasValidScope(callerScope)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Thiếu thông tin phân quyền xác thực (X-Auth-Scope).");
        }
        String role = request.getFunctionalRole().trim().toUpperCase(Locale.ROOT);
        if (!HUB_ROLES.contains(role)) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Vai trò tài khoản Trụ sở phải thuộc: HUB_MANAGER, HUB_SHIPPER, HUB_AUDITOR");
        }

        boolean isAdmin = isGlobalAdmin(callerScope);
        boolean isManager = hasScope(callerScope, "ROLE_HUB_MANAGER") || hasScope(callerScope, "HUB_ACCOUNT_MANAGE");
        if (!isAdmin && !isManager) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Chỉ ADMIN hoặc HUB_MANAGER mới có quyền cấp phát tài khoản Trụ sở.");
        }

        String hubCode = request.getAssignedHubCode().trim().toUpperCase(Locale.ROOT);
        if (!isAdmin && callerHubCode != null && !callerHubCode.isBlank() && !callerHubCode.equalsIgnoreCase(hubCode)) {
            throw new AppException(
                    ErrorCode.UNAUTHORIZED,
                    "Vi phạm cô lập Trụ sở: Trưởng Trụ sở " + callerHubCode + " không được cấp tài khoản cho Trụ sở "
                            + hubCode);
        }

        if ("HUB_SHIPPER".equals(role)
                && (request.getAssignedShipperCode() == null || request.getAssignedShipperCode().isBlank())) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Tài khoản HUB_SHIPPER bắt buộc gắn mã Shipper nội khu (ví dụ: SHP-BN-001).");
        }

        if (request.getPassword() == null || request.getPassword().trim().length() < MIN_PASSWORD_LENGTH) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Mật khẩu phải có tối thiểu 3 ký tự."
            );
        }

        String cleanUsername = request.getUsername().trim().toLowerCase(Locale.ROOT);
        String cleanEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUsername(cleanUsername)
                || hubIamAccountRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Tên đăng nhập @" + cleanUsername + " đã tồn tại.");
        }
        if (userRepository.existsByEmail(cleanEmail) || hubIamAccountRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new AppException(ErrorCode.USER_EXISTED, "Email " + cleanEmail + " đã được sử dụng.");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        Role roleEntity = roleRepository.findById(role)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy role: " + role));

        String[] parts = request.getFullName().trim().split("\\s+");
        String firstName = parts.length > 0 ? parts[parts.length - 1] : cleanUsername;
        String lastName = parts.length > 1 ? String.join(" ", Arrays.copyOf(parts, parts.length - 1)) : hubCode;

        User savedUser = userRepository.save(User.builder()
                .username(cleanUsername)
                .password(encodedPassword)
                .email(cleanEmail)
                .firstName(firstName)
                .lastName(lastName)
                .status("ACTIVE")
                .assignedHubCode(hubCode)
                .assignedShipperCode(
                        request.getAssignedShipperCode() != null && !request.getAssignedShipperCode().isBlank()
                                ? request.getAssignedShipperCode().trim().toUpperCase(Locale.ROOT)
                                : null)
                .roles(new HashSet<>(Set.of(roleEntity)))
                .passwordChangedAt(Instant.now())
                .build());

        String shipperCode = savedUser.getAssignedShipperCode();
        String accountCode = "ACC-" + hubCode.replace("HUB-", "") + "-"
                + (cleanUsername.length() > 6 ? cleanUsername.substring(cleanUsername.length() - 4) : cleanUsername)
                        .toUpperCase(Locale.ROOT)
                + "-" + String.format("%02d", (int) (Math.abs(System.currentTimeMillis()) % 99));

        boolean isMgr = "HUB_MANAGER".equals(role);
        boolean isShipper = "HUB_SHIPPER".equals(role);
        boolean isAuditor = "HUB_AUDITOR".equals(role);

        HubIamAccount iamAccount = hubIamAccountRepository.save(HubIamAccount.builder()
                .accountCode(accountCode)
                .userId(savedUser.getId())
                .username(cleanUsername)
                .passwordHash(encodedPassword)
                .passwordAlgo("BCRYPT-10")
                .fullName(request.getFullName().trim())
                .email(cleanEmail)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .functionalRole(role)
                .assignedHubCode(hubCode)
                .assignedShipperCode(shipperCode)
                .scopeSummary(request.getScopeSummary() != null && !request.getScopeSummary().isBlank()
                        ? request.getScopeSummary().trim()
                        : "Phân quyền " + role + " trực thuộc " + hubCode)
                .canIngestManifest(isMgr)
                .canAssignCodeRange(isMgr)
                .canSubmitPhotoPod(isMgr || isShipper)
                .canManageAccounts(isMgr)
                .readOnlyAudit(isAuditor)
                .status("ACTIVE")
                .createdBy(callerUsername != null && !callerUsername.isBlank() ? callerUsername : "HUB_IAM_ADMIN")
                .build());

        recordAudit(
                cleanUsername,
                role,
                hubCode,
                "ACCOUNT_PROVISIONED",
                201,
                "Cấp tài khoản " + accountCode + " (@" + cleanUsername + ", role=" + role + ") bởi "
                        + iamAccount.getCreatedBy());

        return iamAccount;
    }

    @Transactional
    public HubIamAccount toggleStatus(
            String username,
            String status,
            String callerUsername,
            String callerScope,
            String callerHubCode) {
        HubIamAccount account = hubIamAccountRepository.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if ("admin".equalsIgnoreCase(account.getUsername())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể khóa tài khoản Root Admin.");
        }

        if (!hasValidScope(callerScope)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Thiếu thông tin phân quyền xác thực (X-Auth-Scope).");
        }
        boolean isAdmin = isGlobalAdmin(callerScope);
        boolean isManager = hasScope(callerScope, "ROLE_HUB_MANAGER") || hasScope(callerScope, "HUB_ACCOUNT_MANAGE");
        if (!isAdmin && !isManager) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Chỉ ADMIN hoặc HUB_MANAGER mới có quyền khóa/mở khóa tài khoản Trụ sở.");
        }
        if (!isAdmin && (callerHubCode == null || callerHubCode.isBlank()
                || !callerHubCode.equalsIgnoreCase(account.getAssignedHubCode()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể khóa/mở khóa tài khoản thuộc Trụ sở khác.");
        }

        String nextStatus = "LOCKED".equalsIgnoreCase(status) ? "LOCKED" : "ACTIVE";
        account.setStatus(nextStatus);
        account.setUpdatedAt(Instant.now());
        if ("ACTIVE".equals(nextStatus)) {
            account.setFailedLoginAttempts(0);
            account.setLockedUntil(null);
        }
        hubIamAccountRepository.save(account);

        userRepository.findByUsername(account.getUsername()).ifPresent(u -> {
            u.setStatus(nextStatus);
            if ("ACTIVE".equals(nextStatus)) {
                u.setFailedLoginAttempts(0);
                u.setLockedUntil(null);
            }
            userRepository.save(u);
        });

        if (!"ACTIVE".equals(nextStatus) && authenticationService != null) {
            authenticationService.revokeAllSessionsForUser(account.getUsername(), "HUB_ACCOUNT_LOCKED");
        }

        recordAudit(
                account.getUsername(),
                account.getFunctionalRole(),
                account.getAssignedHubCode(),
                "STATUS_TOGGLED",
                200,
                "Đổi trạng thái @" + account.getUsername() + " → " + nextStatus + " bởi "
                        + (callerUsername != null ? callerUsername : "ADMIN"));

        return account;
    }

    @Transactional
    public HubIamAccount softDeleteAccount(
            String username,
            String callerUsername,
            String callerScope,
            String callerHubCode) {
        HubIamAccount account = hubIamAccountRepository.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if ("admin".equalsIgnoreCase(account.getUsername())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể xóa mềm tài khoản Root Admin.");
        }
        authorizeMutation(account, callerScope, callerHubCode, "xóa mềm");

        Instant now = Instant.now();
        String actor = callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN";
        account.setIsDeleted(true);
        account.setDeletedAt(now);
        account.setDeletedBy(actor);
        account.setStatus("DELETED");
        account.setUpdatedAt(now);
        hubIamAccountRepository.save(account);

        userRepository.findByUsername(account.getUsername()).ifPresent(u -> {
            u.setIsDeleted(true);
            u.setDeletedAt(now);
            u.setDeletedBy(actor);
            u.setStatus("DELETED");
            u.setUpdatedAt(now);
            userRepository.save(u);
        });

        if (authenticationService != null) {
            authenticationService.revokeAllSessionsForUser(account.getUsername(), "HUB_ACCOUNT_SOFT_DELETED");
        }

        recordAudit(
                account.getUsername(),
                account.getFunctionalRole(),
                account.getAssignedHubCode(),
                "ACCOUNT_SOFT_DELETED",
                200,
                "Xóa mềm @" + account.getUsername() + " bởi " + actor
        );
        return account;
    }

    @Transactional
    public HubIamAccount restoreAccount(
            String username,
            String callerUsername,
            String callerScope,
            String callerHubCode) {
        HubIamAccount account = hubIamAccountRepository.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        authorizeMutation(account, callerScope, callerHubCode, "khôi phục");

        Instant now = Instant.now();
        String actor = callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN";
        account.setIsDeleted(false);
        account.setDeletedAt(null);
        account.setDeletedBy(null);
        account.setStatus("ACTIVE");
        account.setFailedLoginAttempts(0);
        account.setLockedUntil(null);
        account.setUpdatedAt(now);
        hubIamAccountRepository.save(account);

        userRepository.findByUsername(account.getUsername()).ifPresent(u -> {
            u.setIsDeleted(false);
            u.setDeletedAt(null);
            u.setDeletedBy(null);
            u.setStatus("ACTIVE");
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(null);
            u.setUpdatedAt(now);
            userRepository.save(u);
        });

        recordAudit(
                account.getUsername(),
                account.getFunctionalRole(),
                account.getAssignedHubCode(),
                "ACCOUNT_RESTORED",
                200,
                "Khôi phục tài khoản @" + account.getUsername() + " bởi " + actor
        );
        return account;
    }

    private void authorizeMutation(HubIamAccount account, String callerScope, String callerHubCode, String actionLabel) {
        if (!hasValidScope(callerScope)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Thiếu thông tin phân quyền xác thực (X-Auth-Scope).");
        }
        boolean isAdmin = isGlobalAdmin(callerScope);
        boolean isManager = hasScope(callerScope, "ROLE_HUB_MANAGER") || hasScope(callerScope, "HUB_ACCOUNT_MANAGE");
        if (!isAdmin && !isManager) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Chỉ ADMIN hoặc HUB_MANAGER mới có quyền " + actionLabel + " tài khoản Trụ sở.");
        }
        if (!isAdmin && (callerHubCode == null || callerHubCode.isBlank()
                || !callerHubCode.equalsIgnoreCase(account.getAssignedHubCode()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể " + actionLabel + " tài khoản thuộc Trụ sở khác.");
        }
    }

    @Transactional
    public void recordAudit(String username, String role, String hubCode, String eventType, int httpStatus,
            String detail) {
        try {
            auditLogRepository.save(HubAuthAuditLog.builder()
                    .username(username != null ? username : "anonymous")
                    .functionalRole(role)
                    .hubCode(hubCode)
                    .eventType(eventType)
                    .httpStatus(httpStatus)
                    .detail(detail)
                    .build());
        } catch (Exception ex) {
            log.warn("Unable to write hub_auth_audit_logs: {}", ex.getMessage());
        }
    }
}
