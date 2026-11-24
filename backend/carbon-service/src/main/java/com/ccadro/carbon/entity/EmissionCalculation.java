package com.ccadro.carbon.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emission_calculation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
}
