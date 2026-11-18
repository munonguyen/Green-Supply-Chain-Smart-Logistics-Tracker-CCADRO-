package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserSessionResponse {
    UUID sessionId;
    String username;
    String deviceInfo;
    String ipAddress;
    Instant issuedAt;
    Instant lastRefreshedAt;
    Instant expiresAt;
    boolean current;
}

