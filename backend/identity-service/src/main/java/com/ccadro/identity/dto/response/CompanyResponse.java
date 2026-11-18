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
public class CompanyResponse {
    UUID id;
    String companyCode;
    String companyName;
    String taxCode;
    String businessLicenseNumber;
    String industry;
    String companyType;
    String companyPhone;
    String companyEmail;
    String headquartersAddress;
    String representativeName;
    String representativeTitle;
    String creditTier;
    Long creditLimitVnd;
    String kycStatus;
    long activeUserCount;
    Boolean isDeleted;
    Instant deletedAt;
    String deletedBy;
    Instant createdAt;
    Instant updatedAt;
}

