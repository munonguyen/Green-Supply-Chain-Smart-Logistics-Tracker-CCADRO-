package com.ccadro.tracking.service;

import com.ccadro.tracking.dto.request.CreateTripRequest;
import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import com.ccadro.tracking.exception.ResourceNotFoundException;
import com.ccadro.tracking.repository.TripRepository;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Quản trị vòng đời chuyến xe vận chuyển (Trip Lifecycle Service - UC06, UC07, UC08, UC11):
 * - Khởi tạo chuyến xe từ Saga điều phối (SCHEDULED).
 * - Bắt đầu chuyến đi (EN_ROUTE).
 * - Hoàn thành chuyến đi (COMPLETED).
 */
@Service
@Transactional(readOnly = true)
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripService {

    TripRepository tripRepository;
    FleetTelemetryService fleetTelemetryService;
    FleetTelemetryStreamService fleetTelemetryStreamService;

    public TripService(TripRepository tripRepository) {
        this(tripRepository, null, null);
    }

    @Autowired
    public TripService(
            TripRepository tripRepository,
            FleetTelemetryService fleetTelemetryService,
            FleetTelemetryStreamService fleetTelemetryStreamService) {
        this.tripRepository = tripRepository;
        this.fleetTelemetryService = fleetTelemetryService;
        this.fleetTelemetryStreamService = fleetTelemetryStreamService;
    }

    public List<Trip> getAllTrips() {
        return getAllTrips(null, false);
    }

    public List<Trip> getAllTrips(String q, boolean includeDeleted) {
        return getAllTrips(q, includeDeleted, null);
    }

    public List<Trip> getAllTrips(String q, boolean includeDeleted, UUID driverId) {
        List<Trip> source = driverId != null ? tripRepository.findByDriverId(driverId) : tripRepository.findAll();
        List<Trip> items = source.stream()
                .filter(trip -> includeDeleted || !Boolean.TRUE.equals(trip.getIsDeleted()))
                .toList();
        return ElasticSearchSupport.filterAndRank(items, q, trip -> List.of(
                new ElasticSearchSupport.WeightedField(trip.getTripCode(), 4.0),
                new ElasticSearchSupport.WeightedField(trip.getStatus(), 2.5),
                new ElasticSearchSupport.WeightedField(trip.getShipmentId() != null ? trip.getShipmentId().toString() : null, 2.0),
                new ElasticSearchSupport.WeightedField(trip.getVehicleId() != null ? trip.getVehicleId().toString() : null, 1.5),
                new ElasticSearchSupport.WeightedField(trip.getDriverId() != null ? trip.getDriverId().toString() : null, 1.5),
                new ElasticSearchSupport.WeightedField(trip.getDeletedBy(), 1.0)
        ));
    }

    public Optional<Trip> findTripById(UUID tripId) {
        return tripId == null ? Optional.empty() : tripRepository.findById(tripId);
    }

    @Transactional
    public Trip softDeleteTrip(UUID tripId, String deletedBy) {
        Trip trip = getTripById(tripId);
        trip.setIsDeleted(true);
        trip.setDeletedAt(Instant.now());
        trip.setDeletedBy(deletedBy != null && !deletedBy.isBlank() ? deletedBy.trim() : "system");
        trip.setUpdatedAt(Instant.now());
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip restoreTrip(UUID tripId) {
        Trip trip = getTripById(tripId);
        trip.setIsDeleted(false);
        trip.setDeletedAt(null);
        trip.setDeletedBy(null);
        trip.setUpdatedAt(Instant.now());
        return tripRepository.save(trip);
    }

    public Trip getTripById(UUID tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
    }

    @Transactional
    public Trip createOrGetTrip(CreateTripRequest request) {
        Optional<Trip> existing = tripRepository.findByShipmentId(request.getShipmentId());
        if (existing.isPresent()) {
            Trip current = existing.get();
            if (current.getActiveRouteVersionId() == null && request.getActiveRouteVersionId() != null) {
                current.setActiveRouteVersionId(request.getActiveRouteVersionId());
                current.setUpdatedAt(Instant.now());
                return tripRepository.save(current);
            }
            return current;
        }

        Trip trip = new Trip();
        trip.setTripCode(TripCodeGenerator.generate(request.getCompanyCode()));
        trip.setShipmentId(request.getShipmentId());
        trip.setVehicleId(request.getVehicleId());
        trip.setDriverId(request.getDriverId());
        trip.setActiveRouteVersionId(request.getActiveRouteVersionId());
        trip.setStatus("SCHEDULED");
        trip.setActualDistanceMeters(BigDecimal.ZERO);
        trip.setCreatedAt(Instant.now());
        trip.setUpdatedAt(Instant.now());
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip startTrip(UUID tripId) {
        Trip trip = getTripById(tripId);
        if ("COMPLETED".equalsIgnoreCase(trip.getStatus())) {
            throw new AppException(ErrorCode.TRIP_ALREADY_COMPLETED);
        }
        trip.setStatus("EN_ROUTE");
        if (trip.getStartTime() == null) {
            trip.setStartTime(Instant.now());
        }
        trip.setUpdatedAt(Instant.now());
        Trip saved = tripRepository.save(trip);
        broadcastLiveState(saved.getId());
        return saved;
    }

    @Transactional
    public Trip completeTrip(UUID tripId) {
        Trip trip = getTripById(tripId);
        Instant now = Instant.now();
        trip.setStatus("COMPLETED");
        trip.setArrivalStatus("DELIVERED");
        if (trip.getArrivedAt() == null) {
            trip.setArrivedAt(now);
        }
        trip.setDistanceToDestinationMeters(BigDecimal.ZERO);
        trip.setEndTime(now);
        trip.setUpdatedAt(now);
        Trip saved = tripRepository.save(trip);
        broadcastLiveState(saved.getId());
        return saved;
    }

    private void broadcastLiveState(UUID tripId) {
        if (fleetTelemetryService != null && fleetTelemetryStreamService != null && tripId != null) {
            fleetTelemetryService.getLiveSnapshotForTrip(tripId)
                    .ifPresent(fleetTelemetryStreamService::broadcastUpdate);
        }
    }
}
