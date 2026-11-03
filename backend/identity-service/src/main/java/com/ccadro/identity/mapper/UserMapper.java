package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.request.UserCreationRequest;
import com.ccadro.identity.dto.response.UserResponse;
import com.ccadro.identity.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {RoleMapper.class})
public interface UserMapper {
    @Mapping(target = "roles", ignore = true)
    User toEntity(UserCreationRequest request);

    UserResponse toResponse(User user);
}

