package com.ccadro.identity.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCreationRequest {
    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 50, message = "Username phải từ 3 đến 50 ký tự")
    String username;

    @NotBlank(message = "Password không được để trống")
    @Size(min = 3, message = "Password phải từ 3 ký tự trở lên")
    String password;

    @NotBlank(message = "Email không được để trống")
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
    String assignedHubCode;
    String assignedShipperCode;
    String notes;
    Set<String> roles;
}
