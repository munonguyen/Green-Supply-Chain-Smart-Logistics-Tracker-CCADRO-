package com.ccadro.tracking.repository;

import com.ccadro.tracking.entity.DeviationAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeviationAlertRepository extends JpaRepository<DeviationAlert, UUID> {
    List<DeviationAlert> findByTripId(UUID tripId);
    List<DeviationAlert> findByTripIdAndStatus(UUID tripId, String status);
}
