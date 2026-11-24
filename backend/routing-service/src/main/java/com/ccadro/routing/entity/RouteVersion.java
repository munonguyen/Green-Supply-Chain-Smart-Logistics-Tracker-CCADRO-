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
@Table(name = "route_version")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 1;

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

    @Column(name = "routing_metadata_json", columnDefinition = "TEXT")
    private String routingMetadataJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @com.fasterxml.jackson.annotation.JsonProperty("routeGeoJson")
    public java.util.Map<String, Object> getRouteGeoJson() {
        if (routeGeometry == null) return null;
        var coordinates = java.util.Arrays.stream(routeGeometry.getCoordinates())
                .map(point -> java.util.List.of(point.getX(), point.getY()))
                .toList();
        return java.util.Map.of("type", "LineString", "coordinates", coordinates);
    }
}
