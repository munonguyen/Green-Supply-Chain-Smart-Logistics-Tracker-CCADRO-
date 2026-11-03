package com.ccadro.incident.repository;

import com.ccadro.incident.entity.ExceptionResolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExceptionResolutionRepository extends JpaRepository<ExceptionResolution, UUID> {
    Optional<ExceptionResolution> findByIncidentId(UUID incidentId);
}

