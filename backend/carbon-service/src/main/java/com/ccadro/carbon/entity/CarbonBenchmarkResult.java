package com.ccadro.carbon.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carbon_benchmark_result")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CarbonBenchmarkResult {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "trip_id")
    UUID tripId;

    @Column(name = "shipment_id")
    UUID shipmentId;

    @Column(name = "benchmark_corridor_id")
    UUID benchmarkCorridorId;

    @Column(name = "benchmark_type", nullable = false, length = 50)
    String benchmarkType = "EX_POST_MODELLED";

    @Column(name = "baseline_route_type", nullable = false, length = 50)
    String baselineRouteType = "SHORTEST_DISTANCE";

    @Column(name = "baseline_co2e_kg", nullable = false, precision = 12, scale = 4)
    BigDecimal baselineCo2eKg;

    @Column(name = "ccadro_co2e_kg", nullable = false, precision = 12, scale = 4)
    BigDecimal ccadroCo2eKg;

    @Column(name = "carbon_reduction_percent", nullable = false, precision = 6, scale = 2)
    BigDecimal carbonReductionPercent;

    @Column(name = "time_tradeoff_minutes", precision = 8, scale = 2)
    BigDecimal timeTradeoffMinutes = BigDecimal.ZERO;

    @Column(name = "distance_tradeoff_km", precision = 10, scale = 3)
    BigDecimal distanceTradeoffKm = BigDecimal.ZERO;

    @Column(name = "estimation_error_percent", precision = 6, scale = 2)
    BigDecimal estimationErrorPercent;

    @Column(name = "comparability_status", nullable = false, length = 30)
    String comparabilityStatus = "COMPARABLE";

    @Column(name = "confidence_score", precision = 5, scale = 2)
    BigDecimal confidenceScore = new BigDecimal("0.95");

    @Column(name = "limitations_notes", columnDefinition = "text")
    String limitationsNotes;

    @Column(name = "evaluated_at", nullable = false)
    Instant evaluatedAt = Instant.now();
}
