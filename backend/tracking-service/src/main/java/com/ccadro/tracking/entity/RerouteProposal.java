package com.ccadro.tracking.entity;

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
@Table(name = "reroute_proposal")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RerouteProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "trigger_reason", nullable = false, length = 50)
    private String triggerReason;

    @Column(name = "original_remaining_distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalRemainingDistanceMeters;

    @Column(name = "proposed_distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal proposedDistanceMeters;

    @Column(name = "benefit_ratio", nullable = false, precision = 6, scale = 4)
    private BigDecimal benefitRatio;

    @Column(name = "proposed_geometry", columnDefinition = "geometry(LineString, 4326)")
    private LineString proposedGeometry;

    @Column(name = "source_candidate_id")
    private UUID sourceCandidateId;

    @Column(name = "proposed_duration_seconds", precision = 12, scale = 2)
    private BigDecimal proposedDurationSeconds;

    @Column(name = "routing_metadata_json", columnDefinition = "text")
    private String routingMetadataJson;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING_DISPATCHER";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
