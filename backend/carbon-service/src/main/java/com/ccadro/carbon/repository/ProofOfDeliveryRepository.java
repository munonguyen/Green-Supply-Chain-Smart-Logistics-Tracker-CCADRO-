package com.ccadro.carbon.repository;

import com.ccadro.carbon.entity.ProofOfDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProofOfDeliveryRepository extends JpaRepository<ProofOfDelivery, UUID> {
    Optional<ProofOfDelivery> findByTripId(UUID tripId);
    Optional<ProofOfDelivery> findByShipmentId(UUID shipmentId);
}

