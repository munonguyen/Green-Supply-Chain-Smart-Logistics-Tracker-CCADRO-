package com.ccadro.gateway.mapper;

import com.ccadro.gateway.dto.request.IntrospectRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel="spring", unmappedTargetPolicy=ReportingPolicy.ERROR)
public interface IdentityRequestMapper {
    @Mapping(target="token", source="token")
    IntrospectRequest introspect(String token);
}
