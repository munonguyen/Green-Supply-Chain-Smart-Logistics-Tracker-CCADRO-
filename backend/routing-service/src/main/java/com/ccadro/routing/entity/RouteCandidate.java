package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import org.locationtech.jts.geom.LineString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_candidate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteCandidate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "candidate_name", nullable = false, length = 100)
    private String candidateName;

    @Column(name = "provider_name", nullable = false, length = 50)
    private String providerName;

    @Column(name = "distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal distanceMeters;

    @Column(name = "duration_seconds", nullable = false, precision = 12, scale = 2)
    private BigDecimal durationSeconds;

    @Column(name = "estimated_fuel_liters", precision = 10, scale = 2)
    private BigDecimal estimatedFuelLiters;

    @Column(name = "estimated_co2_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedCo2Kg;

    @Column(name = "composite_score", precision = 6, scale = 4)
    private BigDecimal compositeScore;

    @Column(name = "route_geometry", columnDefinition = "geometry(LineString, 4326)")
    private LineString routeGeometry;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "waypoints_json", columnDefinition = "jsonb")
    private String waypointsJson;

    @Column(name = "risk_score", precision = 5, scale = 4)
    private BigDecimal riskScore = new BigDecimal("0.0500");

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "metrics_breakdown_json", columnDefinition = "jsonb")
    private String metricsBreakdownJson = "{}";

    @Column(name = "is_selected", nullable = false)
    private boolean isSelected = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
