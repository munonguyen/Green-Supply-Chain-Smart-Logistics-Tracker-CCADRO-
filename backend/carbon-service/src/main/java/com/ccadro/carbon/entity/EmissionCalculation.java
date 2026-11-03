package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emission_calculation")
public class EmissionCalculation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "calculation_type", nullable = false, length = 30)
    private String calculationType = "PLANNING";

    @Column(name = "calculation_method", nullable = false, length = 50)
    private String calculationMethod = "GLEC_V3";

    @Column(name = "total_co2e_kg", nullable = false, precision = 12, scale = 4)
    private BigDecimal totalCo2eKg;

    @Column(name = "cargo_payload_tons", nullable = false, precision = 10, scale = 2)
    private BigDecimal cargoPayloadTons;

    @Column(name = "total_distance_km", nullable = false, precision = 12, scale = 3)
    private BigDecimal totalDistanceKm;

    @Column(name = "empty_running_distance_km", nullable = false, precision = 12, scale = 3)
    private BigDecimal emptyRunningDistanceKm = BigDecimal.ZERO;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "details_json", columnDefinition = "jsonb")
    private String detailsJson;

    @Column(name = "ttw_co2e_kg", precision = 12, scale = 4)
    private BigDecimal ttwCo2eKg;

    @Column(name = "wtt_co2e_kg", precision = 12, scale = 4)
    private BigDecimal wttCo2eKg;

    @Column(name = "wtw_co2e_kg", precision = 12, scale = 4)
    private BigDecimal wtwCo2eKg;

    @Column(name = "data_quality_tier", length = 30)
    private String dataQualityTier = "TIER_1_PRIMARY";

    @Column(name = "factor_version", length = 50)
    private String factorVersion = "GLEC_v3.0";

    @Column(name = "calculation_status", length = 30)
    private String calculationStatus = "CALCULATED";

    @Column(name = "blocked_reason", columnDefinition = "text")
    private String blockedReason;

    @Column(name = "is_daf_applied")
    private Boolean isDafApplied = false;

    @Column(name = "version_number")
    private Integer versionNumber = 1;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt = Instant.now();

    public EmissionCalculation() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTripId() { return tripId; }
    public void setTripId(UUID tripId) { this.tripId = tripId; }
    public String getCalculationType() { return calculationType; }
    public void setCalculationType(String calculationType) { this.calculationType = calculationType; }
    public String getCalculationMethod() { return calculationMethod; }
    public void setCalculationMethod(String calculationMethod) { this.calculationMethod = calculationMethod; }
    public BigDecimal getTotalCo2eKg() { return totalCo2eKg; }
    public void setTotalCo2eKg(BigDecimal totalCo2eKg) { this.totalCo2eKg = totalCo2eKg; }
    public BigDecimal getCargoPayloadTons() { return cargoPayloadTons; }
    public void setCargoPayloadTons(BigDecimal cargoPayloadTons) { this.cargoPayloadTons = cargoPayloadTons; }
    public BigDecimal getTotalDistanceKm() { return totalDistanceKm; }
    public void setTotalDistanceKm(BigDecimal totalDistanceKm) { this.totalDistanceKm = totalDistanceKm; }
    public BigDecimal getEmptyRunningDistanceKm() { return emptyRunningDistanceKm; }
    public void setEmptyRunningDistanceKm(BigDecimal emptyRunningDistanceKm) { this.emptyRunningDistanceKm = emptyRunningDistanceKm; }
    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
    public BigDecimal getTtwCo2eKg() { return ttwCo2eKg; }
    public void setTtwCo2eKg(BigDecimal ttwCo2eKg) { this.ttwCo2eKg = ttwCo2eKg; }
    public BigDecimal getWttCo2eKg() { return wttCo2eKg; }
    public void setWttCo2eKg(BigDecimal wttCo2eKg) { this.wttCo2eKg = wttCo2eKg; }
    public BigDecimal getWtwCo2eKg() { return wtwCo2eKg; }
    public void setWtwCo2eKg(BigDecimal wtwCo2eKg) { this.wtwCo2eKg = wtwCo2eKg; }
    public String getDataQualityTier() { return dataQualityTier; }
    public void setDataQualityTier(String dataQualityTier) { this.dataQualityTier = dataQualityTier; }
    public String getFactorVersion() { return factorVersion; }
    public void setFactorVersion(String factorVersion) { this.factorVersion = factorVersion; }
    public String getCalculationStatus() { return calculationStatus; }
    public void setCalculationStatus(String calculationStatus) { this.calculationStatus = calculationStatus; }
    public String getBlockedReason() { return blockedReason; }
    public void setBlockedReason(String blockedReason) { this.blockedReason = blockedReason; }
    public Boolean getIsDafApplied() { return isDafApplied; }
    public void setIsDafApplied(Boolean dafApplied) { isDafApplied = dafApplied; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public Instant getCalculatedAt() { return calculatedAt; }
    public void setCalculatedAt(Instant calculatedAt) { this.calculatedAt = calculatedAt; }
}
