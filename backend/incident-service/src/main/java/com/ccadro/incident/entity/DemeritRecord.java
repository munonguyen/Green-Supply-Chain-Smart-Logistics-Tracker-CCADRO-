package com.ccadro.incident.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "demerit_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DemeritRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "incident_id")
    UUID incidentId;

    @Column(name = "points", nullable = false)
    Integer points = 0;

    @Column(name = "violation_category", nullable = false, length = 50)
    String violationCategory;

    @Column(name = "status", nullable = false, length = 30)
    String status = "RECORDED";

    @Column(name = "reviewed_by", length = 100)
    String reviewedBy;

    @Column(name = "audit_decision", length = 50)
    String auditDecision;

    @Column(name = "decision_notes", columnDefinition = "text")
    String decisionNotes;

    @Column(name = "recorded_at", nullable = false)
    Instant recordedAt = Instant.now();
}
