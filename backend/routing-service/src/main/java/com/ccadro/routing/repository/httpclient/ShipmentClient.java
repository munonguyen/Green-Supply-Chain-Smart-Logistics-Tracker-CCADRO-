package com.ccadro.routing.repository.httpclient;

import com.ccadro.routing.dto.ApiResponse;
import com.ccadro.routing.dto.ShipmentDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "shipment-service", url = "${app.services.shipment.url:http://localhost:8082}")
public interface ShipmentClient {
    @GetMapping("/api/v1/shipments/{id}")
    ApiResponse<ShipmentDto> getShipmentById(@PathVariable("id") UUID id);
}
