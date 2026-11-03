package com.ccadro.shipment.repository;

import com.ccadro.shipment.entity.SagaStateLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SagaStateLogRepository extends JpaRepository<SagaStateLog, UUID> {
    List<SagaStateLog> findByShipmentIdOrderByCreatedAtDesc(UUID shipmentId);
    Optional<SagaStateLog> findFirstByShipmentIdOrderByCreatedAtDesc(UUID shipmentId);
}

