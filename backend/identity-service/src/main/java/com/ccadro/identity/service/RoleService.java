package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.RoleRequest;
import com.ccadro.identity.dto.response.RoleResponse;
import com.ccadro.identity.entity.Permission;
import com.ccadro.identity.entity.Role;
import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;
import com.ccadro.identity.mapper.RoleMapper;
import com.ccadro.identity.repository.PermissionRepository;
import com.ccadro.identity.repository.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    public static final Set<String> SYSTEM_FIXED_ROLES = Set.of(
            "ADMIN", "DISPATCHER", "SAFETY_MANAGER", "DRIVER", "ESG_AUDITOR", "CUSTOMER", "SHIPPER"
    );

    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    RoleMapper roleMapper;

    public RoleResponse create(RoleRequest request) {
        String normalizedName = request.getName().trim().toUpperCase(Locale.ROOT);
        if (!SYSTEM_FIXED_ROLES.contains(normalizedName)) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Hệ thống khóa cứng 7 vai trò chuẩn: " + SYSTEM_FIXED_ROLES
            );
        }

        Role role = roleMapper.toEntity(request);
        role.setName(normalizedName);
        role.setSystemFixed(true);

        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            List<Permission> permissions = permissionRepository.findAllById(request.getPermissions());
            role.setPermissions(new HashSet<>(permissions));
        }

        role = roleRepository.save(role);
        return roleMapper.toResponse(role);
    }

    public List<RoleResponse> getAll() {
        return roleRepository.findAll().stream()
                .map(roleMapper::toResponse)
                .toList();
    }

    public void delete(String role) {
        String normalizedName = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (SYSTEM_FIXED_ROLES.contains(normalizedName)) {
            throw new AppException(
                    ErrorCode.UNAUTHORIZED,
                    "Không thể xóa vai trò cố định của hệ thống: " + normalizedName
            );
        }
        roleRepository.deleteById(normalizedName);
    }
}

