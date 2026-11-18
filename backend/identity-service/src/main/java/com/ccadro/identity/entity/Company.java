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
@Table(name = "companies")
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "company_code", nullable = false, unique = true, length = 50)
    String companyCode;

    @Column(name = "company_name", nullable = false, length = 200)
    String companyName;

    @Column(name = "tax_code", length = 40)
    String taxCode;

    @Column(name = "business_license_number", length = 80)
    String businessLicenseNumber;

    @Column(name = "industry", length = 120)
    String industry;

    @Builder.Default
    @Column(name = "company_type", nullable = false, length = 30)
    String companyType = "B2B_CUSTOMER";

    @Column(name = "company_phone", length = 30)
    String companyPhone;

    @Column(name = "company_email", length = 120)
    String companyEmail;

    @Column(name = "headquarters_address", columnDefinition = "TEXT")
    String headquartersAddress;

    @Column(name = "representative_name", length = 120)
    String representativeName;

    @Column(name = "representative_title", length = 100)
    String representativeTitle;

    @Builder.Default
    @Column(name = "credit_tier", nullable = false, length = 30)
    String creditTier = "STANDARD";

    @Builder.Default
    @Column(name = "credit_limit_vnd", nullable = false)
    Long creditLimitVnd = 0L;

    @Builder.Default
    @Column(name = "kyc_status", nullable = false, length = 30)
    String kycStatus = "VERIFIED";

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

