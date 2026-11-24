package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.ContainerSafetyStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "container_safety_inspection", indexes = {
    @Index(name = "idx_container_safety_round_latest", columnList = "container_id,control_round_id,inspected_at")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContainerSafetyInspection {
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    @Column(name = "container_id", nullable = false)
    private UUID containerId;
    @Column(name = "container_code", nullable = false, length = 50)
    private String containerCode;
    @Enumerated(EnumType.STRING)
    @Column(name = "container_type", nullable = false, length = 30)
    private ContainerType containerType;
    @Column(name = "control_round_id")
    private UUID controlRoundId;
    @Column(name = "round_number", nullable = false)
    private int roundNumber;
    @Column(name = "inspection_number", nullable = false)
    private int inspectionNumber;
    @Column(name = "checked_items_count", nullable = false)
    private int checkedItemsCount;
    @Column(name = "total_items_count", nullable = false)
    private int totalItemsCount;
    @Version
    private long revision;
    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "template_version", nullable = false, length = 20)
    private String templateVersion;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ContainerSafetyStatus status;
    @Column(name = "failed_items_count", nullable = false)
    private int failedItemsCount;
    @Column(name = "inspected_by", nullable = false, length = 120)
    private String inspectedBy;
    @Column(name = "inspector_role", nullable = false, length = 40)
    private String inspectorRole;
    @Column(name = "inspected_at")
    private Instant inspectedAt;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "checklist_json", nullable = false, columnDefinition = "jsonb")
    private String checklistJson;
    @Column(name = "summary_notes", columnDefinition = "text")
    private String summaryNotes;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
