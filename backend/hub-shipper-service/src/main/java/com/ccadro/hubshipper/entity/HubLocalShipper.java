package com.ccadro.hubshipper.entity;

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
@Table(name = "hub_local_shipper")
public class HubLocalShipper {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "shipper_code", nullable = false, unique = true, length = 40)
    String shipperCode;

    @Column(name = "hub_code", nullable = false, length = 40)
    String hubCode;

    @Column(name = "account_username", length = 80)
    String accountUsername;

    @Column(name = "full_name", nullable = false, length = 150)
    String fullName;

    @Column(name = "phone", nullable = false, length = 40)
    String phone;

    @Column(name = "vehicle_type", nullable = false, length = 60)
    String vehicleType;

    @Column(name = "vehicle_plate", nullable = false, length = 40)
    String vehiclePlate;

    @Column(name = "assigned_zone_name", nullable = false, length = 160)
    String assignedZoneName;

    @Column(name = "assigned_lat", nullable = false)
    Double assignedLat;

    @Column(name = "assigned_lng", nullable = false)
    Double assignedLng;

    @Column(name = "coverage_radius_km", nullable = false)
    @Builder.Default
    Double coverageRadiusKm = 2.5;

    @Column(name = "current_lat", nullable = false)
    Double currentLat;

    @Column(name = "current_lng", nullable = false)
    Double currentLng;

    @Column(name = "cold_chain_capable", nullable = false)
    @Builder.Default
    Boolean coldChainCapable = false;

    @Column(name = "max_capacity_kg", nullable = false)
    @Builder.Default
    Double maxCapacityKg = 1500.0;

    @Column(name = "current_load_kg", nullable = false)
    @Builder.Default
    Double currentLoadKg = 0.0;

    @Column(name = "active_item_count", nullable = false)
    @Builder.Default
    Integer activeItemCount = 0;

    @Column(name = "shift_status", nullable = false, length = 40)
    @Builder.Default
    String shiftStatus = "AVAILABLE";

    @Column(name = "rating", nullable = false)
    @Builder.Default
    Double rating = 4.9;

    @Column(name = "today_delivery_scope", length = 255)
    String todayDeliveryScope;

    @Column(name = "assigned_code_range_from", length = 50)
    String assignedCodeRangeFrom;

    @Column(name = "assigned_code_range_to", length = 50)
    String assignedCodeRangeTo;

    @Column(name = "cccd_masked", length = 24)
    String cccdMasked;

    @Column(name = "cccd_issued_by", length = 140)
    String cccdIssuedBy;

    @Column(name = "cccd_issued_date", length = 20)
    String cccdIssuedDate;

    @Column(name = "kyc_status", nullable = false, length = 32)
    @Builder.Default
    String kycStatus = "PENDING_REVIEW";

    @Column(name = "kyc_verified_at")
    Instant kycVerifiedAt;

    @Column(name = "kyc_verified_by", length = 80)
    String kycVerifiedBy;

    @Column(name = "kyc_note", length = 500)
    String kycNote;

    @Column(name = "permanent_address", length = 255)
    String permanentAddress;

    @Column(name = "emergency_contact_name", length = 120)
    String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 40)
    String emergencyContactPhone;

    @Column(name = "criminal_record_code", length = 60)
    String criminalRecordCode;

    @Column(name = "criminal_record_status", length = 30)
    String criminalRecordStatus;

    @Column(name = "health_check_expiry_date", length = 20)
    String healthCheckExpiryDate;

    @Column(name = "driver_license_class", length = 16)
    String driverLicenseClass;

    @Column(name = "driver_license_masked", length = 32)
    String driverLicenseMasked;

    @Column(name = "driver_license_expiry_date", length = 20)
    String driverLicenseExpiryDate;

    @Column(name = "cold_chain_certified", nullable = false)
    @Builder.Default
    Boolean coldChainCertified = false;

    @Column(name = "vehicle_registration_no", length = 40)
    String vehicleRegistrationNo;

    @Column(name = "inspection_expiry_date", length = 20)
    String inspectionExpiryDate;

    @Column(name = "insurance_expiry_date", length = 20)
    String insuranceExpiryDate;

    @Column(name = "gps_device_code", length = 40)
    String gpsDeviceCode;

    @Column(name = "on_time_rate_pct", nullable = false)
    @Builder.Default
    Double onTimeRatePct = 98.0;

    @Column(name = "pod_compliance_pct", nullable = false)
    @Builder.Default
    Double podCompliancePct = 100.0;

    @Column(name = "completed_orders_month", nullable = false)
    @Builder.Default
    Integer completedOrdersMonth = 0;

    @Column(name = "cod_limit_vnd", nullable = false)
    @Builder.Default
    Long codLimitVnd = 20000000L;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    String avatarUrl;

    @Column(name = "last_telemetry_at")
    @Builder.Default
    Instant lastTelemetryAt = Instant.now();

    @Column(name = "shift_checked_in_at")
    Instant shiftCheckedInAt;

    @Column(name = "shift_ended_at")
    Instant shiftEndedAt;

    @Builder.Default
    @Column(name = "cod_holding_vnd", nullable = false)
    Long codHoldingVnd = 0L;

    @Builder.Default
    @Column(name = "cod_collected_qr_today_vnd", nullable = false)
    Long codCollectedQrTodayVnd = 0L;

    @Builder.Default
    @Column(name = "cod_remitted_today_vnd", nullable = false)
    Long codRemittedTodayVnd = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    Instant updatedAt = Instant.now();
}

