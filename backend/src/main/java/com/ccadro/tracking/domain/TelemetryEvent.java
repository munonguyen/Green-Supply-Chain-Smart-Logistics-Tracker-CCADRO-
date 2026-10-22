package com.ccadro.tracking.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "telemetry_event")
public class TelemetryEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "vehicle_id")
    private UUID vehicleId;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "location_geom", nullable = false, columnDefinition = "geometry(Point, 4326)")
    private Point locationGeom;

    public Double getLatitude() { return locationGeom != null ? locationGeom.getY() : null; }
    public Double getLongitude() { return locationGeom != null ? locationGeom.getX() : null; }

    @Column(name = "speed_kmh", precision = 6, scale = 2)
    private BigDecimal speedKmh;

    @Column(name = "heading_degrees", precision = 5, scale = 2)
    private BigDecimal headingDegrees;

    @Column(name = "distance_from_route_meters", precision = 10, scale = 2)
    private BigDecimal distanceFromRouteMeters;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public TelemetryEvent() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTripId() { return tripId; }
    public void setTripId(UUID tripId) { this.tripId = tripId; }
    public UUID getVehicleId() { return vehicleId; }
    public void setVehicleId(UUID vehicleId) { this.vehicleId = vehicleId; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public Point getLocationGeom() { return locationGeom; }
    public void setLocationGeom(Point locationGeom) { this.locationGeom = locationGeom; }
    public BigDecimal getSpeedKmh() { return speedKmh; }
    public void setSpeedKmh(BigDecimal speedKmh) { this.speedKmh = speedKmh; }
    public BigDecimal getHeadingDegrees() { return headingDegrees; }
    public void setHeadingDegrees(BigDecimal headingDegrees) { this.headingDegrees = headingDegrees; }
    public BigDecimal getDistanceFromRouteMeters() { return distanceFromRouteMeters; }
    public void setDistanceFromRouteMeters(BigDecimal distanceFromRouteMeters) { this.distanceFromRouteMeters = distanceFromRouteMeters; }
    public String getRawPayload() { return rawPayload; }
    public void setRawPayload(String rawPayload) { this.rawPayload = rawPayload; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
