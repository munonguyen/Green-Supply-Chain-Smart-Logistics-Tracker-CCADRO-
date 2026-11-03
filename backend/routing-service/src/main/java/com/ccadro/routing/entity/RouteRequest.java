package com.ccadro.routing.entity;

import java.math.BigDecimal;
import java.util.UUID;

public class RouteRequest {
    private UUID shipmentId;
    private Location origin;
    private Location destination;
    private BigDecimal cargoWeightTons;
    private String vehicleFuelType;
    private String euroStandard;

    public RouteRequest() {}

    public RouteRequest(UUID shipmentId, Location origin, Location destination, BigDecimal cargoWeightTons, String vehicleFuelType, String euroStandard) {
        this.shipmentId = shipmentId;
        this.origin = origin;
        this.destination = destination;
        this.cargoWeightTons = cargoWeightTons;
        this.vehicleFuelType = vehicleFuelType;
        this.euroStandard = euroStandard;
    }

    public UUID getShipmentId() { return shipmentId; }
    public void setShipmentId(UUID shipmentId) { this.shipmentId = shipmentId; }
    public Location getOrigin() { return origin; }
    public void setOrigin(Location origin) { this.origin = origin; }
    public Location getDestination() { return destination; }
    public void setDestination(Location destination) { this.destination = destination; }
    public BigDecimal getCargoWeightTons() { return cargoWeightTons; }
    public void setCargoWeightTons(BigDecimal cargoWeightTons) { this.cargoWeightTons = cargoWeightTons; }
    public String getVehicleFuelType() { return vehicleFuelType; }
    public void setVehicleFuelType(String vehicleFuelType) { this.vehicleFuelType = vehicleFuelType; }
    public String getEuroStandard() { return euroStandard; }
    public void setEuroStandard(String euroStandard) { this.euroStandard = euroStandard; }
}
