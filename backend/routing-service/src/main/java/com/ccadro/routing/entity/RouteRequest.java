package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteRequest {
    private UUID shipmentId;
    private Location origin;
    private Location destination;
    private BigDecimal cargoWeightTons;
    private String vehicleFuelType;
    private String euroStandard;
    private java.time.Instant departureTime;

    public RouteRequest(UUID shipmentId, Location origin, Location destination, BigDecimal cargoWeightTons,
            String vehicleFuelType, String euroStandard) {
        this(shipmentId, origin, destination, cargoWeightTons, vehicleFuelType, euroStandard, java.time.Instant.now());
    }
}
