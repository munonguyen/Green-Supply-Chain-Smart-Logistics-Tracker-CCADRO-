package com.ccadro.shipment.mapper;

import com.ccadro.shipment.dto.request.CreateShipmentRequest;
import com.ccadro.shipment.dto.request.ShipmentCreationRequest;
import com.ccadro.shipment.dto.response.ShipmentResponse;
import com.ccadro.shipment.entity.Shipment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", uses = {GeometryMapper.class})
public interface ShipmentMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "originGeom", expression = "java(geometryMapper.toPoint(request.getOriginLongitude(), request.getOriginLatitude()))")
    @Mapping(target = "destinationGeom", expression = "java(geometryMapper.toPoint(request.getDestinationLongitude(), request.getDestinationLatitude()))")
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Shipment toEntity(ShipmentCreationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "originGeom", expression = "java(geometryMapper.toPoint(request.getOriginLongitude(), request.getOriginLatitude()))")
    @Mapping(target = "destinationGeom", expression = "java(geometryMapper.toPoint(request.getDestinationLongitude(), request.getDestinationLatitude()))")
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Shipment toEntity(CreateShipmentRequest request);

    @Mapping(target = "originLongitude", source = "originGeom", qualifiedByName = "toLongitude")
    @Mapping(target = "originLatitude", source = "originGeom", qualifiedByName = "toLatitude")
    @Mapping(target = "destinationLongitude", source = "destinationGeom", qualifiedByName = "toLongitude")
    @Mapping(target = "destinationLatitude", source = "destinationGeom", qualifiedByName = "toLatitude")
    ShipmentResponse toResponse(Shipment entity);

    List<ShipmentResponse> toResponseList(List<Shipment> entities);
}
