package com.ccadro.routing.mapper;

import com.ccadro.routing.entity.RouteDecision;
import com.ccadro.routing.dto.request.RouteDecisionRequest;
import com.ccadro.routing.dto.response.RouteDecisionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RouteDecisionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "decidedAt", ignore = true)
    RouteDecision toEntity(RouteDecisionRequest request);

    RouteDecisionResponse toResponse(RouteDecision entity);

    List<RouteDecisionResponse> toResponseList(List<RouteDecision> entities);
}

