package com.ccadro.identity.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "hub_accounts", schema = "hub_iam")
public class HubIamAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "account_code", nullable = false, unique = true, length = 40)
    String accountCode;

    @Column(name = "user_id")
    UUID userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    String username;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    String passwordHash;

    @Builder.Default
    @Column(name = "password_algo", nullable = false, length = 30)
    String passwordAlgo = "BCRYPT-10";

    @Column(name = "full_name", nullable = false, length = 150)
    String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 120)
    String email;

    @Column(name = "phone", length = 40)
    String phone;

    @Column(name = "functional_role", nullable = false, length = 40)
    String functionalRole;

    @Column(name = "assigned_hub_code", length = 40)
    String assignedHubCode;

    @Column(name = "assigned_shipper_code", length = 40)
    String assignedShipperCode;

    @Column(name = "scope_summary", nullable = false, length = 300)
    String scopeSummary;

    @Builder.Default
    @Column(name = "can_ingest_manifest", nullable = false)
    boolean canIngestManifest = false;

    @Builder.Default
    @Column(name = "can_assign_code_range", nullable = false)
    boolean canAssignCodeRange = false;

    @Builder.Default
    @Column(name = "can_submit_photo_pod", nullable = false)
    boolean canSubmitPhotoPod = false;

    @Builder.Default
    @Column(name = "can_manage_accounts", nullable = false)
    boolean canManageAccounts = false;

    @Builder.Default
    @Column(name = "read_only_audit", nullable = false)
    boolean readOnlyAudit = false;

    @Builder.Default
    @Column(name = "max_session_minutes", nullable = false)
    int maxSessionMinutes = 480;

    @Builder.Default
    @Column(name = "failed_login_attempts", nullable = false)
    int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    Instant lockedUntil;

    @Column(name = "last_login_at")
    Instant lastLoginAt;

    @Column(name = "last_login_ip", length = 60)
    String lastLoginIp;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    String status = "ACTIVE";

    @Builder.Default
    @Column(name = "created_by", nullable = false, length = 60)
    String createdBy = "SYSTEM_SECURITY_SEED";

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

