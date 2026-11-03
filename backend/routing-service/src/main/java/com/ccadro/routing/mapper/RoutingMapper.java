package com.ccadro.routing.mapper;

import com.ccadro.routing.dto.response.RouteCandidateResponse;
import com.ccadro.routing.entity.RouteCandidate;
import com.ccadro.routing.entity.RouteCandidateData;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", uses = {GeometryMapper.class})
public interface RoutingMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "shipmentId", ignore = true)
    @Mapping(target = "routeGeometry", source = "waypoints", qualifiedByName = "toLineString")
    @Mapping(target = "waypointsJson", source = "geometryGeoJson")
    @Mapping(target = "riskScore", ignore = true)
    @Mapping(target = "metricsBreakdownJson", ignore = true)
    @Mapping(target = "selected", ignore = true)
    @Mapping(target = "createdAt", expression = "java(java.time.Instant.now())")
    RouteCandidate toEntity(RouteCandidateData data);

    @Mapping(target = "isSelected", source = "selected")
    RouteCandidateResponse toResponse(RouteCandidate entity);

    List<RouteCandidateResponse> toResponseList(List<RouteCandidate> entities);
}
