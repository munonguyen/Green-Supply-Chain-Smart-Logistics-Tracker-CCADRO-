package com.ccadro.tracking.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_code", nullable = false, unique = true, length = 50)
    private String tripCode;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;

    @Column(name = "driver_id", nullable = false)
    private UUID driverId;

    @Column(name = "active_route_version_id")
    private UUID activeRouteVersionId;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "SCHEDULED";

    @Column(name = "actual_distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal actualDistanceMeters = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Trip() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getTripCode() { return tripCode; }
    public void setTripCode(String tripCode) { this.tripCode = tripCode; }
    public UUID getShipmentId() { return shipmentId; }
    public void setShipmentId(UUID shipmentId) { this.shipmentId = shipmentId; }
    public UUID getVehicleId() { return vehicleId; }
    public void setVehicleId(UUID vehicleId) { this.vehicleId = vehicleId; }
    public UUID getDriverId() { return driverId; }
    public void setDriverId(UUID driverId) { this.driverId = driverId; }
    public UUID getActiveRouteVersionId() { return activeRouteVersionId; }
    public void setActiveRouteVersionId(UUID activeRouteVersionId) { this.activeRouteVersionId = activeRouteVersionId; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getActualDistanceMeters() { return actualDistanceMeters; }
    public void setActualDistanceMeters(BigDecimal actualDistanceMeters) { this.actualDistanceMeters = actualDistanceMeters; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
