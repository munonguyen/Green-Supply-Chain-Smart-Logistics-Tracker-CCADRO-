package com.ccadro.routing.repository;

import com.ccadro.routing.entity.RouteDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RouteDecisionRepository extends JpaRepository<RouteDecision, UUID> {
    List<RouteDecision> findByShipmentId(UUID shipmentId);
}
