package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.VehicleMaintenance;
import com.ccadro.asset.dto.request.VehicleMaintenanceRequest;
import com.ccadro.asset.dto.response.VehicleMaintenanceResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VehicleMaintenanceMapper {
    VehicleMaintenance toEntity(VehicleMaintenanceRequest request);
    VehicleMaintenanceResponse toResponse(VehicleMaintenance entity);
    List<VehicleMaintenanceResponse> toResponseList(List<VehicleMaintenance> entities);
}

