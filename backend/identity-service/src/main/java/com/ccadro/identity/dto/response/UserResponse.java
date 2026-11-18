package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    UUID id;
    String username;
    String email;
    String firstName;
    String lastName;
    String status;
    String assignedHubCode;
    String assignedShipperCode;
    String phoneNumber;
    String jobTitle;
    String department;
    String nationalId;
    String workAddress;
    UUID companyId;
    String customerId;
    String companyName;
    String taxCode;
    String kycStatus;
    String notes;
    int failedLoginAttempts;
    Instant lockedUntil;
    Instant lastLoginAt;
    Instant passwordChangedAt;
    Set<RoleResponse> roles;
    Boolean isDeleted;
    Instant deletedAt;
    String deletedBy;
    Instant createdAt;
}

