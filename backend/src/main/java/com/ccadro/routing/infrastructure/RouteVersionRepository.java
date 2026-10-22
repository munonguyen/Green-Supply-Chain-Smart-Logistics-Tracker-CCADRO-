package com.ccadro.routing.infrastructure;

import com.ccadro.routing.domain.RouteVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RouteVersionRepository extends JpaRepository<RouteVersion, UUID> {
    List<RouteVersion> findByShipmentIdOrderByVersionNumberDesc(UUID shipmentId);
    Optional<RouteVersion> findByShipmentIdAndIsActiveTrue(UUID shipmentId);
}
