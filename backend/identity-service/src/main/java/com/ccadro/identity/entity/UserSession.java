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
@Table(name = "user_sessions")
public class UserSession {
    @Id
    @Column(name = "id")
    UUID id;

    @Column(name = "user_id")
    UUID userId;

    @Column(name = "username", nullable = false, length = 50)
    String username;

    @Column(name = "family_id", nullable = false)
    UUID familyId;

    @Column(name = "refresh_token_hash", nullable = false, unique = true, length = 128)
    String refreshTokenHash;

    @Column(name = "previous_refresh_token_hash", length = 128)
    String previousRefreshTokenHash;

    @Column(name = "device_info", length = 255)
    String deviceInfo;

    @Column(name = "ip_address", length = 64)
    String ipAddress;

    @Builder.Default
    @Column(name = "issued_at", nullable = false)
    Instant issuedAt = Instant.now();

    @Builder.Default
    @Column(name = "last_refreshed_at", nullable = false)
    Instant lastRefreshedAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    Instant expiresAt;

    @Builder.Default
    @Column(name = "revoked", nullable = false)
    boolean revoked = false;

    @Column(name = "revoked_at")
    Instant revokedAt;

    @Column(name = "revoke_reason", length = 120)
    String revokeReason;
}

