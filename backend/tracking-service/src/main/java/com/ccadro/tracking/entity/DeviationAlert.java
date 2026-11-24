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
@Table(name = "deviation_alert")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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

    @Column(name = "persistence_count")
    private Integer persistenceCount = 1;

    @Column(name = "duration_seconds")
    private Integer durationSeconds = 0;

    @Column(name = "threshold_version", length = 50)
    private String thresholdVersion = "v1.0";

    @Column(name = "route_version_id")
    private UUID routeVersionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
