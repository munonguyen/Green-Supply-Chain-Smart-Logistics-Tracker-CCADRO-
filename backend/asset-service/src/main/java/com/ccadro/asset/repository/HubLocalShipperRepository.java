package com.ccadro.asset.repository;

import com.ccadro.asset.entity.HubLocalShipper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HubLocalShipperRepository extends JpaRepository<HubLocalShipper, UUID> {
    List<HubLocalShipper> findByHubCodeOrderByShipperCodeAsc(String hubCode);
    List<HubLocalShipper> findAllByOrderByHubCodeAscShipperCodeAsc();
    Optional<HubLocalShipper> findByShipperCode(String shipperCode);
}

