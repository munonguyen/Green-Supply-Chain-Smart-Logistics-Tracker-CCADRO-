package com.ccadro.routing.entity;

import jakarta.persistence.*;
import org.locationtech.jts.geom.LineString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_candidate")
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

    @com.fasterxml.jackson.annotation.JsonIgnore
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

    public RouteCandidate() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getShipmentId() { return shipmentId; }
    public void setShipmentId(UUID shipmentId) { this.shipmentId = shipmentId; }
    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }
    public BigDecimal getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(BigDecimal distanceMeters) { this.distanceMeters = distanceMeters; }
    public BigDecimal getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(BigDecimal durationSeconds) { this.durationSeconds = durationSeconds; }
    public BigDecimal getEstimatedFuelLiters() { return estimatedFuelLiters; }
    public void setEstimatedFuelLiters(BigDecimal estimatedFuelLiters) { this.estimatedFuelLiters = estimatedFuelLiters; }
    public BigDecimal getEstimatedCo2Kg() { return estimatedCo2Kg; }
    public void setEstimatedCo2Kg(BigDecimal estimatedCo2Kg) { this.estimatedCo2Kg = estimatedCo2Kg; }
    public BigDecimal getCompositeScore() { return compositeScore; }
    public void setCompositeScore(BigDecimal compositeScore) { this.compositeScore = compositeScore; }
    public LineString getRouteGeometry() { return routeGeometry; }
    public void setRouteGeometry(LineString routeGeometry) { this.routeGeometry = routeGeometry; }
    public String getWaypointsJson() { return waypointsJson; }
    public void setWaypointsJson(String waypointsJson) { this.waypointsJson = waypointsJson; }
    public BigDecimal getRiskScore() { return riskScore; }
    public void setRiskScore(BigDecimal riskScore) { this.riskScore = riskScore; }
    public String getMetricsBreakdownJson() { return metricsBreakdownJson; }
    public void setMetricsBreakdownJson(String metricsBreakdownJson) { this.metricsBreakdownJson = metricsBreakdownJson; }
    public boolean isSelected() { return isSelected; }
    public void setSelected(boolean selected) { isSelected = selected; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
