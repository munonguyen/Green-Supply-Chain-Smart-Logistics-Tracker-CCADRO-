package com.ccadro.asset.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContainerResponse {
    UUID id;
    String containerCode;
    String containerType;
    String isoType;
    String ownerName;
    BigDecimal tareWeightTons;
    BigDecimal maxPayloadTons;
    BigDecimal cubicCapacityM3;
    Boolean isReefer;
    String status;

    // Smart E-Seal & Security
    String eSealNumber;
    String eSealStatus;
    Integer eSealIntegrityPct;

    // IoT Telematics & Cold-chain sensors
    String telematicsModel;
    BigDecimal supplyAirTempC;
    BigDecimal returnAirTempC;
    BigDecimal humidityPct;
    BigDecimal shockG;
    BigDecimal solarPowerWatts;
    Integer batteryPct;

    // Live Tracking & Telemetry
    BigDecimal lastLatitude;
    BigDecimal lastLongitude;
    String lastLocationName;
    BigDecimal progressPct;
    BigDecimal speedKmh;
    Integer etaMinutes;

    // Operational Assignment (Shipment, Driver, Vehicle)
    UUID assignedShipmentId;
    String assignedShipmentCode;
    UUID assignedDriverId;
    String driverName;
    String driverPhone;
    String driverLicense;
    BigDecimal driverSafetyScore;
    UUID assignedVehicleId;
    String vehicleLicensePlate;
    String vehicleTypeLabel;
    String originName;
    String destinationName;

    // Delivery & ePOD
    Instant completedAt;
    String epodRecipient;
    String epodSignature;

    Instant createdAt;
    Instant updatedAt;
}
