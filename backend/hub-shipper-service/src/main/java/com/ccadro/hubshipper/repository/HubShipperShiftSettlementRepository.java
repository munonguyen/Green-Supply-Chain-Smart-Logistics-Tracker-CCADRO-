package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.HubShipperShiftSettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HubShipperShiftSettlementRepository extends JpaRepository<HubShipperShiftSettlement, UUID> {
    List<HubShipperShiftSettlement> findByHubCodeOrderBySettledAtDesc(String hubCode);

    List<HubShipperShiftSettlement> findByShipperCodeOrderBySettledAtDesc(String shipperCode);

    Optional<HubShipperShiftSettlement> findFirstByShipperCodeAndShiftDateOrderBySettledAtDesc(
            String shipperCode, String shiftDate);
}

