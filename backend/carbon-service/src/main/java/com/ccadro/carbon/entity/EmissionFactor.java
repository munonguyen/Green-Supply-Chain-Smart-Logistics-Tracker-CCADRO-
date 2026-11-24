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
@Table(name = "emission_factor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
}
