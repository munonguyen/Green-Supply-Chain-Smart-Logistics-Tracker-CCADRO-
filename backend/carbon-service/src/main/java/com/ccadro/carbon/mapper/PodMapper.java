package com.ccadro.carbon.mapper;

import com.ccadro.carbon.entity.ProofOfDelivery;
import com.ccadro.carbon.dto.request.PodSubmissionRequest;
import com.ccadro.carbon.dto.response.PodResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PodMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "deliveryTime", ignore = true)
    @Mapping(target = "distanceSource", constant = "GPS_ACTUAL")
    ProofOfDelivery toEntity(PodSubmissionRequest request);

    PodResponse toResponse(ProofOfDelivery entity);

    List<PodResponse> toResponseList(List<ProofOfDelivery> entities);
}

