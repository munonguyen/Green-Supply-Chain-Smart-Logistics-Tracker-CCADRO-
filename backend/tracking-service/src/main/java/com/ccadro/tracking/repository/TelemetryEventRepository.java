package com.ccadro.tracking.repository;

import com.ccadro.tracking.entity.TelemetryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TelemetryEventRepository extends JpaRepository<TelemetryEvent, UUID> {
    List<TelemetryEvent> findByTripIdOrderByTimestampAsc(UUID tripId);
    List<TelemetryEvent> findTop3ByTripIdAndQualityPassedTrueOrderByTimestampDesc(UUID tripId);
    Optional<TelemetryEvent> findFirstByTripIdAndQualityPassedTrueOrderByTimestampDesc(UUID tripId);
}
