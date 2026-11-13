package com.ccadro.asset.entity;

import com.ccadro.asset.entity.enums.ContainerStatus;
import com.ccadro.asset.entity.enums.ContainerType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
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

    @Column(name = "epod_signature", length = 255)
    String epodSignature;
}
