package com.ccadro.asset.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

/** One immutable-audit control cycle per trip; it never infers manual checks from telemetry. */
@Entity
@Table(name = "container_control_round", uniqueConstraints = @UniqueConstraint(columnNames = {"container_code", "round_number"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContainerControlRound {
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    @Column(name = "container_code", nullable = false, length = 50)
    private String containerCode;
    @Column(name = "round_number", nullable = false)
    private int roundNumber;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "started_by", nullable = false, length = 100)
    private String startedBy;
    @Column(name = "started_role", nullable = false, length = 40)
    private String startedRole;
    @Column(name = "initial_status", nullable = false, length = 30)
    private String initialStatus;
    @Column(name = "shipment_code", length = 50)
    private String shipmentCode;
    @Column(name = "epod_recipient", columnDefinition = "text")
    private String epodRecipient;
    @Column(name = "epod_signature", columnDefinition = "text")
    private String epodSignature;
    @Column(name = "epod_at")
    private Instant epodAt;
    @Column(name = "epod_notes", columnDefinition = "text")
    private String epodNotes;
    @Column(name = "completed_at")
    private Instant completedAt;
}
