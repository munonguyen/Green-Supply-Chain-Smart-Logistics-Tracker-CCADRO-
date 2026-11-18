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
@Table(name = "hub_local_shipper")
public class HubLocalShipper {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "shipper_code", nullable = false, unique = true, length = 40)
    String shipperCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "account_username", length = 80)
    String accountUsername;

    @Column(name = "full_name", nullable = false, length = 150)
    String fullName;

    @Column(name = "phone", nullable = false, length = 40)
    String phone;

    @Column(name = "vehicle_type", nullable = false, length = 60)
    String vehicleType;

    @Column(name = "vehicle_plate", nullable = false, length = 40)
    String vehiclePlate;

    @Column(name = "assigned_zone_name", nullable = false, length = 160)
    String assignedZoneName;

    @Column(name = "assigned_lat", nullable = false)
    Double assignedLat;

    @Column(name = "assigned_lng", nullable = false)
    Double assignedLng;

    @Column(name = "coverage_radius_km", nullable = false)
    @Builder.Default
    Double coverageRadiusKm = 2.5;

    @Column(name = "current_lat", nullable = false)
    Double currentLat;

    @Column(name = "current_lng", nullable = false)
    Double currentLng;

    @Column(name = "cold_chain_capable", nullable = false)
    @Builder.Default
    Boolean coldChainCapable = false;

    @Column(name = "max_capacity_kg", nullable = false)
    @Builder.Default
    Double maxCapacityKg = 1500.0;

    @Column(name = "current_load_kg", nullable = false)
    @Builder.Default
    Double currentLoadKg = 0.0;

    @Column(name = "active_item_count", nullable = false)
    @Builder.Default
    Integer activeItemCount = 0;

    @Column(name = "shift_status", nullable = false, length = 40)
    @Builder.Default
    String shiftStatus = "AVAILABLE";

    @Column(name = "rating", nullable = false)
    @Builder.Default
    Double rating = 4.9;

    @Column(name = "today_delivery_scope", length = 255)
    String todayDeliveryScope;

    @Column(name = "assigned_code_range_from", length = 50)
    String assignedCodeRangeFrom;

    @Column(name = "assigned_code_range_to", length = 50)
    String assignedCodeRangeTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

