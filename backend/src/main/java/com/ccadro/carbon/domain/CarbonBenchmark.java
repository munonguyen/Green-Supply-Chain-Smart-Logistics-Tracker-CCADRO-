package com.ccadro.carbon.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carbon_benchmark")
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

    public CarbonBenchmark() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getBenchmarkName() { return benchmarkName; }
    public void setBenchmarkName(String benchmarkName) { this.benchmarkName = benchmarkName; }
    public String getOriginZone() { return originZone; }
    public void setOriginZone(String originZone) { this.originZone = originZone; }
    public String getDestinationZone() { return destinationZone; }
    public void setDestinationZone(String destinationZone) { this.destinationZone = destinationZone; }
    public BigDecimal getAverageCo2ePerTonneKm() { return averageCo2ePerTonneKm; }
    public void setAverageCo2ePerTonneKm(BigDecimal averageCo2ePerTonneKm) { this.averageCo2ePerTonneKm = averageCo2ePerTonneKm; }
    public BigDecimal getBestInClassCo2ePerTonneKm() { return bestInClassCo2ePerTonneKm; }
    public void setBestInClassCo2ePerTonneKm(BigDecimal bestInClassCo2ePerTonneKm) { this.bestInClassCo2ePerTonneKm = bestInClassCo2ePerTonneKm; }
    public String getPeriodMonth() { return periodMonth; }
    public void setPeriodMonth(String periodMonth) { this.periodMonth = periodMonth; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
