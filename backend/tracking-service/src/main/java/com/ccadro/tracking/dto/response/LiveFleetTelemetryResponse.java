package com.ccadro.tracking.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LiveFleetTelemetryResponse {

    UUID tripId;
    String tripCode;
    UUID shipmentId;
    String shipmentCode;
    String customerId;

    UUID vehicleId;
    String vehicleCode;
    String licensePlate;
    String vehicleType;
    String fuelType;
    String euroStandard;

    UUID driverId;
    String driverName;

    String containerCode;
    String originName;
    Double originLat;
    Double originLon;
    String destinationName;
    Double destinationLat;
    Double destinationLon;

    Double latitude;
    Double longitude;
    String currentLocationName;

    Double speedKmh;
    Double headingDegrees;
    Double totalDistanceKm;
    Double traveledDistanceKm;
    Double remainingDistanceKm;
    Integer progressPercent;
    Integer etaMinutes;

    Double deviationMeters;
    String deviationStatus;
    Double temperatureC;
    Double batteryPercentage;
    Double co2SavedKg;

    String tripStatus;
    String dataSource;
    Instant lastTelemetryAt;

    Double distanceToDestinationMeters;
    Double arrivalRadiusMeters;
    Boolean arrivedAtDestination;
    String arrivalStatus;
    Instant arrivedAt;

    java.util.List<java.util.List<Double>> routeWaypoints;
    String routeSource;
}

