package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.MaintenanceStatus;
import com.ccadro.asset.entity.enums.MaintenanceType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table (name = "vehicle_maintenance")
public class VehicleMaintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "vehicle_id", nullable = false)
    UUID vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_type", nullable = false, length = 30)
    MaintenanceType maintenanceType;

    @Column(name = "scheduled_date", nullable = false)
    LocalDate scheduledDate;

    @Column(name = "completed_date")
    LocalDate completedDate;

    @Column(name = "odometer_km", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    BigDecimal odometerKm = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    MaintenanceStatus status = MaintenanceStatus.SCHEDULED;

    @Column(name = "description", columnDefinition = "text")
    String description;

    @Column(name = "cost", precision = 12, scale = 2)
    BigDecimal cost;

    @Column(name = "performed_by", length = 100)
    String performedBy;

    @Column(name = "evidence_url", columnDefinition = "text")
    String evidenceUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();
}
