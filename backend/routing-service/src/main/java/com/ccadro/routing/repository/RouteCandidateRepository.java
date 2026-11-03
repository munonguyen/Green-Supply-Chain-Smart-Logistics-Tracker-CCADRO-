package com.ccadro.routing.repository;

import com.ccadro.routing.entity.RouteCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RouteCandidateRepository extends JpaRepository<RouteCandidate, UUID> {
    List<RouteCandidate> findByShipmentId(UUID shipmentId);
}
