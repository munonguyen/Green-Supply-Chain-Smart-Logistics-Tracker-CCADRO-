package com.ccadro.tracking.service;

import com.ccadro.tracking.entity.Trip;
import com.ccadro.tracking.exception.AppException;
import com.ccadro.tracking.exception.ErrorCode;
import com.ccadro.tracking.exception.ResourceNotFoundException;
import com.ccadro.tracking.repository.TripRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Quản trị vòng đời chuyến xe vận chuyển (Trip Lifecycle Service - UC07, UC08, UC11):
 * - Bắt đầu chuyến đi (EN_ROUTE).
 * - Hoàn thành chuyến đi (COMPLETED).
 * - Tra cứu chuyến đi và thông tin phương tiện/tài xế.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripService {

    TripRepository tripRepository;

    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    public Trip getTripById(UUID tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
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
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip completeTrip(UUID tripId) {
        Trip trip = getTripById(tripId);
        trip.setStatus("COMPLETED");
        trip.setEndTime(Instant.now());
        trip.setUpdatedAt(Instant.now());
        return tripRepository.save(trip);
    }
}

