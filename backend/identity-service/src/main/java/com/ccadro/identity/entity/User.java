package com.ccadro.identity.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    String username;

    @Column(name = "password", nullable = false)
    String password;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    String email;

    @Column(name = "first_name", length = 50)
    String firstName;

    @Column(name = "last_name", length = 50)
    String lastName;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    String status = "ACTIVE";

    @Column(name = "assigned_hub_code", length = 40)
    String assignedHubCode;

    @Column(name = "assigned_shipper_code", length = 40)
    String assignedShipperCode;

    @Column(name = "phone_number", length = 30)
    String phoneNumber;

    @Column(name = "job_title", length = 100)
    String jobTitle;

    @Column(name = "department", length = 150)
    String department;

    @Column(name = "national_id", length = 40)
    String nationalId;

    @Column(name = "work_address", columnDefinition = "TEXT")
    String workAddress;

    @Column(name = "company_id")
    UUID companyId;

    @Column(name = "customer_id", length = 60)
    String customerId;

    @Column(name = "company_name", length = 200)
    String companyName;

    @Column(name = "tax_code", length = 40)
    String taxCode;

    @Builder.Default
    @Column(name = "kyc_status", length = 30)
    String kycStatus = "VERIFIED";

    @Column(name = "notes", columnDefinition = "TEXT")
    String notes;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    Instant lockedUntil;

    @Column(name = "last_login_at")
    Instant lastLoginAt;

    @Builder.Default
    @Column(name = "password_changed_at", nullable = false)
    Instant passwordChangedAt = Instant.now();

    @Builder.Default
    @Column(name = "must_change_password", nullable = false)
    Boolean mustChangePassword = false;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_name")
    )
    Set<Role> roles;

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

