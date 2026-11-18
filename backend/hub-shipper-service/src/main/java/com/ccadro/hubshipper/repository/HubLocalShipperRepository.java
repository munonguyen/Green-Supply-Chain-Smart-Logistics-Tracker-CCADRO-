package com.ccadro.hubshipper.repository;

import com.ccadro.hubshipper.entity.HubLocalShipper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HubLocalShipperRepository extends JpaRepository<HubLocalShipper, UUID> {
    List<HubLocalShipper> findByHubCodeOrderByShipperCodeAsc(String hubCode);
    Optional<HubLocalShipper> findByShipperCode(String shipperCode);
    Optional<HubLocalShipper> findFirstByAccountUsernameIgnoreCase(String accountUsername);
}

