package com.ccadro.identity.entity;

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
@Table(name = "branches")
public class Branch {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "branch_code", nullable = false, unique = true, length = 40)
    String branchCode;

    @Column(name = "branch_name", nullable = false, length = 180)
    String branchName;

    @Builder.Default
    @Column(name = "region", nullable = false, length = 60)
    String region = "MIEN_NAM";

    @Builder.Default
    @Column(name = "branch_type", nullable = false, length = 50)
    String branchType = "REGIONAL_HUB";

    @Column(name = "city", nullable = false, length = 100)
    String city;

    @Column(name = "address", columnDefinition = "TEXT")
    String address;

    @Column(name = "phone", length = 30)
    String phone;

    @Column(name = "email", length = 100)
    String email;

    @Column(name = "manager_username", length = 50)
    String managerUsername;

    @Column(name = "manager_name", length = 120)
    String managerName;

    @Builder.Default
    @Column(name = "vehicle_capacity", nullable = false)
    Integer vehicleCapacity = 30;

    @Builder.Default
    @Column(name = "monthly_revenue_target_vnd", nullable = false)
    Long monthlyRevenueTargetVnd = 500_000_000L;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 30)
    String status = "ACTIVE";

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    Boolean isDeleted = false;

    @Column(name = "deleted_at")
    Instant deletedAt;

    @Column(name = "deleted_by", length = 60)
    String deletedBy;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    Instant updatedAt = Instant.now();
}
