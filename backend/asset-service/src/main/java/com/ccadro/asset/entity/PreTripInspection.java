package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.InspectionStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "pre_trip_inspection")
public class PreTripInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "vehicle_id", nullable = false)
    UUID vehicleId;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "shipment_id")
    UUID shipmentId;

    @Column(name = "inspection_time", nullable = false)
    @Builder.Default
    Instant inspectionTime = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    InspectionStatus status = InspectionStatus.PASSED;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "checklist_json", columnDefinition = "jsonb")
    @Builder.Default
    String checklistJson = "{}";

    @Column(name = "critical_failures_count", nullable = false)
    @Builder.Default
    Integer criticalFailuresCount = 0;

    @Column(name = "remarks", columnDefinition = "text")
    String remarks;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt;
}
