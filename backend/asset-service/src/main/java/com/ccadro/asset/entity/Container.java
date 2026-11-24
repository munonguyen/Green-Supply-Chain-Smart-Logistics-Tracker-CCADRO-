package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "container")
public class Container extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    UUID id;

    @Column(name = "container_code", nullable = false, unique = true, length = 50)
    String containerCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "container_type", nullable = false, length = 30)
    ContainerType containerType;

    @Column(name = "iso_type", length = 10)
    @Builder.Default
    String isoType = "45R1";

    @Column(name = "owner_name", length = 100)
    @Builder.Default
    String ownerName = "Tân Cảng Sài Gòn (SNP Logistics)";

    @Column(name = "csc_approval_country", length = 100)
    String cscApprovalCountry;

    @Column(name = "csc_approval_reference", length = 100)
    String cscApprovalReference;

    @Column(name = "csc_manufacture_date")
    LocalDate cscManufactureDate;

    @Column(name = "csc_inspection_scheme", length = 30)
    String cscInspectionScheme;

    @Column(name = "csc_acep_program_number", length = 100)
    String cscAcepProgramNumber;

    @Column(name = "csc_next_examination_date")
    LocalDate cscNextExaminationDate;

    @Column(name = "responsible_company_id")
    UUID responsibleCompanyId;

    @Column(name = "responsible_company_code", length = 50)
    String responsibleCompanyCode;

    @Column(name = "responsible_company_name", length = 200)
    String responsibleCompanyName;

    @Column(name = "tare_weight_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal tareWeightTons;

    @Column(name = "max_payload_tons", nullable = false, precision = 10, scale = 2)
    BigDecimal maxPayloadTons;

    @Column(name = "cubic_capacity_m3", precision = 8, scale = 2)
    @Builder.Default
    BigDecimal cubicCapacityM3 = BigDecimal.valueOf(67.9);

    @Column(name = "is_reefer", nullable = false)
    @Builder.Default
    Boolean isReefer = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    ContainerStatus status = ContainerStatus.AVAILABLE;

    // Smart E-Seal & Security (ISO 17712 / Hải quan điện tử)
    @Column(name = "e_seal_number", length = 50)
    String eSealNumber;

    @Column(name = "e_seal_status", length = 30)
    @Builder.Default
    String eSealStatus = "LOCKED_SECURE";

    @Column(name = "e_seal_integrity_pct")
    @Builder.Default
    Integer eSealIntegrityPct = 100;

    // IoT Telematics & Cold-chain sensors
    @Column(name = "telematics_model", length = 100)
    @Builder.Default
    String telematicsModel = "Carrier DataCOLD 600 / Nexxiot Globehopper Edge 3";

    @Column(name = "supply_air_temp_c", precision = 5, scale = 2)
    BigDecimal supplyAirTempC;

    @Column(name = "return_air_temp_c", precision = 5, scale = 2)
    BigDecimal returnAirTempC;

    @Column(name = "reefer_set_point_temp_c", precision = 5, scale = 2)
    BigDecimal reeferSetPointTempC;

    @Column(name = "reefer_temperature_alarm_status", length = 50)
    String reeferTemperatureAlarmStatus;

    @Column(name = "humidity_pct", precision = 5, scale = 2)
    BigDecimal humidityPct;

    @Column(name = "shock_g", precision = 5, scale = 2)
    BigDecimal shockG;

    @Column(name = "solar_power_watts", precision = 5, scale = 2)
    BigDecimal solarPowerWatts;

    @Column(name = "battery_pct")
    @Builder.Default
    Integer batteryPct = 98;

    // Live Tracking & Telemetry
    @Column(name = "last_latitude", precision = 10, scale = 6)
    BigDecimal lastLatitude;

    @Column(name = "last_longitude", precision = 10, scale = 6)
    BigDecimal lastLongitude;

    @Column(name = "last_location_name", length = 255)
    String lastLocationName;

    @Column(name = "progress_pct", precision = 5, scale = 2)
    @Builder.Default
    BigDecimal progressPct = BigDecimal.ZERO;

    @Column(name = "speed_kmh", precision = 5, scale = 2)
    @Builder.Default
    BigDecimal speedKmh = BigDecimal.ZERO;

    @Column(name = "eta_minutes")
    @Builder.Default
    Integer etaMinutes = 0;

    // Server receipt time; never use generic updatedAt as a connectivity heartbeat.
    @Column(name = "last_telemetry_received_at")
    Instant lastTelemetryReceivedAt;

    @Column(name = "last_location_name_at")
    Instant lastLocationNameAt;

    @Column(name = "last_progress_at")
    Instant lastProgressAt;

    @Column(name = "last_speed_at")
    Instant lastSpeedAt;

    // Field-level receipt times prevent partial packets from making other readings look fresh.
    @Column(name = "last_supply_air_temp_at")
    Instant lastSupplyAirTempAt;

    @Column(name = "last_return_air_temp_at")
    Instant lastReturnAirTempAt;

    @Column(name = "last_reefer_set_point_at")
    Instant lastReeferSetPointAt;

    @Column(name = "last_reefer_alarm_at")
    Instant lastReeferAlarmAt;

    @Column(name = "last_humidity_at")
    Instant lastHumidityAt;

    @Column(name = "last_shock_at")
    Instant lastShockAt;

    @Column(name = "last_solar_power_at")
    Instant lastSolarPowerAt;

    @Column(name = "last_battery_at")
    Instant lastBatteryAt;

    @Column(name = "last_eta_at")
    Instant lastEtaAt;

    @Column(name = "last_seal_at")
    Instant lastSealAt;

    // Only a telemetry packet carrying both coordinates can refresh position freshness.
    @Column(name = "last_position_received_at")
    Instant lastPositionReceivedAt;

    @Column(name = "last_position_observed_at")
    Instant lastPositionObservedAt;

    // Operational Assignment (Shipment, Driver, Vehicle)
    @Column(name = "assigned_shipment_id")
    UUID assignedShipmentId;

    @Column(name = "assigned_shipment_code", length = 50)
    String assignedShipmentCode;

    @Column(name = "assigned_driver_id")
    UUID assignedDriverId;

    @Column(name = "driver_name", length = 100)
    String driverName;

    @Column(name = "driver_phone", length = 20)
    String driverPhone;

    @Column(name = "driver_license", length = 50)
    String driverLicense;

    @Column(name = "driver_safety_score", precision = 3, scale = 2)
    @Builder.Default
    BigDecimal driverSafetyScore = BigDecimal.valueOf(4.95);

    @Column(name = "assigned_vehicle_id")
    UUID assignedVehicleId;

    @Column(name = "vehicle_license_plate", length = 30)
    String vehicleLicensePlate;

    @Column(name = "vehicle_type_label", length = 50)
    String vehicleTypeLabel;

    @Column(name = "origin_name", length = 255)
    String originName;

    @Column(name = "destination_name", length = 255)
    String destinationName;

    // Delivery & ePOD
    @Column(name = "completed_at")
    Instant completedAt;

    @Column(name = "epod_recipient", length = 100)
    String epodRecipient;

    @Column(name = "epod_signature", columnDefinition = "text")
    String epodSignature;

    @Column(name = "epod_notes", columnDefinition = "text")
    String epodNotes;
}
