package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.EmissionCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmissionCalculationRepository extends JpaRepository<EmissionCalculation, UUID> {
    List<EmissionCalculation> findByTripId(UUID tripId);
}
