package com.ccadro.asset.repository;

import com.ccadro.asset.entity.LocalDistributionHub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LocalDistributionHubRepository extends JpaRepository<LocalDistributionHub, UUID> {
    List<LocalDistributionHub> findAllByOrderByHubCodeAsc();
    Optional<LocalDistributionHub> findByHubCode(String hubCode);
}

