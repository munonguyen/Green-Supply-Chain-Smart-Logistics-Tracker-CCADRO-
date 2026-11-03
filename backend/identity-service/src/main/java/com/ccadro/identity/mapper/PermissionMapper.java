package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.request.PermissionRequest;
import com.ccadro.identity.dto.response.PermissionResponse;
import com.ccadro.identity.entity.Permission;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toEntity(PermissionRequest request);
    PermissionResponse toResponse(Permission permission);
}

