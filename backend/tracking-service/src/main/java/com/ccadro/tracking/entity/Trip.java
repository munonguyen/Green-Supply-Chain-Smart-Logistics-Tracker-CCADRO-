package com.ccadro.tracking.entity;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "trip_code", nullable = false, unique = true, length = 50)
    private String tripCode;

    @Column(name = "shipment_id", nullable = false)
    private UUID shipmentId;

    @Column(name = "vehicle_id", nullable = false)
    private UUID vehicleId;

    @Column(name = "driver_id", nullable = false)
    private UUID driverId;

    @Column(name = "active_route_version_id")
    private UUID activeRouteVersionId;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "SCHEDULED";

    @Column(name = "actual_distance_meters", nullable = false, precision = 12, scale = 2)
    private BigDecimal actualDistanceMeters = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 60)
    private String deletedBy;

    @Column(name = "arrived_at")
    private Instant arrivedAt;

    @Column(name = "arrival_status", length = 30)
    private String arrivalStatus = "AT_ORIGIN";

    @Column(name = "distance_to_destination_meters", precision = 12, scale = 2)
    private BigDecimal distanceToDestinationMeters;
}
