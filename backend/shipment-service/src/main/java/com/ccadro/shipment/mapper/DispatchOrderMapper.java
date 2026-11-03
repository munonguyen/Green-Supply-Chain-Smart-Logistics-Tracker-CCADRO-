package com.ccadro.shipment.mapper;

import com.ccadro.shipment.entity.DispatchOrder;
import com.ccadro.shipment.dto.request.DispatchOrderRequest;
import com.ccadro.shipment.dto.response.DispatchOrderResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DispatchOrderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dispatchedAt", ignore = true)
    @Mapping(target = "dispatchedBy", constant = "DISPATCHER")
    @Mapping(target = "status", constant = "ASSIGNED")
    DispatchOrder toEntity(DispatchOrderRequest request);

    DispatchOrderResponse toResponse(DispatchOrder entity);

    List<DispatchOrderResponse> toResponseList(List<DispatchOrder> entities);
}

