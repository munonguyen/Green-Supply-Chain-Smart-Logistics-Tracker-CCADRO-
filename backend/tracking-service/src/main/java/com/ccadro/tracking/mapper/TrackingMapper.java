package com.ccadro.tracking.mapper;

import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.dto.request.TelemetryIngestRequest;
import com.ccadro.tracking.dto.response.DeviationAlertResponse;
import com.ccadro.tracking.dto.response.TelemetryResponse;
import com.ccadro.tracking.entity.DeviationAlert;
import com.ccadro.tracking.entity.TelemetryEvent;
import org.locationtech.jts.geom.Point;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", uses = {GeometryMapper.class})
public interface TrackingMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "locationGeom", expression = "java(geometryMapper.toPoint(request.getLongitude(), request.getLatitude()))")
    @Mapping(target = "timestamp", expression = "java(request.getTimestamp() != null ? request.getTimestamp() : java.time.Instant.now())")
    @Mapping(target = "distanceFromRouteMeters", ignore = true)
    @Mapping(target = "rawPayload", ignore = true)
    @Mapping(target = "batteryPercentage", ignore = true)
    TelemetryEvent toEntity(TelemetryIngestRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "locationGeom", expression = "java(geometryMapper.toPoint(request.getLongitude(), request.getLatitude()))")
    @Mapping(target = "timestamp", expression = "java(request.getTimestamp() != null ? request.getTimestamp() : java.time.Instant.now())")
    @Mapping(target = "distanceFromRouteMeters", ignore = true)
    @Mapping(target = "batteryPercentage", ignore = true)
    TelemetryEvent toEntity(IngestTelemetryRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "detectedAt", expression = "java(java.time.Instant.now())")
    @Mapping(target = "resolvedAt", ignore = true)
    @Mapping(target = "persistenceCount", constant = "1")
    @Mapping(target = "durationSeconds", constant = "0")
    @Mapping(target = "thresholdVersion", constant = "v1.0")
    DeviationAlert toDeviationAlert(UUID tripId, String severity, BigDecimal deviationDistanceMeters, Point locationGeom, String status);

    @Mapping(target = "latitude", source = "locationGeom", qualifiedByName = "toLatitude")
    @Mapping(target = "longitude", source = "locationGeom", qualifiedByName = "toLongitude")
    TelemetryResponse toTelemetryResponse(TelemetryEvent entity);

    @Mapping(target = "latitude", source = "locationGeom", qualifiedByName = "toLatitude")
    @Mapping(target = "longitude", source = "locationGeom", qualifiedByName = "toLongitude")
    DeviationAlertResponse toDeviationAlertResponse(DeviationAlert entity);

    List<DeviationAlertResponse> toDeviationAlertResponseList(List<DeviationAlert> entities);
}
