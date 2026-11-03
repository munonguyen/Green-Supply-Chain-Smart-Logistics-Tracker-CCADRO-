package com.ccadro.shipment.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name="shipment")
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "shipment_code", nullable = false, unique = true, length = 50)
    String shipmentCode;

    @Column(name = "customer_id", nullable = false, length = 50)
    String customerId;

    @Column(name = "origin_name", nullable = false, length = 200)
    String originName;

    @Column(name = "origin_address", columnDefinition = "TEXT")
    String originAddress;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "origin_geom", nullable = false, columnDefinition = "geometry(Point, 4326)")
    Point originGeom;

    @Column(name = "destination_name", nullable = false, length = 200)
    String destinationName;

    @Column(name = "destination_address", columnDefinition = "TEXT")
    String destinationAddress;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "destination_geom", nullable = false, columnDefinition = "geometry(Point, 4326)")
    Point destinationGeom;

    public Double getOriginLatitude() {
        return originGeom != null ? originGeom.getY() : null;
    }

    public Double getOriginLongitude() {
        return originGeom != null ? originGeom.getX() : null;
    }

    public Double getDestinationLatitude() {
        return destinationGeom != null ? destinationGeom.getY() : null;
    }

    public Double getDestinationLongitude() {
        return destinationGeom != null ? destinationGeom.getX() : null;
    }

    @Column(name = "cargo_weight_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal cargoWeightTons;

    @Column(name = "cargo_volume_m3", precision = 10, scale = 2)
    BigDecimal cargoVolumeM3;

    @Column(name = "required_delivery_time")
    Instant requiredDeliveryTime;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    String status = "DRAFT";

    @Column(name = "assigned_vehicle_id")
    UUID assignedVehicleId;

    @Column(name = "assigned_driver_id")
    UUID assignedDriverId;

    @Column(name = "distance")
    String distance;

    @Column(name = "distance_km", precision = 10, scale = 2)
    BigDecimal distanceKm;

    @Column(name = "distance_unit", length = 10)
    @Builder.Default
    String distanceUnit = "KM";


    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();


}
