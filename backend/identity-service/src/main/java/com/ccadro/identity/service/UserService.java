package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.UserCreationRequest;
import com.ccadro.identity.dto.request.UserUpdateRequest;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.entity.Company;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.entity.User;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.UserMapper;
import com.ccadro.identity.repository.CompanyRepository;
import com.ccadro.identity.repository.HubIamAccountRepository;
import com.ccadro.identity.repository.RoleRepository;
import com.ccadro.identity.repository.UserRepository;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    HubIamAccountRepository hubIamAccountRepository;
    RoleRepository roleRepository;
    CompanyRepository companyRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    @NonFinal
    @Autowired(required = false)
    AuthenticationService authenticationService;

    public UserService(
            UserRepository userRepository,
            HubIamAccountRepository hubIamAccountRepository,
            RoleRepository roleRepository,
            UserMapper userMapper,
            PasswordEncoder passwordEncoder) {
        this(userRepository, hubIamAccountRepository, roleRepository, null, userMapper, passwordEncoder);
    }

    @Autowired
    public UserService(
            UserRepository userRepository,
            HubIamAccountRepository hubIamAccountRepository,
            RoleRepository roleRepository,
            CompanyRepository companyRepository,
            UserMapper userMapper,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.hubIamAccountRepository = hubIamAccountRepository;
        this.roleRepository = roleRepository;
        this.companyRepository = companyRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED, "Tên đăng nhập đã tồn tại trong hệ thống");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED, "Địa chỉ email đã được sử dụng");
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        applyCompanyResolution(user, request.getCompanyId(), request.getCompanyName(), request.getCustomerId(), request.getTaxCode());

        HashSet<Role> roles = new HashSet<>();
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<String> normalizedRoles = request.getRoles().stream()
                    .map(r -> r == null ? "" : r.trim().toUpperCase(Locale.ROOT))
                    .collect(java.util.stream.Collectors.toSet());
            for (String roleName : normalizedRoles) {
                if (!RoleService.SYSTEM_FIXED_ROLES.contains(roleName)) {
                    throw new AppException(
                            ErrorCode.ROLE_NOT_FOUND,
                            "Vai trò không nằm trong các vai trò chuẩn hệ thống: " + roleName
                    );
                }
            }
            roleRepository.findAllById(normalizedRoles).forEach(roles::add);
        } else {
            roleRepository.findById("CUSTOMER").ifPresent(roles::add);
        }
        user.setRoles(roles);

        user = userRepository.save(user);
        return userMapper.toResponse(user);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UserUpdateRequest request, String callerUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        boolean isRootAdmin = "admin".equalsIgnoreCase(user.getUsername());

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String nextEmail = request.getEmail().trim();
            if (!nextEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(nextEmail)) {
                throw new AppException(ErrorCode.USER_EXISTED, "Địa chỉ email đã được sử dụng bởi tài khoản khác.");
            }
            user.setEmail(nextEmail);
        }
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) user.setLastName(request.getLastName().trim());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber().trim());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle().trim());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment().trim());
        if (request.getNationalId() != null) user.setNationalId(request.getNationalId().trim());
        if (request.getWorkAddress() != null) user.setWorkAddress(request.getWorkAddress().trim());
        if (request.getNotes() != null) user.setNotes(request.getNotes().trim());
        if (request.getAssignedHubCode() != null) user.setAssignedHubCode(request.getAssignedHubCode().trim());
        if (request.getAssignedShipperCode() != null) user.setAssignedShipperCode(request.getAssignedShipperCode().trim());
        if (request.getKycStatus() != null && !request.getKycStatus().isBlank()) {
            user.setKycStatus(request.getKycStatus().trim().toUpperCase(Locale.ROOT));
        }

        if (request.getCompanyId() != null || request.getCompanyName() != null || request.getCustomerId() != null || request.getTaxCode() != null) {
            applyCompanyResolution(user, request.getCompanyId(), request.getCompanyName(), request.getCustomerId(), request.getTaxCode());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String nextStatus = request.getStatus().trim().toUpperCase(Locale.ROOT);
            if (isRootAdmin && !"ACTIVE".equals(nextStatus)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể khóa hoặc vô hiệu hóa tài khoản Root Admin.");
            }
            user.setStatus(nextStatus);
            if ("ACTIVE".equals(nextStatus)) {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
            } else if (authenticationService != null) {
                authenticationService.revokeAllSessionsForUser(user.getUsername(), "ADMIN_LOCKED_ACCOUNT");
            }
        }

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            Set<String> normalizedRoles = request.getRoles().stream()
                    .map(r -> r == null ? "" : r.trim().toUpperCase(Locale.ROOT))
                    .collect(java.util.stream.Collectors.toSet());
            if (isRootAdmin && !normalizedRoles.contains("ADMIN")) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể gỡ quyền ADMIN khỏi tài khoản Root Admin.");
            }
            for (String roleName : normalizedRoles) {
                if (!RoleService.SYSTEM_FIXED_ROLES.contains(roleName)) {
                    throw new AppException(ErrorCode.ROLE_NOT_FOUND, "Vai trò không hợp lệ: " + roleName);
                }
            }
            HashSet<Role> nextRoles = new HashSet<>();
            roleRepository.findAllById(normalizedRoles).forEach(nextRoles::add);
            user.setRoles(nextRoles);
        }

        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);
        syncMirrorHubIam(saved);
        return userMapper.toResponse(saved);
    }

    @Transactional
    public UserResponse unlockUser(UUID id, String callerUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setStatus("ACTIVE");
        user.setUpdatedAt(Instant.now());
        User saved = userRepository.save(user);
        syncMirrorHubIam(saved);
        log.info("Admin {} unlocked account {}", callerUsername, saved.getUsername());
        return userMapper.toResponse(saved);
    }

    @Transactional
    public UserResponse resetUserPassword(UUID id, String newPassword, String callerUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        Instant now = Instant.now();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(now);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setStatus("ACTIVE");
        user.setUpdatedAt(now);
        User saved = userRepository.save(user);
        if (hubIamAccountRepository != null) {
            hubIamAccountRepository.findByUsernameIgnoreCase(saved.getUsername()).ifPresent(acc -> {
                acc.setPasswordHash(saved.getPassword());
                acc.setFailedLoginAttempts(0);
                acc.setLockedUntil(null);
                acc.setStatus("ACTIVE");
                acc.setUpdatedAt(now);
                hubIamAccountRepository.save(acc);
            });
        }
        log.info("Admin {} reset password for account {}", callerUsername, saved.getUsername());
        return userMapper.toResponse(saved);
    }

    private void applyCompanyResolution(User user, UUID companyId, String companyName, String customerId, String taxCode) {
        if (companyId != null && companyRepository != null) {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy hồ sơ công ty: " + companyId));
            user.setCompanyId(company.getId());
            user.setCompanyName(company.getCompanyName());
            user.setCustomerId(company.getCompanyCode());
            user.setTaxCode(company.getTaxCode());
            return;
        }
        if (companyName != null) user.setCompanyName(companyName.trim());
        if (customerId != null) user.setCustomerId(customerId.trim().toUpperCase(Locale.ROOT));
        if (taxCode != null) user.setTaxCode(taxCode.trim());
    }

    private void syncMirrorHubIam(User saved) {
        if (hubIamAccountRepository == null) return;
        hubIamAccountRepository.findByUsernameIgnoreCase(saved.getUsername()).ifPresent(acc -> {
            acc.setStatus(saved.getStatus());
            acc.setFailedLoginAttempts(saved.getFailedLoginAttempts());
            acc.setLockedUntil(saved.getLockedUntil());
            if (saved.getAssignedHubCode() != null) acc.setAssignedHubCode(saved.getAssignedHubCode());
            if (saved.getAssignedShipperCode() != null) acc.setAssignedShipperCode(saved.getAssignedShipperCode());
            acc.setUpdatedAt(Instant.now());
            hubIamAccountRepository.save(acc);
        });
    }

    public List<UserResponse> getUsers() {
        return getUsers(null, false);
    }

    public List<UserResponse> getUsers(String q, boolean includeDeleted) {
        List<User> filtered = userRepository.findAll().stream()
                .filter(u -> includeDeleted || !Boolean.TRUE.equals(u.getIsDeleted()))
                .toList();

        List<User> ranked = ElasticSearchSupport.filterAndRank(
                filtered,
                q,
                u -> List.of(
                        new ElasticSearchSupport.WeightedField(u.getUsername(), 5.0),
                        new ElasticSearchSupport.WeightedField(u.getEmail(), 3.5),
                        new ElasticSearchSupport.WeightedField(u.getPhoneNumber(), 3.0),
                        new ElasticSearchSupport.WeightedField(
                                (u.getLastName() != null ? u.getLastName() : "") + " " + (u.getFirstName() != null ? u.getFirstName() : ""),
                                4.0
                        ),
                        new ElasticSearchSupport.WeightedField(u.getJobTitle(), 2.5),
                        new ElasticSearchSupport.WeightedField(u.getDepartment(), 2.5),
                        new ElasticSearchSupport.WeightedField(u.getCompanyName(), 3.5),
                        new ElasticSearchSupport.WeightedField(u.getCustomerId(), 3.5),
                        new ElasticSearchSupport.WeightedField(u.getTaxCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(u.getAssignedHubCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(u.getAssignedShipperCode(), 3.0),
                        new ElasticSearchSupport.WeightedField(
                                u.getRoles() != null
                                        ? u.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.joining(" "))
                                        : "",
                                2.5
                        ),
                        new ElasticSearchSupport.WeightedField(u.getStatus(), 1.5)
                )
        );
        return ranked.stream().map(userMapper::toResponse).toList();
    }

    public UserResponse getUser(UUID id) {
        return userMapper.toResponse(
                userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED))
        );
    }

    public UserResponse getUserByUsername(String username) {
        return userMapper.toResponse(
                userRepository.findByUsername(username).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED))
        );
    }

    public UserResponse softDeleteUser(UUID id, String callerUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không thể xóa mềm tài khoản Root Admin hệ thống.");
        }
        java.time.Instant now = java.time.Instant.now();
        String actor = callerUsername != null && !callerUsername.isBlank() ? callerUsername : "ADMIN";
        user.setIsDeleted(true);
        user.setDeletedAt(now);
        user.setDeletedBy(actor);
        user.setStatus("DELETED");
        user.setUpdatedAt(now);
        User saved = userRepository.save(user);
        hubIamAccountRepository.findByUsernameIgnoreCase(user.getUsername()).ifPresent(acc -> {
            acc.setIsDeleted(true);
            acc.setDeletedAt(now);
            acc.setDeletedBy(actor);
            acc.setStatus("DELETED");
            acc.setUpdatedAt(now);
            hubIamAccountRepository.save(acc);
        });
        if (authenticationService != null) {
            authenticationService.revokeAllSessionsForUser(user.getUsername(), "ADMIN_SOFT_DELETED");
        }
        return userMapper.toResponse(saved);
    }

    public UserResponse restoreUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        java.time.Instant now = java.time.Instant.now();
        user.setIsDeleted(false);
        user.setDeletedAt(null);
        user.setDeletedBy(null);
        user.setStatus("ACTIVE");
        user.setUpdatedAt(now);
        User saved = userRepository.save(user);
        hubIamAccountRepository.findByUsernameIgnoreCase(user.getUsername()).ifPresent(acc -> {
            acc.setIsDeleted(false);
            acc.setDeletedAt(null);
            acc.setDeletedBy(null);
            acc.setStatus("ACTIVE");
            acc.setUpdatedAt(now);
            hubIamAccountRepository.save(acc);
        });
        return userMapper.toResponse(saved);
    }
}

