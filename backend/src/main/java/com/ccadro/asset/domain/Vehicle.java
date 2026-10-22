package com.ccadro.asset.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "vehicle")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "vehicle_code", nullable = false, unique = true, length = 50)
    private String vehicleCode;

    @Column(name = "plate_number", nullable = false, length = 20)
    private String plateNumber;

    @Column(name = "fuel_type", nullable = false, length = 30)
    private String fuelType;

    @Column(name = "euro_standard", nullable = false, length = 20)
    private String euroStandard;

    @Column(name = "max_payload_tons", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxPayloadTons;

    @Column(name = "empty_weight_tons", nullable = false, precision = 10, scale = 2)
    private BigDecimal emptyWeightTons;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "AVAILABLE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Vehicle() {}

    public Vehicle(String vehicleCode, String plateNumber, String fuelType, String euroStandard, BigDecimal maxPayloadTons, BigDecimal emptyWeightTons) {
        this.vehicleCode = vehicleCode;
        this.plateNumber = plateNumber;
        this.fuelType = fuelType;
        this.euroStandard = euroStandard;
        this.maxPayloadTons = maxPayloadTons;
        this.emptyWeightTons = emptyWeightTons;
        this.status = "AVAILABLE";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getVehicleCode() { return vehicleCode; }
    public void setVehicleCode(String vehicleCode) { this.vehicleCode = vehicleCode; }
    public String getPlateNumber() { return plateNumber; }
    public void setPlateNumber(String plateNumber) { this.plateNumber = plateNumber; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public String getEuroStandard() { return euroStandard; }
    public void setEuroStandard(String euroStandard) { this.euroStandard = euroStandard; }
    public BigDecimal getMaxPayloadTons() { return maxPayloadTons; }
    public void setMaxPayloadTons(BigDecimal maxPayloadTons) { this.maxPayloadTons = maxPayloadTons; }
    public BigDecimal getEmptyWeightTons() { return emptyWeightTons; }
    public void setEmptyWeightTons(BigDecimal emptyWeightTons) { this.emptyWeightTons = emptyWeightTons; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
