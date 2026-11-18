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
@Table(name = "hub_auth_audit_logs", schema = "hub_iam")
public class HubAuthAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "username", nullable = false, length = 60)
    String username;

    @Column(name = "functional_role", length = 40)
    String functionalRole;

    @Column(name = "hub_code", length = 40)
    String hubCode;

    @Column(name = "event_type", nullable = false, length = 50)
    String eventType;

    @Builder.Default
    @Column(name = "http_status", nullable = false)
    int httpStatus = 200;

    @Builder.Default
    @Column(name = "client_ip", length = 60)
    String clientIp = "127.0.0.1";

    @Column(name = "detail", nullable = false, columnDefinition = "TEXT")
    String detail;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}

