package com.ccadro.shipment.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

/**
 * Nhật ký trạng thái phiên giao dịch phân tán Orchestration Saga (UC06).
 * Theo dõi từng bước tiến và hỗ trợ bù trừ (Compensating Transactions) khi có bước thất bại.
 */
@Entity
@Table(name = "saga_state_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SagaStateLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "saga_type", nullable = false, length = 50)
    @Builder.Default
    String sagaType = "TRIP_DISPATCH_SAGA_UC06";

    @Column(name = "shipment_id", nullable = false)
    UUID shipmentId;

    @Column(name = "vehicle_id", nullable = false)
    UUID vehicleId;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "current_step", nullable = false, length = 50)
    String currentStep;

    @Column(name = "saga_status", nullable = false, length = 30)
    String sagaStatus;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

