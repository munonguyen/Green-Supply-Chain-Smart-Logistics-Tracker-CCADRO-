package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.HubShipperPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HubShipperPolicyRepository extends JpaRepository<HubShipperPolicy, UUID> {
    Optional<HubShipperPolicy> findByHubCode(String hubCode);
}

