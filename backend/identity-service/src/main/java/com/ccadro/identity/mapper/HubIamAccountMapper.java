package com.ccadro.identity.mapper;

import com.ccadro.identity.dto.response.HubIamAccountResponse;
import com.ccadro.identity.entity.HubIamAccount;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface HubIamAccountMapper {
    HubIamAccountResponse toResponse(HubIamAccount account);
}
