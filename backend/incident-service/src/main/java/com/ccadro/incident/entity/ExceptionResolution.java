package com.ccadro.incident.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exception_resolution")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExceptionResolution {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "incident_id", nullable = false)
    UUID incidentId;

    @Column(name = "reviewed_by", nullable = false, length = 100)
    String reviewedBy;

    @Column(name = "decision", nullable = false, length = 50)
    String decision;

    @Column(name = "review_notes", columnDefinition = "text")
    String reviewNotes;

    @Column(name = "resolved_at", nullable = false)
    Instant resolvedAt = Instant.now();
}
