package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.Email;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    @Email(message = "Email không đúng định dạng")
    String email;
    String firstName;
    String lastName;
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
    String status;
    String assignedHubCode;
    String assignedShipperCode;
    Set<String> roles;
}

