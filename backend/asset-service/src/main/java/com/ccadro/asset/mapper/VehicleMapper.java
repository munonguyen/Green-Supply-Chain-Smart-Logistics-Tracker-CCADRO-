package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.Vehicle;
import com.ccadro.asset.dto.request.VehicleCreateRequest;
import com.ccadro.asset.dto.response.VehicleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VehicleMapper {

    Vehicle toEntity(VehicleCreateRequest request);

    VehicleResponse toResponse(Vehicle entity);

    List<VehicleResponse> toResponseList(List<Vehicle> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target ="status",ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(VehicleCreateRequest request, @MappingTarget Vehicle entity);
}

