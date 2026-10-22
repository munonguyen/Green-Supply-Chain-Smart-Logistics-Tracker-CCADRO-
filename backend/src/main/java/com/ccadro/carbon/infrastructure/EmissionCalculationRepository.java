package com.ccadro.carbon.infrastructure;

import com.ccadro.carbon.domain.EmissionCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmissionCalculationRepository extends JpaRepository<EmissionCalculation, UUID> {
    List<EmissionCalculation> findByTripId(UUID tripId);
}
