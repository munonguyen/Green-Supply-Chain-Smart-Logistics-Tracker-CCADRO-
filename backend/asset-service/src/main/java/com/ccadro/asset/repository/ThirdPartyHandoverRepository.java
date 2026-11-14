package com.ccadro.asset.repository;

import com.ccadro.asset.entity.ThirdPartyHandover;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ThirdPartyHandoverRepository extends JpaRepository<ThirdPartyHandover, UUID> {
    Optional<ThirdPartyHandover> findByContainerCode(String containerCode);

    List<ThirdPartyHandover> findAllByOrderByUpdatedAtDesc();
}

