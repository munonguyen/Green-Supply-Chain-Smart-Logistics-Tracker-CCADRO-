package com.ccadro.asset.repository;

import com.ccadro.asset.entity.PreTripInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PreTripInspectionRepository extends JpaRepository<PreTripInspection, UUID> {
    Optional<PreTripInspection> findFirstByVehicleIdOrderByInspectionTimeDesc(UUID vehicleId);
}
