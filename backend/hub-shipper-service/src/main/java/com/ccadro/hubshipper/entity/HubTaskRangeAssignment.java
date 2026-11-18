package com.ccadro.hubshipper.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "hub_task_range_assignment")
public class HubTaskRangeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "batch_code", nullable = false, unique = true, length = 60)
    String batchCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "shipper_code", nullable = false, length = 40)
    String shipperCode;

    @Column(name = "shipper_name", nullable = false, length = 150)
    String shipperName;

    @Column(name = "from_item_code", nullable = false, length = 50)
    String fromItemCode;

    @Column(name = "to_item_code", nullable = false, length = 50)
    String toItemCode;

    @Column(name = "total_items", nullable = false)
    @Builder.Default
    Integer totalItems = 1;

    @Column(name = "total_weight_kg", nullable = false)
    @Builder.Default
    Double totalWeightKg = 0.0;

    @Column(name = "assigned_zone_scope", nullable = false, length = 255)
    String assignedZoneScope;

    @Column(name = "batch_status", nullable = false, length = 40)
    @Builder.Default
    String batchStatus = "ACTIVE_IN_SHIFT";

    @Column(name = "assigned_by", nullable = false, length = 100)
    @Builder.Default
    String assignedBy = "HUB_AUTO_DISPATCHER";

    @Column(name = "assigned_at", nullable = false)
    @Builder.Default
    Instant assignedAt = Instant.now();
}

