package com.ccadro.tracking.repository;

import com.ccadro.tracking.entity.RerouteProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RerouteProposalRepository extends JpaRepository<RerouteProposal, UUID> {
    List<RerouteProposal> findByTripId(UUID tripId);
    Optional<RerouteProposal> findFirstByTripIdOrderByCreatedAtDesc(UUID tripId);
}
