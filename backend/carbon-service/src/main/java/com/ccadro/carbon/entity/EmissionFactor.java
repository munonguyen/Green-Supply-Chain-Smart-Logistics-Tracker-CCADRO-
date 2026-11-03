package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emission_factor")
public class EmissionFactor {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "factor_code", nullable = false, unique = true, length = 50)
    private String factorCode;

    @Column(name = "fuel_type", nullable = false, length = 30)
    private String fuelType;

    @Column(name = "vehicle_category", nullable = false, length = 50)
    private String vehicleCategory;

    @Column(name = "euro_standard", nullable = false, length = 20)
    private String euroStandard;

    @Column(name = "empty_factor_kg_per_km", nullable = false, precision = 10, scale = 6)
    private BigDecimal emptyFactorKgPerKm;

    @Column(name = "full_factor_kg_per_km", nullable = false, precision = 10, scale = 6)
    private BigDecimal fullFactorKgPerKm;

    @Column(name = "default_tonne_km_factor", nullable = false, precision = 10, scale = 6)
    private BigDecimal defaultTonneKmFactor;

    @Column(name = "source_reference", nullable = false, length = 100)
    private String sourceReference;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public EmissionFactor() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFactorCode() { return factorCode; }
    public void setFactorCode(String factorCode) { this.factorCode = factorCode; }
    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }
    public String getVehicleCategory() { return vehicleCategory; }
    public void setVehicleCategory(String vehicleCategory) { this.vehicleCategory = vehicleCategory; }
    public String getEuroStandard() { return euroStandard; }
    public void setEuroStandard(String euroStandard) { this.euroStandard = euroStandard; }
    public BigDecimal getEmptyFactorKgPerKm() { return emptyFactorKgPerKm; }
    public void setEmptyFactorKgPerKm(BigDecimal emptyFactorKgPerKm) { this.emptyFactorKgPerKm = emptyFactorKgPerKm; }
    public BigDecimal getFullFactorKgPerKm() { return fullFactorKgPerKm; }
    public void setFullFactorKgPerKm(BigDecimal fullFactorKgPerKm) { this.fullFactorKgPerKm = fullFactorKgPerKm; }
    public BigDecimal getDefaultTonneKmFactor() { return defaultTonneKmFactor; }
    public void setDefaultTonneKmFactor(BigDecimal defaultTonneKmFactor) { this.defaultTonneKmFactor = defaultTonneKmFactor; }
    public String getSourceReference() { return sourceReference; }
    public void setSourceReference(String sourceReference) { this.sourceReference = sourceReference; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
