package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationResponse {
    String token;
    Date expiryToken;
    String refreshToken;
    Date refreshExpiry;
    String sessionId;
    String username;
    String role;
    String assignedHubCode;
    String assignedShipperCode;
    List<String> permissions;
    Boolean mustChangePassword;
}
