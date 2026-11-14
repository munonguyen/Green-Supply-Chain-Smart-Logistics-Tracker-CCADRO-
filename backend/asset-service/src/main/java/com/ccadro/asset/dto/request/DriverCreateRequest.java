package com.ccadro.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverCreateRequest {

    @NotBlank(message = "driverCode must not be blank")
    String driverCode;

    @NotBlank(message = "fullName must not be blank")
    String fullName;

    String phone;
    String email;
    String dateOfBirth;
    String nationalId;
    String hometown;
    String avatarUrl;
    String licenseClass;
    String licenseNumber;
    String licenseExpiryDate;
    Integer experienceYears;
    String assignedVehiclePlate;
    String assignedVehicleType;
    List<String> safetyCerts;
}
