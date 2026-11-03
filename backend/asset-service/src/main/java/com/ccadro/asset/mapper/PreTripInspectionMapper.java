package com.ccadro.asset.mapper;

import com.ccadro.asset.entity.PreTripInspection;
import com.ccadro.asset.entity.enums.InspectionStatus;
import com.ccadro.asset.dto.request.PreTripInspectionRequest;
import com.ccadro.asset.dto.response.PreTripInspectionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PreTripInspectionMapper {

    PreTripInspection toEntity(PreTripInspectionRequest request);

    @Mapping(target = "isPassed", expression = "java(entity.getStatus() == com.ccadro.asset.entity.enums.InspectionStatus.PASSED)")
    @Mapping(target = "inspectedAt", source = "inspectionTime")
    PreTripInspectionResponse toResponse(PreTripInspection entity);

    List<PreTripInspectionResponse> toResponseList(List<PreTripInspection> entities);
}

