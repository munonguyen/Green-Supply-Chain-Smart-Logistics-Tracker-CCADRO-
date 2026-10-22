package com.ccadro.tracking.infrastructure;

import com.ccadro.tracking.domain.RerouteProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RerouteProposalRepository extends JpaRepository<RerouteProposal, UUID> {
    List<RerouteProposal> findByTripId(UUID tripId);
}
