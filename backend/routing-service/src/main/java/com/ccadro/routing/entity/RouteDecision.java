package com.ccadro.routing.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "route_decision")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
}
