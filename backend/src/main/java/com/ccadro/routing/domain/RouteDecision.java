package com.ccadro.routing.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_decision")
public class RouteDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "selected_candidate_id", nullable = false)
    private UUID selectedCandidateId;

    @Column(name = "decision_type", nullable = false, length = 50)
    private String decisionType = "RECOMMENDED";

    @Column(name = "dispatcher_notes", columnDefinition = "TEXT")
    private String dispatcherNotes;

    @Column(name = "decided_by", nullable = false, length = 50)
    private String decidedBy = "SYSTEM";

    @Column(name = "decided_at", nullable = false)
    private Instant decidedAt = Instant.now();

    public RouteDecision() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getShipmentId() { return shipmentId; }
    public void setShipmentId(UUID shipmentId) { this.shipmentId = shipmentId; }
    public UUID getSelectedCandidateId() { return selectedCandidateId; }
    public void setSelectedCandidateId(UUID selectedCandidateId) { this.selectedCandidateId = selectedCandidateId; }
    public String getDecisionType() { return decisionType; }
    public void setDecisionType(String decisionType) { this.decisionType = decisionType; }
    public String getDispatcherNotes() { return dispatcherNotes; }
    public void setDispatcherNotes(String dispatcherNotes) { this.dispatcherNotes = dispatcherNotes; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }
    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }
}
