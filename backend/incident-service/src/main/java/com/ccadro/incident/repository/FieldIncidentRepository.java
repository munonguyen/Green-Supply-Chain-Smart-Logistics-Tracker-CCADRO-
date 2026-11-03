package com.ccadro.incident.repository;

import com.ccadro.incident.entity.FieldIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FieldIncidentRepository extends JpaRepository<FieldIncident, UUID> {
    Optional<FieldIncident> findByIncidentCode(String incidentCode);
    List<FieldIncident> findByTripId(UUID tripId);
    List<FieldIncident> findByDriverId(UUID driverId);
}

