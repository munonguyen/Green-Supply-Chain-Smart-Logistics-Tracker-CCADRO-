package com.ccadro.asset.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

/**
 * Trụ sở / Bưu cục Điều phối Khu vực (Local Distribution Hub) nhận dữ liệu hàng hóa từ Container.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "local_distribution_hub")
public class LocalDistributionHub {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "hub_code", nullable = false, unique = true, length = 40)
    String hubCode;

    @Column(name = "hub_name", nullable = false, length = 200)
    String hubName;

    @Column(name = "company_name", nullable = false, length = 200)
    String companyName;

    @Column(name = "external_system_name", nullable = false, length = 120)
    String externalSystemName;

    @Column(name = "webhook_endpoint", nullable = false, length = 255)
    String webhookEndpoint;

    @Column(name = "address", nullable = false, length = 255)
    String address;

    @Column(name = "district_zone", nullable = false, length = 120)
    String districtZone;

    @Column(name = "center_lat", nullable = false)
    Double centerLat;

    @Column(name = "center_lng", nullable = false)
    Double centerLng;

    @Column(name = "coverage_radius_km", nullable = false)
    @Builder.Default
    Double coverageRadiusKm = 8.0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

