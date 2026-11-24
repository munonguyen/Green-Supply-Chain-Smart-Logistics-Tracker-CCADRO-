package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.AuthenticationRequest;
import com.ccadro.identity.dto.request.ChangePasswordRequest;
import com.ccadro.identity.dto.request.IntrospectRequest;
import com.ccadro.identity.dto.request.LogoutRequest;
import com.ccadro.identity.dto.request.ProvisionHubAccountRequest;
import com.ccadro.identity.dto.request.RefreshTokenRequest;
import com.ccadro.identity.dto.request.RegisterCustomerRequest;
import com.ccadro.identity.dto.response.AuthenticationResponse;
import com.ccadro.identity.dto.response.IntrospectResponse;
import com.ccadro.identity.entity.HubAuthAuditLog;
import com.ccadro.identity.entity.HubIamAccount;
import com.ccadro.identity.entity.InvalidatedToken;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.entity.UserSession;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.repository.HubAuthAuditLogRepository;
import com.ccadro.identity.repository.HubIamAccountRepository;
import com.ccadro.identity.repository.InvalidatedTokenRepository;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import com.ccadro.identity.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationAndHubIamServiceTest {

    @Mock
    UserRepository userRepository;

    @Mock
    InvalidatedTokenRepository invalidatedTokenRepository;

    @Mock
    HubIamAccountRepository hubIamAccountRepository;

    @Mock
    HubAuthAuditLogRepository auditLogRepository;

    @Mock
    RoleRepository roleRepository;

    PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

    AuthenticationService authService;
    HubIamAccountService hubIamAccountService;

    @BeforeEach
    void setUp() {
        authService = new AuthenticationService(
                userRepository,
                invalidatedTokenRepository,
                hubIamAccountRepository,
                auditLogRepository,
                roleRepository,
                passwordEncoder
        );
        authService.SIGNER_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        authService.VALID_DURATION = 3600;
        authService.REFRESHABLE_DURATION = 7200;

        hubIamAccountService = new HubIamAccountService(
                hubIamAccountRepository,
                auditLogRepository,
                userRepository,
                roleRepository,
                passwordEncoder
        );
    }

    @Test
    void authenticate_shouldEmbedHubAndShipperClaimsAndEnforceFiveAttemptLockout() {
        User shipperUser = User.builder()
                .id(UUID.randomUUID())
                .username("shipper")
                .password(passwordEncoder.encode("123"))
                .email("shipper-3pl@ccadro.com")
                .status("ACTIVE")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-001")
                .roles(Set.of(Role.builder().name("HUB_SHIPPER").build()))
                .build();

        when(userRepository.findByUsername("shipper")).thenReturn(Optional.of(shipperUser));
        when(hubIamAccountRepository.findByUsernameIgnoreCase("shipper")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invalidatedTokenRepository.existsById(any())).thenReturn(false);

        // 1. Valid login with default role password "123" returns JWT containing verified Hub & Shipper claims
        AuthenticationResponse res = authService.authenticate(
                AuthenticationRequest.builder().username("shipper").password("123").build()
        );
        assertEquals("HUB_SHIPPER", res.getRole());
        assertEquals("HUB-DINHBANG-BN", res.getAssignedHubCode());
        assertEquals("SHP-BN-001", res.getAssignedShipperCode());

        IntrospectResponse introspect = authService.introspect(new IntrospectRequest(res.getToken()));
        assertTrue(introspect.isValid());
        assertEquals("shipper", introspect.getUsername());
        assertEquals("HUB-DINHBANG-BN", introspect.getAssignedHubCode());
        assertEquals("SHP-BN-001", introspect.getAssignedShipperCode());

        // 2. Five wrong password attempts lock the account for 15 minutes
        for (int i = 1; i <= 5; i++) {
            assertThrows(AppException.class, () ->
                    authService.authenticate(
                            AuthenticationRequest.builder().username("shipper").password("WrongPass99").build()
                    ));
        }
        assertEquals(5, shipperUser.getFailedLoginAttempts());
        assertNotNull(shipperUser.getLockedUntil());
        assertTrue(shipperUser.getLockedUntil().isAfter(Instant.now()));
    }

    @Test
    void authenticate_shouldSupportDispatcherEmailAndCaseInsensitiveUsername() {
        User dispatcherUser = User.builder()
                .id(UUID.randomUUID())
                .username("dispatcher")
                .password(passwordEncoder.encode("123"))
                .email("dispatcher@ccadro.com")
                .status("ACTIVE")
                .roles(Set.of(Role.builder().name("DISPATCHER").build()))
                .build();

        when(userRepository.findByUsername("dispatcher@ccadro.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase("dispatcher@ccadro.com", "dispatcher@ccadro.com"))
                .thenReturn(Optional.of(dispatcherUser));
        when(hubIamAccountRepository.findByUsernameIgnoreCase("dispatcher")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AuthenticationResponse res = authService.authenticate(
                AuthenticationRequest.builder().username("dispatcher@ccadro.com").password("123").build()
        );
        assertEquals("DISPATCHER", res.getRole());
        assertEquals("dispatcher", res.getUsername());
        assertNotNull(res.getToken());
    }

    @Test
    void provisionAccount_shouldBlockCrossHubCreationAndWeakPasswords() {
        // Cross-hub attempt by Dinh Bang Manager to create account in Amata must fail
        assertThrows(AppException.class, () ->
                hubIamAccountService.provisionAccount(
                        ProvisionHubAccountRequest.builder()
                                .username("shipper_am99")
                                .password("StrongPass123")
                                .email("am99@ccadro.com")
                                .fullName("Shipper Test")
                                .functionalRole("HUB_SHIPPER")
                                .assignedHubCode("HUB-AMATA-BH")
                                .assignedShipperCode("SHP-BH-999")
                                .build(),
                        "hub_mgr_dinhbang",
                        "ROLE_HUB_MANAGER HUB_ACCOUNT_MANAGE",
                        "HUB-DINHBANG-BN"
                ));

        // Same-hub provisioning with strong BCrypt password succeeds and records audit
        when(userRepository.existsByUsername("shipper_bn4")).thenReturn(false);
        when(userRepository.existsByEmail("bn4@ccadro.com")).thenReturn(false);
        when(hubIamAccountRepository.existsByUsernameIgnoreCase("shipper_bn4")).thenReturn(false);
        when(hubIamAccountRepository.existsByEmailIgnoreCase("bn4@ccadro.com")).thenReturn(false);
        when(roleRepository.findById("HUB_SHIPPER")).thenReturn(Optional.of(Role.builder().name("HUB_SHIPPER").build()));
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(hubIamAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(auditLogRepository.save(any(HubAuthAuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        HubIamAccount created = hubIamAccountService.provisionAccount(
                ProvisionHubAccountRequest.builder()
                        .username("shipper_bn4")
                        .password("StrongPass123")
                        .email("bn4@ccadro.com")
                        .fullName("Phạm Văn Từ Sơn")
                        .functionalRole("HUB_SHIPPER")
                        .assignedHubCode("HUB-DINHBANG-BN")
                        .assignedShipperCode("SHP-BN-004")
                        .build(),
                "hub_mgr_dinhbang",
                "ROLE_HUB_MANAGER HUB_ACCOUNT_MANAGE",
                "HUB-DINHBANG-BN"
        );

        assertEquals("HUB-DINHBANG-BN", created.getAssignedHubCode());
        assertEquals("SHP-BN-004", created.getAssignedShipperCode());
        assertTrue(passwordEncoder.matches("StrongPass123", created.getPasswordHash()));
    }

    @Test
    void hubIamService_shouldFailClosedWhenCallerScopeIsMissing() {
        assertThrows(AppException.class, () ->
                hubIamAccountService.getAccountsByHubScope("HUB-DINHBANG-BN", null, "HUB-DINHBANG-BN"));
        assertThrows(AppException.class, () ->
                hubIamAccountService.getAuditLogs("HUB-DINHBANG-BN", "   ", "HUB-DINHBANG-BN"));

        when(hubIamAccountRepository.findByUsernameIgnoreCase("shipper_bn1")).thenReturn(Optional.of(
                HubIamAccount.builder().username("shipper_bn1").assignedHubCode("HUB-DINHBANG-BN").build()
        ));
        assertThrows(AppException.class, () ->
                hubIamAccountService.toggleStatus("shipper_bn1", "LOCKED", "anonymous", null, null));
    }

    @Test
    void registerCustomerAndChangePassword_shouldIssueCustomerJwtAndSyncPasswordHash() throws Exception {
        when(userRepository.existsByUsername("b2b_client")).thenReturn(false);
        when(userRepository.existsByEmail("b2b@company.vn")).thenReturn(false);
        when(roleRepository.findById("CUSTOMER")).thenReturn(Optional.of(Role.builder().name("CUSTOMER").build()));
        when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            return u;
        });

        AuthenticationResponse reg = authService.registerCustomer(RegisterCustomerRequest.builder()
                .username("B2B_Client")
                .password("GreenChain99")
                .email("B2B@company.vn")
                .firstName("Minh")
                .lastName("Tran")
                .build());

        assertEquals("CUSTOMER", reg.getRole());
        assertEquals("b2b_client", reg.getUsername());
        assertNotNull(reg.getToken());

        User persisted = User.builder()
                .id(UUID.randomUUID())
                .username("shipper_bn1")
                .password(passwordEncoder.encode("OldPass123"))
                .email("bn1@ccadro.com")
                .assignedHubCode("HUB-DINHBANG-BN")
                .roles(Set.of(Role.builder().name("HUB_SHIPPER").build()))
                .build();
        HubIamAccount iamAccount = HubIamAccount.builder()
                .id(UUID.randomUUID())
                .username("shipper_bn1")
                .passwordHash(persisted.getPassword())
                .functionalRole("HUB_SHIPPER")
                .build();

        when(userRepository.findByUsername("shipper_bn1")).thenReturn(Optional.of(persisted));
        when(hubIamAccountRepository.findByUsernameIgnoreCase("shipper_bn1")).thenReturn(Optional.of(iamAccount));

        assertThrows(AppException.class, () ->
                authService.changePassword("shipper_bn1", null, new ChangePasswordRequest("WrongPass1", "NewPass456")));

        authService.changePassword("shipper_bn1", null, new ChangePasswordRequest("OldPass123", "NewPass456"));
        assertTrue(passwordEncoder.matches("NewPass456", persisted.getPassword()));
        assertTrue(passwordEncoder.matches("NewPass456", iamAccount.getPasswordHash()));
    }

    @Test
    void hubIamSoftDeleteRestoreAndElasticSearch_shouldFilterAndRankWithoutPhysicalDelete() {
        HubIamAccount bn2 = HubIamAccount.builder()
                .accountCode("ACC-DB-002")
                .username("shipper_bn2")
                .fullName("Nguyễn Thị Mai")
                .email("shipper.bn2@ccadro.com")
                .functionalRole("HUB_SHIPPER")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-002")
                .status("ACTIVE")
                .isDeleted(false)
                .build();
        HubIamAccount bn3 = HubIamAccount.builder()
                .accountCode("ACC-DB-003")
                .username("shipper_bn3")
                .fullName("Trần Văn Toàn")
                .email("shipper.bn3@ccadro.com")
                .functionalRole("HUB_SHIPPER")
                .assignedHubCode("HUB-DINHBANG-BN")
                .assignedShipperCode("SHP-BN-003")
                .status("ACTIVE")
                .isDeleted(false)
                .build();

        when(hubIamAccountRepository.findAllByOrderByAccountCodeAsc()).thenReturn(List.of(bn2, bn3));
        when(hubIamAccountRepository.findByUsernameIgnoreCase("shipper_bn2")).thenReturn(Optional.of(bn2));
        when(userRepository.findByUsername("shipper_bn2")).thenReturn(Optional.empty());
        when(hubIamAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // 1. Elastic-style diacritic-insensitive search finds "Nguyễn Thị Mai" via "nguyen mai"
        List<HubIamAccount> searched = hubIamAccountService.getAccountsByHubScope("ALL", "nguyen mai", false, "ROLE_ADMIN", null);
        assertEquals(1, searched.size());
        assertEquals("shipper_bn2", searched.get(0).getUsername());

        // 2. Soft delete marks isDeleted=true, preserves row, and hides it from normal queries
        HubIamAccount deleted = hubIamAccountService.softDeleteAccount("shipper_bn2", "admin", "ROLE_ADMIN", null);
        assertTrue(Boolean.TRUE.equals(deleted.getIsDeleted()));
        assertEquals("DELETED", deleted.getStatus());

        List<HubIamAccount> activeOnly = hubIamAccountService.getAccountsByHubScope("ALL", null, false, "ROLE_ADMIN", null);
        assertEquals(1, activeOnly.size());
        assertEquals("shipper_bn3", activeOnly.get(0).getUsername());

        List<HubIamAccount> withTrash = hubIamAccountService.getAccountsByHubScope("ALL", null, true, "ROLE_ADMIN", null);
        assertEquals(2, withTrash.size());

        // 3. Restore brings account back to ACTIVE
        HubIamAccount restored = hubIamAccountService.restoreAccount("shipper_bn2", "admin", "ROLE_ADMIN", null);
        assertFalse(Boolean.TRUE.equals(restored.getIsDeleted()));
        assertEquals("ACTIVE", restored.getStatus());
    }

    @Test
    void enterpriseTokenLifecycle_shouldRotateRefreshTokensDetectReuseAndBlacklistLogoutInRedisAndDb() throws Exception {
        UserSessionRepository sessionRepo = mock(UserSessionRepository.class);
        TokenBlacklistRedisService redisBlacklist = mock(TokenBlacklistRedisService.class);

        AuthenticationService enterpriseAuth = new AuthenticationService(
                userRepository,
                invalidatedTokenRepository,
                hubIamAccountRepository,
                auditLogRepository,
                roleRepository,
                passwordEncoder,
                sessionRepo,
                redisBlacklist
        );
        enterpriseAuth.SIGNER_KEY = authService.SIGNER_KEY;
        enterpriseAuth.VALID_DURATION = 900;
        enterpriseAuth.REFRESHABLE_DURATION = 604800;

        UUID userId = UUID.randomUUID();
        User adminUser = User.builder()
                .id(userId)
                .username("admin")
                .password(passwordEncoder.encode("123"))
                .email("admin@ccadro.com")
                .status("ACTIVE")
                .roles(Set.of(Role.builder().name("ADMIN").build()))
                .build();

        java.util.Map<UUID, UserSession> sessionStore = new java.util.concurrent.ConcurrentHashMap<>();
        java.util.Set<String> dbBlacklist = java.util.concurrent.ConcurrentHashMap.newKeySet();
        java.util.Set<String> redisJtiBlacklist = java.util.concurrent.ConcurrentHashMap.newKeySet();
        java.util.Set<UUID> redisRevokedSids = java.util.concurrent.ConcurrentHashMap.newKeySet();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(hubIamAccountRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(sessionRepo.save(any())).thenAnswer(inv -> {
            UserSession s = inv.getArgument(0);
            sessionStore.put(s.getId(), s);
            return s;
        });
        when(sessionRepo.findById(any())).thenAnswer(inv -> Optional.ofNullable(sessionStore.get(inv.getArgument(0))));
        when(sessionRepo.findByRefreshTokenHash(any())).thenAnswer(inv -> {
            String h = inv.getArgument(0);
            return sessionStore.values().stream().filter(s -> h.equals(s.getRefreshTokenHash())).findFirst();
        });
        when(sessionRepo.findByPreviousRefreshTokenHash(any())).thenAnswer(inv -> {
            String h = inv.getArgument(0);
            return sessionStore.values().stream().filter(s -> h.equals(s.getPreviousRefreshTokenHash())).findFirst();
        });
        when(sessionRepo.findByFamilyIdAndRevokedFalse(any())).thenAnswer(inv -> {
            UUID fid = inv.getArgument(0);
            return sessionStore.values().stream().filter(s -> fid.equals(s.getFamilyId()) && !s.isRevoked()).toList();
        });
        when(invalidatedTokenRepository.save(any())).thenAnswer(inv -> {
            InvalidatedToken t = inv.getArgument(0);
            dbBlacklist.add(t.getId());
            return t;
        });
        when(invalidatedTokenRepository.existsById(any())).thenAnswer(inv -> dbBlacklist.contains(inv.getArgument(0)));

        doAnswer(inv -> {
            redisJtiBlacklist.add(inv.getArgument(0));
            return null;
        }).when(redisBlacklist).blacklistJti(any(), any(), any());
        when(redisBlacklist.isJtiBlacklisted(any())).thenAnswer(inv -> redisJtiBlacklist.contains(inv.getArgument(0)));
        doAnswer(inv -> {
            redisRevokedSids.add(inv.getArgument(0));
            return null;
        }).when(redisBlacklist).revokeSessionId(any(), any());
        when(redisBlacklist.isSessionRevoked(any())).thenAnswer(inv -> {
            String sidStr = inv.getArgument(0);
            try {
                return redisRevokedSids.contains(UUID.fromString(sidStr));
            } catch (Exception e) {
                return false;
            }
        });
        when(redisBlacklist.isIssuedBeforeUserRevocation(any(), any())).thenReturn(false);

        // 1. Login issues Access JWT + Opaque Refresh Token & stores SHA-256 hash in session
        AuthenticationResponse loginRes = enterpriseAuth.authenticate(
                AuthenticationRequest.builder().username("admin").password("123").build(),
                "Chrome macOS",
                "127.0.0.1"
        );
        assertNotNull(loginRes.getToken());
        assertNotNull(loginRes.getRefreshToken());
        assertNotNull(loginRes.getSessionId());
        assertEquals(1, sessionStore.size());

        // 2. Refresh Token Rotation yields brand-new Refresh Token & preserves family
        AuthenticationResponse rotatedRes = enterpriseAuth.refreshAccessToken(
                RefreshTokenRequest.builder().refreshToken(loginRes.getRefreshToken()).build(),
                "Chrome macOS",
                "127.0.0.1"
        );
        assertNotNull(rotatedRes.getRefreshToken());
        assertNotEquals(loginRes.getRefreshToken(), rotatedRes.getRefreshToken());

        // 3. Replaying old rotated Refresh Token triggers Reuse Detection and revokes family!
        assertThrows(AppException.class, () ->
                enterpriseAuth.refreshAccessToken(
                        RefreshTokenRequest.builder().refreshToken(loginRes.getRefreshToken()).build(),
                        "Attacker Browser",
                        "192.0.2.99"
                )
        );
        assertTrue(sessionStore.values().stream().allMatch(UserSession::isRevoked));
        assertFalse(redisRevokedSids.isEmpty());

        // 4. Fresh Login -> Logout puts Access JTI into BOTH Redis & DB Blacklist -> introspect returns valid=false immediately
        AuthenticationResponse freshLogin = enterpriseAuth.authenticate(
                AuthenticationRequest.builder().username("admin").password("123").build(),
                "Safari macOS",
                "127.0.0.1"
        );
        assertTrue(enterpriseAuth.introspect(new IntrospectRequest(freshLogin.getToken())).isValid());

        enterpriseAuth.logout(LogoutRequest.builder()
                .token(freshLogin.getToken())
                .refreshToken(freshLogin.getRefreshToken())
                .build());

        assertFalse(dbBlacklist.isEmpty());
        assertFalse(redisJtiBlacklist.isEmpty());
        assertFalse(enterpriseAuth.introspect(new IntrospectRequest(freshLogin.getToken())).isValid());

        // 5. Refresh after logout must fail cleanly because session & refresh token are revoked -> forces fresh login
        assertThrows(AppException.class, () ->
                enterpriseAuth.refreshAccessToken(
                        RefreshTokenRequest.builder().refreshToken(freshLogin.getRefreshToken()).build(),
                        "Safari macOS",
                        "127.0.0.1"
                )
        );

        // 6. Rotation blacklists previous Access JWT JTI immediately
        AuthenticationResponse loginForRot = enterpriseAuth.authenticate(
                AuthenticationRequest.builder().username("admin").password("123").build(),
                "Safari macOS",
                "127.0.0.1"
        );
        enterpriseAuth.blacklistPreviousAccessTokenOnRotation(loginForRot.getToken(), "TOKEN_REFRESH_ROTATED");
        assertFalse(enterpriseAuth.introspect(new IntrospectRequest(loginForRot.getToken())).isValid());
    }
}

