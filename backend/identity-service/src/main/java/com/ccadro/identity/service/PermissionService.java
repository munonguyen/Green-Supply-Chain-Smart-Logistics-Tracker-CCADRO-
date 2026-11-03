package com.ccadro.identity.service;

import com.ccadro.identity.dto.request.PermissionRequest;
import com.ccadro.identity.dto.response.PermissionResponse;
import com.ccadro.identity.entity.Permission;
import com.ccadro.identity.mapper.PermissionMapper;
import com.ccadro.identity.repository.PermissionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionService {
    PermissionRepository permissionRepository;
    PermissionMapper permissionMapper;

    public PermissionResponse create(PermissionRequest request) {
        Permission permission = permissionMapper.toEntity(request);
        permission = permissionRepository.save(permission);
        return permissionMapper.toResponse(permission);
    }

    public List<PermissionResponse> getAll() {
        return permissionRepository.findAll().stream()
                .map(permissionMapper::toResponse)
                .toList();
    }

    public void delete(String permission) {
        permissionRepository.deleteById(permission);
    }
}

