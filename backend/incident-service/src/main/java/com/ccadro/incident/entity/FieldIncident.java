package com.ccadro.incident.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.locationtech.jts.geom.Point;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "field_incident")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FieldIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "incident_code", nullable = false, unique = true, length = 50)
    String incidentCode;

    @Column(name = "trip_id")
    UUID tripId;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "incident_type", nullable = false, length = 50)
    String incidentType;

    @Column(name = "severity", nullable = false, length = 20)
    String severity = "MODERATE";

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "incident_location", columnDefinition = "geometry(Point, 4326)")
    Point incidentLocation;

    public Double getLatitude() { return incidentLocation != null ? incidentLocation.getY() : null; }
    public Double getLongitude() { return incidentLocation != null ? incidentLocation.getX() : null; }

    @Column(name = "description", nullable = false, columnDefinition = "text")
    String description;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "evidence_urls", columnDefinition = "jsonb")
    String evidenceUrls = "[]";

    @Column(name = "status", nullable = false, length = 30)
    String status = "PENDING_REVIEW";

    @Column(name = "reported_at", nullable = false)
    Instant reportedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}
