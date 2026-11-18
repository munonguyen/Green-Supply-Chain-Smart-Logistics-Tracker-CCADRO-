package com.ccadro.identity.repository;

import com.ccadro.identity.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BranchRepository extends JpaRepository<Branch, UUID> {
    boolean existsByBranchCodeIgnoreCase(String branchCode);

    Optional<Branch> findByBranchCodeIgnoreCase(String branchCode);
}
