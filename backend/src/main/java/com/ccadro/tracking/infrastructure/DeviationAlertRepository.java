package com.ccadro.tracking.infrastructure;

import com.ccadro.tracking.domain.DeviationAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeviationAlertRepository extends JpaRepository<DeviationAlert, UUID> {
    List<DeviationAlert> findByTripId(UUID tripId);
}
