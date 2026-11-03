package com.ccadro.identity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "invalidated_tokens")
public class InvalidatedToken {
    @Id
    @Column(name = "id", length = 255)
    String id;

    @Column(name = "expiry_time", nullable = false)
    Instant expiryTime;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    Instant createdAt = Instant.now();
}

