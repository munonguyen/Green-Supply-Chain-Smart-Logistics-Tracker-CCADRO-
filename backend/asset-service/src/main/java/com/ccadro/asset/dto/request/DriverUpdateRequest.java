package com.ccadro.asset.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverUpdateRequest {
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
    Integer hosContinuousMin;
    Integer hosDailyMin;
    Boolean preTripPassed;
    String preTripTime;
    String assignedVehiclePlate;
    String assignedVehicleType;
    List<String> safetyCerts;
}

