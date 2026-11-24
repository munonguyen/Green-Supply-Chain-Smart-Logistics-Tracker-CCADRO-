package com.ccadro.tracking.mapper;

import com.ccadro.tracking.entity.RerouteProposal;
import com.ccadro.tracking.dto.response.RerouteProposalResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RerouteProposalMapper {
    @Mapping(target = "routeGeometryAvailable", expression = "java(entity.getProposedGeometry() != null && entity.getProposedGeometry().getNumPoints() >= 2 && entity.getSourceCandidateId() != null && entity.getProposedDurationSeconds() != null)")
    @Mapping(target = "routeWaypoints", expression = "java(entity.getProposedGeometry() == null ? java.util.List.of() : java.util.Arrays.stream(entity.getProposedGeometry().getCoordinates()).map(point -> java.util.List.of(point.y, point.x)).toList())")
    RerouteProposalResponse toResponse(RerouteProposal entity);
    List<RerouteProposalResponse> toResponseList(List<RerouteProposal> entities);
}

