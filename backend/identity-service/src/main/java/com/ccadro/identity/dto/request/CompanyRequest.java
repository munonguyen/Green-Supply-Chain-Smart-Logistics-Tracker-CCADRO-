package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CompanyRequest {
    @NotBlank(message = "Mã công ty không được để trống")
    @Size(min = 2, max = 50, message = "Mã công ty phải từ 2 đến 50 ký tự")
    String companyCode;

    @NotBlank(message = "Tên pháp lý công ty không được để trống")
    @Size(max = 200, message = "Tên công ty tối đa 200 ký tự")
    String companyName;

    String taxCode;
    String businessLicenseNumber;
    String industry;
    String companyType; // INTERNAL_CORP, B2B_CUSTOMER, PARTNER_3PL, HUB_OPERATOR
    String companyPhone;
    String companyEmail;
    String headquartersAddress;
    String representativeName;
    String representativeTitle;
    String creditTier; // STANDARD, GOLD_NET30, ENTERPRISE_MSA
    Long creditLimitVnd;
    String kycStatus; // PENDING, VERIFIED, REJECTED
}

