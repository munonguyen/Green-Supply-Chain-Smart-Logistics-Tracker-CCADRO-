package com.ccadro.tracking.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "telemetry_event")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    @Column(name="external_event_id")
    private UUID externalEventId;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "vehicle_id")
    private UUID vehicleId;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

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

    @Column(name = "accuracy_meters", precision = 8, scale = 2)
    private BigDecimal accuracyMeters = new BigDecimal("5.0");

    @Column(name = "battery_percentage", precision = 5, scale = 2)
    private BigDecimal batteryPercentage;

    @Column(name = "is_offline_buffered")
    private Boolean isOfflineBuffered = false;

    @Column(name = "quality_passed")
    private Boolean qualityPassed = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
