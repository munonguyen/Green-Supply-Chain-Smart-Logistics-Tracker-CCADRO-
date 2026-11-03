package com.ccadro.shipment.repository;

import com.ccadro.shipment.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {
    Optional<Shipment> findByShipmentCode(String shipmentCode);
    List<Shipment> findByCustomerId(String customerId);
    List<Shipment> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
