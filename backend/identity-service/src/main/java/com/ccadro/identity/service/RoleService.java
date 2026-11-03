package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.RoleRequest;
import com.ccadro.identity.dto.response.RoleResponse;
import com.ccadro.identity.entity.Permission;
import com.ccadro.identity.entity.Role;
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

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    RoleMapper roleMapper;

    public RoleResponse create(RoleRequest request) {
        Role role = roleMapper.toEntity(request);

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
        roleRepository.deleteById(role);
    }
}

