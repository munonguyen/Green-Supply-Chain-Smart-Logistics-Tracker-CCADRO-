package com.ccadro.asset.dto.response;

import com.ccadro.asset.entity.enums.DriverStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverResponse {

    UUID id;
    String driverCode;
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
    Boolean verified;
    DriverStatus status;
    BigDecimal rating;
    Integer totalTrips;
    BigDecimal onTimeRate;
    Integer ecoScore;
    BigDecimal greenKmTotal;
    Integer violationsCount;
    Integer hosContinuousMin;
    Integer hosDailyMin;
    Integer hosContinuousLimitMin;
    Integer hosDailyLimitMin;
    Boolean preTripPassed;
    String preTripTime;
    String assignedVehiclePlate;
    String assignedVehicleType;
    List<String> safetyCerts;

    // Live container & trip synchronization fields
    String assignedContainerCode;
    String assignedShipmentCode;
    String currentRoute;
    BigDecimal liveSpeedKmh;
    BigDecimal liveProgressPct;
    Integer liveEtaMinutes;
    String eSealNumber;

    List<DriverReviewResponse> recentReviews;
    List<DriverDispatchMessageResponse> dispatchMessages;

    Instant createdAt;
    Instant updatedAt;
}
