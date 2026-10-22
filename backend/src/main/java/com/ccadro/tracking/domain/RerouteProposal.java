package com.ccadro.tracking.domain;

import jakarta.persistence.*;
import org.locationtech.jts.geom.LineString;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reroute_proposal")
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

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "proposed_geometry", columnDefinition = "geometry(LineString, 4326)")
    private LineString proposedGeometry;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "PENDING_DISPATCHER";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public RerouteProposal() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTripId() { return tripId; }
    public void setTripId(UUID tripId) { this.tripId = tripId; }
    public String getTriggerReason() { return triggerReason; }
    public void setTriggerReason(String triggerReason) { this.triggerReason = triggerReason; }
    public BigDecimal getOriginalRemainingDistanceMeters() { return originalRemainingDistanceMeters; }
    public void setOriginalRemainingDistanceMeters(BigDecimal originalRemainingDistanceMeters) { this.originalRemainingDistanceMeters = originalRemainingDistanceMeters; }
    public BigDecimal getProposedDistanceMeters() { return proposedDistanceMeters; }
    public void setProposedDistanceMeters(BigDecimal proposedDistanceMeters) { this.proposedDistanceMeters = proposedDistanceMeters; }
    public BigDecimal getBenefitRatio() { return benefitRatio; }
    public void setBenefitRatio(BigDecimal benefitRatio) { this.benefitRatio = benefitRatio; }
    public LineString getProposedGeometry() { return proposedGeometry; }
    public void setProposedGeometry(LineString proposedGeometry) { this.proposedGeometry = proposedGeometry; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
