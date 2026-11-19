package com.ccadro.tracking.service;

import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.dto.response.LiveFleetTelemetryResponse;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import com.ccadro.tracking.repository.TripRepository;
import com.ccadro.tracking.application.port.RouteWaypointDecoder;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Tổng hợp Telemetry đội xe thời gian thực trực tiếp từ PostgreSQL / PostGIS:
 * - Kết hợp Trip, Vehicle, Driver, Shipment, RouteVersion, TelemetryEvent và Container IoT.
 * - Tính cự ly đã đi, cự ly còn lại theo thực địa, ETA dương theo vận tốc thực,
 *   góc phương vị bearing, trạng thái lệch hành lang theo ccadro.deviation.* và lượng CO2e tiết kiệm (GLEC v3).
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class FleetTelemetryService {

    private static final double ROAD_TORTUOSITY_FACTOR = 1.22;
    private static final double DIESEL_BASELINE_TONNE_KM_KG = 0.108;
    private static final double DEFAULT_CARGO_TONS = 14.0;
    private static final double DEFAULT_STOP_FALLBACK_KMH = 45.0;

    TripRepository tripRepository;
    TelemetryEventRepository telemetryEventRepository;
    CcadroProperties ccadroProperties;
    RouteWaypointDecoder routeWaypointDecoder;

    public List<LiveFleetTelemetryResponse> getLiveFleetTelemetry(String customerId, String q) {
        return getLiveFleetTelemetry(customerId, q, null);
    }

    public List<LiveFleetTelemetryResponse> getLiveFleetTelemetry(String customerId, String q, UUID driverId) {
        List<LiveFleetTelemetryResponse> snapshots = new ArrayList<>();
        Set<UUID> trackedShipmentIds = new HashSet<>();

        try {
            List<Object[]> nativeRows = tripRepository.findLiveFleetTelemetryRows();
            if (nativeRows != null) {
                for (Object[] row : nativeRows) {
                    LiveFleetTelemetryResponse item = mapNativeTripRow(row);
                    if (item != null) {
                        snapshots.add(item);
                        if (item.getShipmentId() != null) {
                            trackedShipmentIds.add(item.getShipmentId());
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Native fleet telemetry join skipped, falling back to JPA repositories: {}", ex.getMessage());
        }

        if (snapshots.isEmpty()) {
            List<Trip> activeTrips = tripRepository.findAll().stream()
                    .filter(t -> !Boolean.TRUE.equals(t.getIsDeleted()))
                    .filter(t -> !"COMPLETED".equalsIgnoreCase(t.getStatus())
                            && !"CANCELLED".equalsIgnoreCase(t.getStatus()))
                    .toList();
            for (Trip trip : activeTrips) {
                buildFromTripEntity(trip).ifPresent(snapshots::add);
            }
        }

        try {
            List<Object[]> containerRows = tripRepository.findActiveContainerTelemetryRows();
            if (containerRows != null) {
                for (Object[] row : containerRows) {
                    LiveFleetTelemetryResponse containerItem = mapActiveContainerRow(row);
                    if (containerItem != null && (containerItem.getShipmentId() == null
                            || !trackedShipmentIds.contains(containerItem.getShipmentId()))) {
                        snapshots.add(containerItem);
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Active container IoT telemetry join skipped: {}", ex.getMessage());
        }

        List<LiveFleetTelemetryResponse> scoped = snapshots;
        if (customerId != null && !customerId.isBlank()) {
            String target = customerId.trim().toLowerCase(Locale.ROOT);
            scoped = scoped.stream()
                    .filter(item -> item.getCustomerId() != null
                            && item.getCustomerId().trim().toLowerCase(Locale.ROOT).equals(target))
                    .toList();
        }
        if (driverId != null) {
            scoped = scoped.stream()
                    .filter(item -> driverId.equals(item.getDriverId()))
                    .toList();
        }

        return ElasticSearchSupport.filterAndRank(scoped, q, item -> List.of(
                new ElasticSearchSupport.WeightedField(item.getVehicleCode(), 4.5),
                new ElasticSearchSupport.WeightedField(item.getLicensePlate(), 4.0),
                new ElasticSearchSupport.WeightedField(item.getTripCode(), 3.5),
                new ElasticSearchSupport.WeightedField(item.getShipmentCode(), 3.5),
                new ElasticSearchSupport.WeightedField(item.getContainerCode(), 3.5),
                new ElasticSearchSupport.WeightedField(item.getDriverName(), 3.0),
                new ElasticSearchSupport.WeightedField(item.getOriginName(), 2.0),
                new ElasticSearchSupport.WeightedField(item.getDestinationName(), 2.0)
        ));
    }

    public Optional<LiveFleetTelemetryResponse> getLiveSnapshotForTrip(UUID tripId) {
        if (tripId == null) {
            return Optional.empty();
        }
        try {
            List<Object[]> directRows = tripRepository.findLiveTripTelemetryRowByTripId(tripId);
            if (directRows != null && !directRows.isEmpty()) {
                LiveFleetTelemetryResponse mapped = mapNativeTripRow(directRows.get(0));
                if (mapped != null) {
                    return Optional.of(mapped);
                }
            }
        } catch (Exception ex) {
            log.debug("Direct native snapshot lookup skipped for trip {}: {}", tripId, ex.getMessage());
        }
        try {
            List<Object[]> nativeRows = tripRepository.findLiveFleetTelemetryRows();
            if (nativeRows != null) {
                Optional<LiveFleetTelemetryResponse> found = nativeRows.stream()
                        .map(this::mapNativeTripRow)
                        .filter(Objects::nonNull)
                        .filter(item -> tripId.equals(item.getTripId()))
                        .findFirst();
                if (found.isPresent()) {
                    return found;
                }
            }
        } catch (Exception ex) {
            log.debug("Native snapshot lookup skipped for trip {}: {}", tripId, ex.getMessage());
        }
        return tripRepository.findById(tripId).flatMap(this::buildFromTripEntity);
    }

    private Optional<LiveFleetTelemetryResponse> buildFromTripEntity(Trip trip) {
        if (trip == null || Boolean.TRUE.equals(trip.getIsDeleted())) {
            return Optional.empty();
        }
        TelemetryEvent latest = telemetryEventRepository
                .findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(trip.getId())
                .orElse(null);

        Double plannedMeters = null;
        try {
            plannedMeters = tripRepository.findActiveRouteDistanceMeters(trip.getId()).orElse(null);
        } catch (Exception ignored) {
            // Optional spatial query unavailable in minimal mocks
        }

        double arrivalRadius = ccadroProperties.getArrival().getArrivalRadiusMeters();
        double totalKm = plannedMeters != null && plannedMeters > 0
                ? round2(plannedMeters / 1000.0)
                : 27.3;
        double traveledKm = trip.getActualDistanceMeters() != null
                ? round2(trip.getActualDistanceMeters().doubleValue() / 1000.0)
                : 0.0;
        double remainingKm = round2(Math.max(0.0, totalKm - traveledKm));
        int progress = "COMPLETED".equalsIgnoreCase(trip.getStatus())
                ? 100
                : computeProgressPercent(traveledKm, totalKm);
        double speedKmh = latest != null && latest.getSpeedKmh() != null
                ? latest.getSpeedKmh().doubleValue()
                : 0.0;

        Double distToDestMeters = trip.getDistanceToDestinationMeters() != null
                ? round1(trip.getDistanceToDestinationMeters().doubleValue())
                : null;
        boolean arrived = "COMPLETED".equalsIgnoreCase(trip.getStatus())
                || "ARRIVED_AT_DESTINATION".equalsIgnoreCase(trip.getArrivalStatus())
                || "DELIVERED".equalsIgnoreCase(trip.getArrivalStatus())
                || (distToDestMeters != null && distToDestMeters <= arrivalRadius);
        String arrivalStatus = trip.getArrivalStatus();
        if ("COMPLETED".equalsIgnoreCase(trip.getStatus())) {
            arrivalStatus = "DELIVERED";
            arrived = true;
            distToDestMeters = 0.0;
        } else if (arrivalStatus == null || arrivalStatus.isBlank()) {
            arrivalStatus = arrived ? "ARRIVED_AT_DESTINATION" : (progress > 0 ? "IN_TRANSIT" : "AT_ORIGIN");
        }
        if (arrived) {
            remainingKm = 0.0;
            progress = 100;
        }
        int etaMinutes = arrived ? 0 : computeEtaMinutes(trip.getStatus(), remainingKm, speedKmh);
        double deviationMeters = latest != null && latest.getDistanceFromRouteMeters() != null
                ? round2(latest.getDistanceFromRouteMeters().doubleValue())
                : 0.0;
        double heading = latest != null && latest.getHeadingDegrees() != null
                ? latest.getHeadingDegrees().doubleValue()
                : 0.0;
        double co2SavedKg = computeCo2SavedKg(traveledKm, DEFAULT_CARGO_TONS, "EURO_5");

        return Optional.of(LiveFleetTelemetryResponse.builder()
                .tripId(trip.getId())
                .tripCode(trip.getTripCode())
                .shipmentId(trip.getShipmentId())
                .vehicleId(trip.getVehicleId())
                .driverId(trip.getDriverId())
                .latitude(latest != null ? latest.getLatitude() : null)
                .longitude(latest != null ? latest.getLongitude() : null)
                .speedKmh(round1(speedKmh))
                .headingDegrees(round1(heading))
                .totalDistanceKm(totalKm)
                .traveledDistanceKm(traveledKm)
                .remainingDistanceKm(remainingKm)
                .progressPercent(progress)
                .etaMinutes(etaMinutes)
                .deviationMeters(deviationMeters)
                .deviationStatus(resolveDeviationStatus(deviationMeters))
                .batteryPercentage(latest != null && latest.getBatteryPercentage() != null
                        ? latest.getBatteryPercentage().doubleValue()
                        : null)
                .co2SavedKg(co2SavedKg)
                .tripStatus(trip.getStatus())
                .dataSource(latest != null ? "LIVE_TELEMETRY_DB" : "TRIP_SCHEDULED")
                .lastTelemetryAt(latest != null ? latest.getTimestamp() : trip.getUpdatedAt())
                .distanceToDestinationMeters(distToDestMeters)
                .arrivalRadiusMeters(arrivalRadius)
                .arrivedAtDestination(arrived)
                .arrivalStatus(arrivalStatus)
                .arrivedAt(trip.getArrivedAt())
                .routeSource("NONE")
                .build());
    }

    private LiveFleetTelemetryResponse mapNativeTripRow(Object[] r) {
        if (r == null || r.length < 38) {
            return null;
        }
        UUID tripId = toUuid(r[0]);
        String tripCode = str(r[1]);
        String tripStatus = str(r[2]);
        double actualDistMeters = num(r[3], 0.0);
        UUID shipmentId = toUuid(r[4]);
        UUID vehicleId = toUuid(r[5]);
        UUID driverId = toUuid(r[6]);
        String shipmentCode = str(r[7]);
        String customerId = str(r[8]);
        String originName = str(r[9]);
        Double originLat = numObj(r[10]);
        Double originLon = numObj(r[11]);
        String destinationName = str(r[12]);
        Double destLat = numObj(r[13]);
        Double destLon = numObj(r[14]);
        double cargoTons = num(r[15], DEFAULT_CARGO_TONS);
        String vehicleCode = str(r[16]);
        String licensePlate = str(r[17]);
        String fuelType = str(r[18]);
        String euroStandard = str(r[19]);
        String driverName = str(r[20]);
        double routeDistMeters = num(r[21], 0.0);
        Double teLat = numObj(r[22]);
        Double teLon = numObj(r[23]);
        Double teSpeed = numObj(r[24]);
        Double teHeading = numObj(r[25]);
        Double teDeviation = numObj(r[26]);
        Double teBattery = numObj(r[27]);
        Instant teTs = toInstant(r[28]);
        String containerCode = str(r[29]);
        Double cTemp = numObj(r[30]);
        Double cLat = numObj(r[31]);
        Double cLon = numObj(r[32]);
        String cLocName = str(r[33]);
        Double cSpeed = numObj(r[34]);
        Double cProgress = numObj(r[35]);
        Integer cEta = r[36] instanceof Number n ? n.intValue() : null;
        Double cBattery = numObj(r[37]);
        Instant persistedArrivedAt = r.length > 38 ? toInstant(r[38]) : null;
        String persistedArrivalStatus = r.length > 39 ? str(r[39]) : null;
        String routeGeoJson = r.length > 40 ? str(r[40]) : null;
        List<List<Double>> routeWaypoints = routeWaypointDecoder.decode(routeGeoJson);

        Double curLat = teLat != null ? teLat : (cLat != null ? cLat : originLat);
        Double curLon = teLon != null ? teLon : (cLon != null ? cLon : originLon);
        String source = teLat != null
                ? "LIVE_TELEMETRY_DB"
                : (cLat != null ? "CONTAINER_IOT_DB" : "TRIP_ORIGIN");

        double totalKm = routeDistMeters > 0
                ? round2(routeDistMeters / 1000.0)
                : (originLat != null && originLon != null && destLat != null && destLon != null
                        ? round2(haversineKm(originLat, originLon, destLat, destLon) * ROAD_TORTUOSITY_FACTOR)
                        : 27.3);

        double speedKmh = teSpeed != null ? teSpeed : (cSpeed != null ? cSpeed : 0.0);
        double remainingKm;
        if ("COMPLETED".equalsIgnoreCase(tripStatus)) {
            remainingKm = 0.0;
        } else if (curLat != null && curLon != null && destLat != null && destLon != null) {
            remainingKm = round2(Math.min(totalKm, haversineKm(curLat, curLon, destLat, destLon) * 1.15));
        } else if (cProgress != null && cProgress > 0) {
            remainingKm = round2(Math.max(0.0, totalKm * (1.0 - cProgress / 100.0)));
        } else {
            remainingKm = round2(Math.max(0.0, totalKm - (actualDistMeters / 1000.0)));
        }

        double traveledKm = actualDistMeters > 0
                ? round2(actualDistMeters / 1000.0)
                : round2(Math.max(0.0, totalKm - remainingKm));

        int progress = "COMPLETED".equalsIgnoreCase(tripStatus)
                ? 100
                : (actualDistMeters <= 0 && cProgress != null && cProgress > 0
                        ? (int) Math.round(Math.min(100.0, Math.max(0.0, cProgress)))
                        : computeProgressPercent(traveledKm, totalKm));

        ArrivalEvaluation arrival = evaluateArrival(
                tripStatus, curLat, curLon, originLat, originLon, destLat, destLon,
                progress, persistedArrivedAt, persistedArrivalStatus);
        if (arrival.arrived()) {
            remainingKm = 0.0;
            progress = 100;
        }

        int etaMinutes = arrival.arrived()
                ? 0
                : ((cEta != null && teLat == null && cEta > 0)
                        ? cEta
                        : computeEtaMinutes(tripStatus, remainingKm, speedKmh));

        double heading = teHeading != null
                ? teHeading
                : (curLat != null && curLon != null && destLat != null && destLon != null
                        ? computeBearingDegrees(curLat, curLon, destLat, destLon)
                        : 0.0);

        double deviationMeters = teDeviation != null ? round2(teDeviation) : 0.0;
        double co2SavedKg = computeCo2SavedKg(traveledKm, cargoTons, euroStandard != null ? euroStandard : fuelType);

        return LiveFleetTelemetryResponse.builder()
                .tripId(tripId)
                .tripCode(tripCode)
                .shipmentId(shipmentId)
                .shipmentCode(shipmentCode)
                .customerId(customerId)
                .vehicleId(vehicleId)
                .vehicleCode(vehicleCode)
                .licensePlate(licensePlate)
                .vehicleType(fuelType)
                .fuelType(fuelType)
                .euroStandard(euroStandard)
                .driverId(driverId)
                .driverName(driverName)
                .containerCode(containerCode)
                .originName(originName)
                .originLat(originLat)
                .originLon(originLon)
                .destinationName(destinationName)
                .destinationLat(destLat)
                .destinationLon(destLon)
                .latitude(curLat)
                .longitude(curLon)
                .currentLocationName(cLocName)
                .speedKmh(round1(speedKmh))
                .headingDegrees(round1(heading))
                .totalDistanceKm(totalKm)
                .traveledDistanceKm(traveledKm)
                .remainingDistanceKm(remainingKm)
                .progressPercent(progress)
                .etaMinutes(etaMinutes)
                .deviationMeters(deviationMeters)
                .deviationStatus(resolveDeviationStatus(deviationMeters))
                .temperatureC(cTemp)
                .batteryPercentage(teBattery != null ? teBattery : cBattery)
                .co2SavedKg(co2SavedKg)
                .tripStatus(tripStatus)
                .dataSource(source)
                .lastTelemetryAt(teTs)
                .distanceToDestinationMeters(arrival.distanceToDestinationMeters())
                .arrivalRadiusMeters(arrival.arrivalRadiusMeters())
                .arrivedAtDestination(arrival.arrived())
                .arrivalStatus(arrival.arrivalStatus())
                .arrivedAt(arrival.arrivedAt())
                .routeWaypoints(routeWaypoints.isEmpty() ? null : routeWaypoints)
                .routeSource(routeWaypoints.isEmpty() ? "NONE" : "POSTGIS_ROUTE_VERSION")
                .build();
    }

    private LiveFleetTelemetryResponse mapActiveContainerRow(Object[] r) {
        if (r == null || r.length < 18) {
            return null;
        }
        UUID containerId = toUuid(r[0]);
        String containerCode = str(r[1]);
        String status = str(r[2]);
        UUID shipmentId = toUuid(r[3]);
        String shipmentCode = str(r[4]);
        UUID vehicleId = toUuid(r[5]);
        String plate = str(r[6]);
        String vehicleLabel = str(r[7]);
        UUID driverId = toUuid(r[8]);
        String driverName = str(r[9]);
        String originName = str(r[10]);
        String destName = str(r[11]);
        Double lat = numObj(r[12]);
        Double lon = numObj(r[13]);
        String locName = str(r[14]);
        double speedKmh = num(r[15], 0.0);
        double progressPct = num(r[16], 0.0);
        int etaMins = r[17] instanceof Number n ? Math.max(0, n.intValue()) : 0;
        Double tempC = r.length > 18 ? numObj(r[18]) : null;
        Double battery = r.length > 19 ? numObj(r[19]) : null;
        Instant updatedAt = r.length > 20 ? toInstant(r[20]) : null;
        Double originLat = r.length > 21 ? numObj(r[21]) : null;
        Double originLon = r.length > 22 ? numObj(r[22]) : null;
        Double destLat = r.length > 23 ? numObj(r[23]) : null;
        Double destLon = r.length > 24 ? numObj(r[24]) : null;
        UUID linkedTripId = r.length > 25 ? toUuid(r[25]) : null;
        Instant arrivedAt = r.length > 26 ? toInstant(r[26]) : null;
        String routeGeoJson = r.length > 27 ? str(r[27]) : null;
        List<List<Double>> routeWaypoints = routeWaypointDecoder.decode(routeGeoJson);

        double totalKm = (originLat != null && originLon != null && destLat != null && destLon != null)
                ? round2(haversineKm(originLat, originLon, destLat, destLon) * ROAD_TORTUOSITY_FACTOR)
                : 32.0;
        double traveledKm = round2(totalKm * (progressPct / 100.0));
        double remainingKm = round2(Math.max(0.0, totalKm - traveledKm));
        int roundedProgress = (int) Math.round(Math.min(100.0, Math.max(0.0, progressPct)));

        ArrivalEvaluation arrival = evaluateArrival(
                status, lat, lon, originLat, originLon, destLat, destLon,
                roundedProgress, arrivedAt, null);
        if (arrival.arrived()) {
            remainingKm = 0.0;
            roundedProgress = 100;
        }
        int computedEta = arrival.arrived()
                ? 0
                : (etaMins > 0 ? etaMins : computeEtaMinutes(status, remainingKm, speedKmh));
        double heading = (lat != null && lon != null && destLat != null && destLon != null)
                ? computeBearingDegrees(lat, lon, destLat, destLon)
                : 0.0;

        return LiveFleetTelemetryResponse.builder()
                .tripId(linkedTripId != null ? linkedTripId : containerId)
                .tripCode(containerCode)
                .shipmentId(shipmentId)
                .shipmentCode(shipmentCode)
                .vehicleId(vehicleId)
                .vehicleCode(containerCode)
                .licensePlate(plate)
                .vehicleType(vehicleLabel)
                .driverId(driverId)
                .driverName(driverName)
                .containerCode(containerCode)
                .originName(originName)
                .originLat(originLat)
                .originLon(originLon)
                .destinationName(destName)
                .destinationLat(destLat)
                .destinationLon(destLon)
                .latitude(lat)
                .longitude(lon)
                .currentLocationName(locName)
                .speedKmh(round1(speedKmh))
                .headingDegrees(round1(heading))
                .totalDistanceKm(totalKm)
                .traveledDistanceKm(traveledKm)
                .remainingDistanceKm(remainingKm)
                .progressPercent(roundedProgress)
                .etaMinutes(computedEta)
                .deviationMeters(0.0)
                .deviationStatus("ON_ROUTE")
                .temperatureC(tempC)
                .batteryPercentage(battery)
                .co2SavedKg(computeCo2SavedKg(traveledKm, DEFAULT_CARGO_TONS, vehicleLabel))
                .tripStatus(status)
                .dataSource("CONTAINER_IOT_DB")
                .lastTelemetryAt(updatedAt)
                .distanceToDestinationMeters(arrival.distanceToDestinationMeters())
                .arrivalRadiusMeters(arrival.arrivalRadiusMeters())
                .arrivedAtDestination(arrival.arrived())
                .arrivalStatus(arrival.arrivalStatus())
                .arrivedAt(arrival.arrivedAt())
                .routeWaypoints(routeWaypoints.isEmpty() ? null : routeWaypoints)
                .routeSource(routeWaypoints.isEmpty() ? "NONE" : "POSTGIS_ROUTE_VERSION")
                .build();
    }

    ArrivalEvaluation evaluateArrival(
            String tripStatus,
            Double curLat,
            Double curLon,
            Double originLat,
            Double originLon,
            Double destLat,
            Double destLon,
            Integer progressPct,
            Instant persistedArrivedAt,
            String persistedArrivalStatus) {
        double arrivalRadius = ccadroProperties.getArrival().getArrivalRadiusMeters();
        double approachingRadius = ccadroProperties.getArrival().getApproachingRadiusMeters();

        if ("COMPLETED".equalsIgnoreCase(tripStatus) || "DELIVERED".equalsIgnoreCase(tripStatus)) {
            Double dist = (curLat != null && curLon != null && destLat != null && destLon != null)
                    ? round1(haversineKm(curLat, curLon, destLat, destLon) * 1000.0)
                    : 0.0;
            return new ArrivalEvaluation(dist, arrivalRadius, true, "DELIVERED", persistedArrivedAt);
        }

        if (curLat != null && curLon != null && destLat != null && destLon != null) {
            double distMeters = round1(haversineKm(curLat, curLon, destLat, destLon) * 1000.0);
            if (distMeters <= arrivalRadius) {
                return new ArrivalEvaluation(distMeters, arrivalRadius, true, "ARRIVED_AT_DESTINATION", persistedArrivedAt);
            }
            if (distMeters <= approachingRadius) {
                return new ArrivalEvaluation(distMeters, arrivalRadius, false, "APPROACHING_DESTINATION", persistedArrivedAt);
            }
            if (originLat != null && originLon != null) {
                double distOriginMeters = haversineKm(curLat, curLon, originLat, originLon) * 1000.0;
                if (distOriginMeters <= arrivalRadius && (progressPct == null || progressPct < 5)) {
                    return new ArrivalEvaluation(distMeters, arrivalRadius, false, "AT_ORIGIN", persistedArrivedAt);
                }
            }
            return new ArrivalEvaluation(distMeters, arrivalRadius, false, "IN_TRANSIT", persistedArrivedAt);
        }

        if ("ARRIVED_AT_DESTINATION".equalsIgnoreCase(persistedArrivalStatus)) {
            return new ArrivalEvaluation(0.0, arrivalRadius, true, "ARRIVED_AT_DESTINATION", persistedArrivedAt);
        }
        if (progressPct != null && progressPct >= 100) {
            return new ArrivalEvaluation(0.0, arrivalRadius, true, "ARRIVED_AT_DESTINATION", persistedArrivedAt);
        }
        if (progressPct != null && progressPct >= 90) {
            return new ArrivalEvaluation(null, arrivalRadius, false, "APPROACHING_DESTINATION", persistedArrivedAt);
        }
        if (progressPct != null && progressPct <= 0) {
            return new ArrivalEvaluation(null, arrivalRadius, false, "AT_ORIGIN", persistedArrivedAt);
        }
        return new ArrivalEvaluation(null, arrivalRadius, false, "IN_TRANSIT", persistedArrivedAt);
    }

    record ArrivalEvaluation(
            Double distanceToDestinationMeters,
            Double arrivalRadiusMeters,
            boolean arrived,
            String arrivalStatus,
            Instant arrivedAt) {
    }

    int computeEtaMinutes(String status, double remainingKm, double speedKmh) {
        if ("COMPLETED".equalsIgnoreCase(status) || remainingKm <= 0.1) {
            return 0;
        }
        double effectiveSpeed = speedKmh >= 5.0 ? speedKmh : DEFAULT_STOP_FALLBACK_KMH;
        return Math.max(1, (int) Math.round((remainingKm / effectiveSpeed) * 60.0));
    }

    int computeProgressPercent(double traveledKm, double totalKm) {
        if (totalKm <= 0.0) {
            return 0;
        }
        return (int) Math.round(Math.min(100.0, Math.max(0.0, (traveledKm / totalKm) * 100.0)));
    }

    String resolveDeviationStatus(double deviationMeters) {
        double red = ccadroProperties.getDeviation().getRedMeters();
        double yellow = ccadroProperties.getDeviation().getYellowMeters();
        if (deviationMeters >= red) {
            return "RED_DEVIATION";
        }
        if (deviationMeters >= yellow) {
            return "YELLOW_WARNING";
        }
        return "ON_ROUTE";
    }

    double computeCo2SavedKg(double traveledKm, double cargoTons, String spec) {
        if (traveledKm <= 0.0) {
            return 0.0;
        }
        double baseFactor = ccadroProperties.getCarbon().getDefaultTonneKmFactor() > 0
                ? ccadroProperties.getCarbon().getDefaultTonneKmFactor()
                : 0.080;
        String upper = spec != null ? spec.toUpperCase(Locale.ROOT) : "";
        double activeFactor = upper.contains("EV") || upper.contains("ELECTRIC")
                ? 0.048
                : baseFactor;
        double delta = Math.max(0.0, DIESEL_BASELINE_TONNE_KM_KG - activeFactor);
        return round1(traveledKm * Math.max(1.0, cargoTons) * delta);
    }

    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    }

    static double computeBearingDegrees(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double dLon = Math.toRadians(lon2 - lon1);
        double y = Math.sin(dLon) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2)
                - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
        double theta = Math.atan2(y, x);
        return (Math.toDegrees(theta) + 360.0) % 360.0;
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static String str(Object o) {
        return o != null ? o.toString() : null;
    }

    private static UUID toUuid(Object o) {
        if (o instanceof UUID u) return u;
        if (o instanceof String s && !s.isBlank()) return UUID.fromString(s);
        return null;
    }

    private static double num(Object o, double fallback) {
        return o instanceof Number n ? n.doubleValue() : fallback;
    }

    private static Double numObj(Object o) {
        return o instanceof Number n ? n.doubleValue() : null;
    }

    private static Instant toInstant(Object o) {
        if (o instanceof Instant inst) return inst;
        if (o instanceof Timestamp ts) return ts.toInstant();
        if (o instanceof java.util.Date d) return d.toInstant();
        return null;
    }
}

