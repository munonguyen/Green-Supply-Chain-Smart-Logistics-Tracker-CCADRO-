package com.ccadro.tracking.infrastructure;

import com.ccadro.tracking.domain.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {
    Optional<Trip> findByTripCode(String tripCode);
    Optional<Trip> findByShipmentId(UUID shipmentId);
}
