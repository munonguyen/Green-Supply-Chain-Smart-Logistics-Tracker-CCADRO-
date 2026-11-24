package com.ccadro.tracking.service;

import com.ccadro.tracking.configuration.CcadroProperties;
import com.ccadro.tracking.controller.dto.IngestTelemetryRequest;
import com.ccadro.tracking.entity.TelemetryEvent;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.mapper.TrackingMapper;
import com.ccadro.tracking.repository.TelemetryEventRepository;
import com.ccadro.tracking.repository.TripRepository;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Thu nhận và chuẩn hóa dữ liệu viễn thông GPS Telemetry (UC07, UC08 / SOP-10):
 * - GPS Quality Gate: Loại bỏ điểm nhảy vận tốc ảo (> maxValidSpeedKmh).
 * - Tự động cộng dồn cự ly Haversine thực tế vào Trip.actualDistanceMeters.
 * - Tính toán khoảng cách lệch hành lang (computeDeviationDistance) và đẩy SSE Real-time.
 */
@Service
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class TelemetryIngestionService {

    TelemetryEventRepository telemetryEventRepository;
    TripRepository tripRepository;
    TrackingMapper trackingMapper;
    CcadroProperties ccadroProperties;
    DeviationDetectionService deviationDetectionService;
    RerouteProposalService rerouteProposalService;
    FleetTelemetryService fleetTelemetryService;
    FleetTelemetryStreamService fleetTelemetryStreamService;

    public TelemetryIngestionService(
            TelemetryEventRepository telemetryEventRepository,
            TripRepository tripRepository,
            TrackingMapper trackingMapper,
            CcadroProperties ccadroProperties,
            DeviationDetectionService deviationDetectionService,
            RerouteProposalService rerouteProposalService) {
        this(
                telemetryEventRepository,
                tripRepository,
                trackingMapper,
                ccadroProperties,
                deviationDetectionService,
                rerouteProposalService,
                null,
                null
        );
    }

    @Autowired
    public TelemetryIngestionService(
            TelemetryEventRepository telemetryEventRepository,
            TripRepository tripRepository,
            TrackingMapper trackingMapper,
            CcadroProperties ccadroProperties,
            DeviationDetectionService deviationDetectionService,
            RerouteProposalService rerouteProposalService,
            FleetTelemetryService fleetTelemetryService,
            FleetTelemetryStreamService fleetTelemetryStreamService) {
        this.telemetryEventRepository = telemetryEventRepository;
        this.tripRepository = tripRepository;
        this.trackingMapper = trackingMapper;
        this.ccadroProperties = ccadroProperties;
        this.deviationDetectionService = deviationDetectionService;
        this.rerouteProposalService = rerouteProposalService;
        this.fleetTelemetryService = fleetTelemetryService;
        this.fleetTelemetryStreamService = fleetTelemetryStreamService;
    }

    public List<TelemetryEvent> getTelemetryHistory(UUID tripId) {
        return telemetryEventRepository.findByTripIdOrderByTimestampAsc(tripId);
    }

    @Transactional
    public TelemetryEvent ingestTelemetry(IngestTelemetryRequest req) {
        if (req.getExternalEventId()!=null) {
            var trip=tripRepository.findForDeviceTelemetry(req.getTripId())
                .orElseThrow(() -> new com.ccadro.tracking.exception.AppException(com.ccadro.tracking.exception.ErrorCode.TRIP_NOT_FOUND));
            var previous=telemetryEventRepository.findByExternalEventId(req.getExternalEventId());
            if(previous.isPresent()) {
                if(!req.getTripId().equals(previous.get().getTripId())) {
                    throw new com.ccadro.tracking.exception.AppException(com.ccadro.tracking.exception.ErrorCode.INVALID_REQUEST_ARGUMENT,
                        "Mã gói tin đã thuộc chuyến khác");
                }
                return previous.get();
            }
            if(Boolean.TRUE.equals(trip.getIsDeleted()) || !java.util.List.of("EN_ROUTE","DELAYED").contains(trip.getStatus())
                || !trip.getVehicleId().equals(req.getVehicleId())) {
                throw new com.ccadro.tracking.exception.AppException(com.ccadro.tracking.exception.ErrorCode.INVALID_REQUEST_ARGUMENT,
                    "Chuyến không còn nhận gói tin thiết bị");
            }
        }
        TelemetryEvent event = trackingMapper.toEntity(req);

        // 1. SOP-10: GPS Quality Gate (chống nhiễu nhảy tọa độ / tốc độ âm hoặc vượt ngưỡng maxValidSpeedKmh)
        double maxSpeed = ccadroProperties.getDeviation().getMaxValidSpeedKmh();
        boolean coordsValid = req.getLatitude() == null || req.getLongitude() == null
                || (req.getLatitude() >= -90.0 && req.getLatitude() <= 90.0
                && req.getLongitude() >= -180.0 && req.getLongitude() <= 180.0);
        boolean speedValid = req.getSpeedKmh() == null
                || (req.getSpeedKmh().doubleValue() >= 0.0 && req.getSpeedKmh().doubleValue() <= maxSpeed);
        boolean qualityPassed = coordsValid && speedValid;
        event.setQualityPassed(qualityPassed);

        // 2. Cộng dồn quãng đường thực tế & cập nhật trạng thái tới điểm giao hàng cho Trip
        if (qualityPassed && req.getLatitude() != null && req.getLongitude() != null) {
            updateTripCumulativeDistance(req.getTripId(), req.getLatitude(), req.getLongitude());
            updateTripArrivalState(req.getTripId(), req.getLatitude(), req.getLongitude(), req.getSpeedKmh());
        }

        double yellowThreshold = ccadroProperties.getDeviation().getYellowMeters();
        double redThreshold = ccadroProperties.getDeviation().getRedMeters();

        // 3. Tính khoảng cách lệch khỏi lộ trình
        BigDecimal distanceMeters = computeDeviationDistance(req, redThreshold);
        event.setDistanceFromRouteMeters(distanceMeters);

        TelemetryEvent savedEvent = telemetryEventRepository.save(event);

        if (!qualityPassed) {
            log.warn("Điểm GPS của Trip {} không đạt Quality Gate (speed = {} km/h), bỏ qua đánh giá lệch tuyến",
                    req.getTripId(), req.getSpeedKmh());
            return savedEvent;
        }

        // Hỗ trợ kịch bản mô phỏng smoke test (deviation_simulated) + State Machine 3 điểm liên tiếp (BRULE-10)
        if (req.getRawPayload() != null && req.getRawPayload().contains("deviation_simulated")) {
            deviationDetectionService.triggerOrUpdateAlert(req.getTripId(), savedEvent, "RED");
            rerouteProposalService.evaluateDynamicRerouteForTrip(req.getTripId(), "DEVIATION_RED");
        } else {
            deviationDetectionService.evaluateDeviationStateMachine(req.getTripId(), savedEvent, yellowThreshold, redThreshold);
        }

        if (fleetTelemetryService != null && fleetTelemetryStreamService != null && req.getTripId() != null) {
            fleetTelemetryService.getLiveSnapshotForTrip(req.getTripId())
                    .ifPresent(fleetTelemetryStreamService::broadcastUpdate);
        }

        return savedEvent;
    }

    private void updateTripCumulativeDistance(UUID tripId, Double lat, Double lon) {
        Optional<Trip> tripOpt = tripRepository.findById(tripId);
        if (tripOpt.isEmpty()) {
            return;
        }
        Trip trip = tripOpt.get();
        if (Boolean.TRUE.equals(trip.getIsDeleted()) || "COMPLETED".equalsIgnoreCase(trip.getStatus())) {
            return;
        }

        Optional<TelemetryEvent> lastPointOpt = telemetryEventRepository
                .findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(tripId);
        if (lastPointOpt.isPresent()) {
            TelemetryEvent prev = lastPointOpt.get();
            if (prev.getLatitude() != null && prev.getLongitude() != null) {
                double deltaKm = calculateHaversineKm(
                        prev.getLatitude(), prev.getLongitude(),
                        lat, lon);
                BigDecimal deltaMeters = BigDecimal.valueOf(deltaKm * 1000.0).setScale(2, RoundingMode.HALF_UP);

                BigDecimal currentMeters = trip.getActualDistanceMeters() != null
                        ? trip.getActualDistanceMeters()
                        : BigDecimal.ZERO;
                trip.setActualDistanceMeters(currentMeters.add(deltaMeters));
                trip.setUpdatedAt(Instant.now());
                tripRepository.save(trip);
            }
        }
    }

    private void updateTripArrivalState(UUID tripId, Double lat, Double lon, BigDecimal speedKmh) {
        if (tripId == null || lat == null || lon == null) {
            return;
        }
        Optional<Trip> tripOpt = tripRepository.findById(tripId);
        if (tripOpt.isEmpty()) {
            return;
        }
        Trip trip = tripOpt.get();
        if (Boolean.TRUE.equals(trip.getIsDeleted()) || "COMPLETED".equalsIgnoreCase(trip.getStatus())) {
            return;
        }

        boolean changed = false;
        if ("SCHEDULED".equalsIgnoreCase(trip.getStatus())
                && speedKmh != null && speedKmh.doubleValue() > 2.0) {
            trip.setStatus("EN_ROUTE");
            if (trip.getStartTime() == null) {
                trip.setStartTime(Instant.now());
            }
            changed = true;
        }

        try {
            List<Object[]> coordsRows = tripRepository.findDestinationCoordinatesByTripId(tripId);
            if (coordsRows != null && !coordsRows.isEmpty()) {
                Object[] row = coordsRows.get(0);
                Double destLat = row.length > 0 && row[0] instanceof Number n ? n.doubleValue() : null;
                Double destLon = row.length > 1 && row[1] instanceof Number n ? n.doubleValue() : null;
                if (destLat != null && destLon != null) {
                    double distMeters = calculateHaversineKm(lat, lon, destLat, destLon) * 1000.0;
                    double arrivalRadius = ccadroProperties.getArrival().getArrivalRadiusMeters();
                    double approachingRadius = ccadroProperties.getArrival().getApproachingRadiusMeters();

                    trip.setDistanceToDestinationMeters(
                            BigDecimal.valueOf(distMeters).setScale(2, RoundingMode.HALF_UP));
                    if (distMeters <= arrivalRadius) {
                        trip.setArrivalStatus("ARRIVED_AT_DESTINATION");
                        if (trip.getArrivedAt() == null) {
                            trip.setArrivedAt(Instant.now());
                        }
                    } else if (distMeters <= approachingRadius) {
                        trip.setArrivalStatus("APPROACHING_DESTINATION");
                    } else {
                        trip.setArrivalStatus("IN_TRANSIT");
                    }
                    changed = true;
                }
            }
        } catch (Exception ex) {
            log.debug("Destination arrival geofence check skipped for trip {}: {}", tripId, ex.getMessage());
        }

        if (changed) {
            trip.setUpdatedAt(Instant.now());
            tripRepository.save(trip);
        }
    }

    private BigDecimal computeDeviationDistance(IngestTelemetryRequest req, double redThreshold) {
        if (req.getRawPayload() != null && req.getRawPayload().contains("deviation_simulated")) {
            return BigDecimal.valueOf(redThreshold + 50.0).setScale(2, RoundingMode.HALF_UP);
        }
        if (req.getTripId() != null && req.getLatitude() != null && req.getLongitude() != null) {
            try {
                Optional<Double> spatialMeters = tripRepository.findDistanceToActiveRouteMeters(
                        req.getTripId(),
                        req.getLatitude(),
                        req.getLongitude()
                );
                if (spatialMeters != null && spatialMeters.isPresent() && spatialMeters.get() != null) {
                    return BigDecimal.valueOf(spatialMeters.get()).setScale(2, RoundingMode.HALF_UP);
                }
            } catch (Exception ex) {
                log.debug("PostGIS deviation query unavailable for trip {}: {}", req.getTripId(), ex.getMessage());
            }
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private double calculateHaversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
