package com.ccadro.incident.mapper;

import com.ccadro.incident.dto.request.ExceptionResolutionRequest;
import com.ccadro.incident.dto.request.FieldIncidentCreateRequest;
import com.ccadro.incident.dto.response.FieldIncidentResponse;
import com.ccadro.incident.entity.ExceptionResolution;
import com.ccadro.incident.entity.FieldIncident;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", uses = {GeometryMapper.class})
public interface FieldIncidentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "incidentLocation", expression = "java(geometryMapper.toPoint(request.getLongitude(), request.getLatitude()))")
    @Mapping(target = "reportedAt", expression = "java(java.time.Instant.now())")
    @Mapping(target = "createdAt", expression = "java(java.time.Instant.now())")
    @Mapping(target = "status", constant = "PENDING_REVIEW")
    FieldIncident toEntity(FieldIncidentCreateRequest request);

    @Mapping(target = "latitude", source = "incidentLocation", qualifiedByName = "toLatitude")
    @Mapping(target = "longitude", source = "incidentLocation", qualifiedByName = "toLongitude")
    FieldIncidentResponse toResponse(FieldIncident entity);

    List<FieldIncidentResponse> toResponseList(List<FieldIncident> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "incidentId", source = "incidentId")
    @Mapping(target = "reviewedBy", source = "request.reviewedBy")
    @Mapping(target = "decision", source = "request.decision")
    @Mapping(target = "reviewNotes", source = "request.reviewNotes")
    @Mapping(target = "resolvedAt", expression = "java(java.time.Instant.now())")
    ExceptionResolution toResolutionEntity(UUID incidentId, ExceptionResolutionRequest request);
}
