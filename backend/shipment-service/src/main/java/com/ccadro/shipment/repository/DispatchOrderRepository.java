package com.ccadro.shipment.repository;

import com.ccadro.shipment.entity.DispatchOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DispatchOrderRepository extends JpaRepository<DispatchOrder, UUID> {
    Optional<DispatchOrder> findByDispatchCode(String dispatchCode);
    Optional<DispatchOrder> findByShipmentId(UUID shipmentId);
    boolean existsByShipmentId(UUID shipmentId);
    boolean existsByShipmentIdAndStatusNotIn(UUID shipmentId, java.util.Collection<String> statuses);
    boolean existsByDispatchCode(String dispatchCode);
}

