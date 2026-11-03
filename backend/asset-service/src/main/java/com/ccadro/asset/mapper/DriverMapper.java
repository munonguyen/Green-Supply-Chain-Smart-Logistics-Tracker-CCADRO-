package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.Driver;
import com.ccadro.asset.dto.request.DriverCreateRequest;
import com.ccadro.asset.dto.response.DriverResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DriverMapper {

    Driver toEntity(DriverCreateRequest request);

    DriverResponse toResponse(Driver entity);

    List<DriverResponse> toResponseList(List<Driver> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(DriverCreateRequest request, @MappingTarget Driver entity);
}

