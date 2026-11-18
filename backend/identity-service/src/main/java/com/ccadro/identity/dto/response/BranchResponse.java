package com.ccadro.identity.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BranchResponse {
    UUID id;
    String branchCode;
    String branchName;
    String region;
    String branchType;
    String city;
    String address;
    String phone;
    String email;
    String managerUsername;
    String managerName;
    Integer vehicleCapacity;
    Long monthlyRevenueTargetVnd;
    String status;
    long activeStaffCount;
    Boolean isDeleted;
    Instant deletedAt;
    String deletedBy;
    Instant createdAt;
    Instant updatedAt;
}
