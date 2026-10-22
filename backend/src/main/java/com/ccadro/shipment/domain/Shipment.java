package com.ccadro.shipment.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shipment")
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "shipment_code", nullable = false, unique = true, length = 50)
    private String shipmentCode;

    @Column(name = "customer_id", nullable = false, length = 50)
    private String customerId;

    @Column(name = "origin_name", nullable = false, length = 200)
    private String originName;

    @Column(name = "origin_address", columnDefinition = "TEXT")
    private String originAddress;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "origin_geom", nullable = false, columnDefinition = "geometry(Point, 4326)")
    private Point originGeom;

    @Column(name = "destination_name", nullable = false, length = 200)
    private String destinationName;

    @Column(name = "destination_address", columnDefinition = "TEXT")
    private String destinationAddress;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "destination_geom", nullable = false, columnDefinition = "geometry(Point, 4326)")
    private Point destinationGeom;

    public Double getOriginLatitude() { return originGeom != null ? originGeom.getY() : null; }
    public Double getOriginLongitude() { return originGeom != null ? originGeom.getX() : null; }
    public Double getDestinationLatitude() { return destinationGeom != null ? destinationGeom.getY() : null; }
    public Double getDestinationLongitude() { return destinationGeom != null ? destinationGeom.getX() : null; }

    @Column(name = "cargo_weight_tons", nullable = false, precision = 10, scale = 2)
    private BigDecimal cargoWeightTons;

    @Column(name = "cargo_volume_m3", precision = 10, scale = 2)
    private BigDecimal cargoVolumeM3;

    @Column(name = "required_delivery_time")
    private Instant requiredDeliveryTime;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "DRAFT";

    @Column(name = "assigned_vehicle_id")
    private UUID assignedVehicleId;

    @Column(name = "assigned_driver_id")
    private UUID assignedDriverId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Shipment() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getShipmentCode() { return shipmentCode; }
    public void setShipmentCode(String shipmentCode) { this.shipmentCode = shipmentCode; }
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }
    public String getOriginName() { return originName; }
    public void setOriginName(String originName) { this.originName = originName; }
    public String getOriginAddress() { return originAddress; }
    public void setOriginAddress(String originAddress) { this.originAddress = originAddress; }
    public Point getOriginGeom() { return originGeom; }
    public void setOriginGeom(Point originGeom) { this.originGeom = originGeom; }
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String destinationName) { this.destinationName = destinationName; }
    public String getDestinationAddress() { return destinationAddress; }
    public void setDestinationAddress(String destinationAddress) { this.destinationAddress = destinationAddress; }
    public Point getDestinationGeom() { return destinationGeom; }
    public void setDestinationGeom(Point destinationGeom) { this.destinationGeom = destinationGeom; }
    public BigDecimal getCargoWeightTons() { return cargoWeightTons; }
    public void setCargoWeightTons(BigDecimal cargoWeightTons) { this.cargoWeightTons = cargoWeightTons; }
    public BigDecimal getCargoVolumeM3() { return cargoVolumeM3; }
    public void setCargoVolumeM3(BigDecimal cargoVolumeM3) { this.cargoVolumeM3 = cargoVolumeM3; }
    public Instant getRequiredDeliveryTime() { return requiredDeliveryTime; }
    public void setRequiredDeliveryTime(Instant requiredDeliveryTime) { this.requiredDeliveryTime = requiredDeliveryTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getAssignedVehicleId() { return assignedVehicleId; }
    public void setAssignedVehicleId(UUID assignedVehicleId) { this.assignedVehicleId = assignedVehicleId; }
    public UUID getAssignedDriverId() { return assignedDriverId; }
    public void setAssignedDriverId(UUID assignedDriverId) { this.assignedDriverId = assignedDriverId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
