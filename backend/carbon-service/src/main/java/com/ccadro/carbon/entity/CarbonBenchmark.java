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
@Table(name = "carbon_benchmark")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CarbonBenchmark {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "benchmark_name", nullable = false, length = 100)
    private String benchmarkName;

    @Column(name = "origin_zone", nullable = false, length = 100)
    private String originZone;

    @Column(name = "destination_zone", nullable = false, length = 100)
    private String destinationZone;

    @Column(name = "average_co2e_per_tonne_km", nullable = false, precision = 10, scale = 6)
    private BigDecimal averageCo2ePerTonneKm;

    @Column(name = "best_in_class_co2e_per_tonne_km", nullable = false, precision = 10, scale = 6)
    private BigDecimal bestInClassCo2ePerTonneKm;

    @Column(name = "period_month", nullable = false, length = 7)
    private String periodMonth;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
