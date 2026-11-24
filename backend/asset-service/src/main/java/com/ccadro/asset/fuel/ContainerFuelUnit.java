package com.ccadro.asset.fuel;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "container_fuel_unit")
@Getter
@Setter
public class ContainerFuelUnit {
    @Id
    @Column(name = "container_id")
    private UUID containerId;

    @Column(name = "genset_code", nullable = false, unique = true, length = 50)
    private String gensetCode;

    @Column(name = "rfid_tag", unique = true, length = 60)
    private String rfidTag;

    @Column(name = "preferred_fuel_code", nullable = false, length = 40)
    private String preferredFuelCode;

    @Column(name = "tank_capacity_liters", nullable = false, precision = 8, scale = 2)
    private BigDecimal tankCapacityLiters;

    @Column(name = "current_fuel_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal currentFuelPct = BigDecimal.valueOf(100);

    @Column(name = "rated_liters_per_hour", nullable = false, precision = 6, scale = 2)
    private BigDecimal ratedLitersPerHour;

    @Column(name = "min_quality_level", nullable = false)
    private int minQualityLevel = 5;

    @Column(name = "max_sulfur_ppm", nullable = false)
    private int maxSulfurPpm = 10;

    @Column(name = "updated_by", nullable = false, length = 120)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}

