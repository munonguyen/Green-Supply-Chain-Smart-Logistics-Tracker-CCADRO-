package com.ccadro.shipment.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dispatch_order")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DispatchOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "dispatch_code", nullable = false, unique = true, length = 50)
    String dispatchCode;

    @Column(name = "shipment_id", nullable = false)
    UUID shipmentId;

    @Column(name = "vehicle_id", nullable = false)
    UUID vehicleId;

    @Column(name = "driver_id", nullable = false)
    UUID driverId;

    @Column(name = "container_id")
    UUID containerId;

    @Column(name = "assigned_route_version_id")
    UUID assignedRouteVersionId;

    @Column(name = "dispatched_at", nullable = false)
    Instant dispatchedAt = Instant.now();

    @Column(name = "dispatched_by", nullable = false, length = 100)
    String dispatchedBy = "DISPATCHER";

    @Column(name = "status", nullable = false, length = 30)
    String status = "ASSIGNED";

    @Column(name = "notes", columnDefinition = "text")
    String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}
