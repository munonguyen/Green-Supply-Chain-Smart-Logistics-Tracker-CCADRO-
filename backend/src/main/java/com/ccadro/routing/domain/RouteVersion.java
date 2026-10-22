package com.ccadro.routing.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.LineString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_version")
public class RouteVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 1;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "route_geometry", columnDefinition = "geometry(LineString, 4326)")
    private LineString routeGeometry;

    @Column(name = "total_distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDistanceMeters;

    @Column(name = "total_duration_seconds", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDurationSeconds;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "reason", nullable = false, length = 100)
    private String reason = "INITIAL_PLANNING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public RouteVersion() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getShipmentId() { return shipmentId; }
    public void setShipmentId(UUID shipmentId) { this.shipmentId = shipmentId; }
    public int getVersionNumber() { return versionNumber; }
    public void setVersionNumber(int versionNumber) { this.versionNumber = versionNumber; }
    public LineString getRouteGeometry() { return routeGeometry; }
    public void setRouteGeometry(LineString routeGeometry) { this.routeGeometry = routeGeometry; }
    public BigDecimal getTotalDistanceMeters() { return totalDistanceMeters; }
    public void setTotalDistanceMeters(BigDecimal totalDistanceMeters) { this.totalDistanceMeters = totalDistanceMeters; }
    public BigDecimal getTotalDurationSeconds() { return totalDurationSeconds; }
    public void setTotalDurationSeconds(BigDecimal totalDurationSeconds) { this.totalDurationSeconds = totalDurationSeconds; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
