package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.DriverStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "driver")
public class Driver extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "driver_code", nullable = false, unique = true, length = 50)
    String driverCode;

    @Column(name = "full_name", nullable = false, length = 100)
    String fullName;

    @Column(name = "phone", length = 20)
    String phone;

    @Column(name = "email", length = 120)
    String email;

    @Column(name = "date_of_birth", length = 20)
    String dateOfBirth;

    @Column(name = "national_id", length = 30)
    String nationalId;

    @Column(name = "hometown", length = 150)
    String hometown;

    @Column(name = "avatar_url", length = 255)
    String avatarUrl;

    @Column(name = "license_class", nullable = false, length = 20)
    @Builder.Default
    String licenseClass = "FC";

    @Column(name = "license_number", length = 50)
    String licenseNumber;

    @Column(name = "license_expiry_date", length = 20)
    String licenseExpiryDate;

    @Column(name = "experience_years", nullable = false)
    @Builder.Default
    Integer experienceYears = 5;

    @Column(name = "verified", nullable = false)
    @Builder.Default
    Boolean verified = Boolean.TRUE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    DriverStatus status = DriverStatus.AVAILABLE;

    @Column(name = "rating", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    BigDecimal rating = BigDecimal.valueOf(4.95);

    @Column(name = "total_trips", nullable = false)
    @Builder.Default
    Integer totalTrips = 0;

    @Column(name = "on_time_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    BigDecimal onTimeRate = BigDecimal.valueOf(99.00);

    @Column(name = "eco_score", nullable = false)
    @Builder.Default
    Integer ecoScore = 95;

    @Column(name = "green_km_total", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    BigDecimal greenKmTotal = BigDecimal.ZERO;

    @Column(name = "violations_count", nullable = false)
    @Builder.Default
    Integer violationsCount = 0;

    @Column(name = "hos_continuous_min", nullable = false)
    @Builder.Default
    Integer hosContinuousMin = 0;

    @Column(name = "hos_daily_min", nullable = false)
    @Builder.Default
    Integer hosDailyMin = 0;

    @Column(name = "pre_trip_passed", nullable = false)
    @Builder.Default
    Boolean preTripPassed = Boolean.TRUE;

    @Column(name = "pre_trip_time", length = 120)
    String preTripTime;

    @Column(name = "assigned_vehicle_plate", length = 30)
    String assignedVehiclePlate;

    @Column(name = "assigned_vehicle_type", length = 120)
    String assignedVehicleType;

    @Column(name = "safety_certs_json", nullable = false, columnDefinition = "text")
    @Builder.Default
    String safetyCertsJson = "[\"Eco-Driving GLEC v3\",\"An Toàn Container\"]";
}
