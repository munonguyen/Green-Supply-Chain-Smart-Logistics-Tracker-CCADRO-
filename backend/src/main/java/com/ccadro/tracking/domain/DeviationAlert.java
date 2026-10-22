package com.ccadro.tracking.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "deviation_alert")
public class DeviationAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "severity", nullable = false, length = 20)
    private String severity; // YELLOW, RED

    @Column(name = "deviation_distance_meters", nullable = false, precision = 10, scale = 2)
    private BigDecimal deviationDistanceMeters;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "location_geom", columnDefinition = "geometry(Point, 4326)")
    private Point locationGeom;

    public Double getLatitude() { return locationGeom != null ? locationGeom.getY() : null; }
    public Double getLongitude() { return locationGeom != null ? locationGeom.getX() : null; }

    @Column(name = "status", nullable = false, length = 30)
    private String status = "OPEN";

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt = Instant.now();

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public DeviationAlert() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTripId() { return tripId; }
    public void setTripId(UUID tripId) { this.tripId = tripId; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public BigDecimal getDeviationDistanceMeters() { return deviationDistanceMeters; }
    public void setDeviationDistanceMeters(BigDecimal deviationDistanceMeters) { this.deviationDistanceMeters = deviationDistanceMeters; }
    public Point getLocationGeom() { return locationGeom; }
    public void setLocationGeom(Point locationGeom) { this.locationGeom = locationGeom; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getDetectedAt() { return detectedAt; }
    public void setDetectedAt(Instant detectedAt) { this.detectedAt = detectedAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
