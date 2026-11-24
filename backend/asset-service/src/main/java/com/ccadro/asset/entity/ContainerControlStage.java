package com.ccadro.asset.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "container_control_stage", uniqueConstraints = @UniqueConstraint(columnNames = {"round_id", "stage"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContainerControlStage {
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    @Column(name = "round_id", nullable = false)
    private UUID roundId;
    @Column(nullable = false, length = 30)
    private String stage;
    @Column(name = "checked_keys", nullable = false, length = 500)
    private String checkedKeys;
    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;
    @Column(name = "completed_by", nullable = false, length = 100)
    private String completedBy;
    @Column(name = "completed_role", nullable = false, length = 40)
    private String completedRole;
    @Column(columnDefinition = "text")
    private String notes;
    @Column(name = "evidence_json", columnDefinition = "text")
    private String evidenceJson;
}
