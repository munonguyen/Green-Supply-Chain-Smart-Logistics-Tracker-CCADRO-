package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.request.RoleRequest;
import com.ccadro.identity.dto.response.RoleResponse;
import com.ccadro.identity.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {PermissionMapper.class})
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toEntity(RoleRequest request);

    RoleResponse toResponse(Role role);
}

