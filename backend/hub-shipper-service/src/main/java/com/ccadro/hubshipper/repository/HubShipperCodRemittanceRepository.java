package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.HubShipperCodRemittance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HubShipperCodRemittanceRepository extends JpaRepository<HubShipperCodRemittance, UUID> {
    List<HubShipperCodRemittance> findByHubCodeOrderByRemittedAtDesc(String hubCode);

    List<HubShipperCodRemittance> findByShipperCodeOrderByRemittedAtDesc(String shipperCode);
}

