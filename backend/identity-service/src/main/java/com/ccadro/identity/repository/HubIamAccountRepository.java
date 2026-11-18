package com.ccadro.identity.repository;

import com.ccadro.identity.entity.HubIamAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HubIamAccountRepository extends JpaRepository<HubIamAccount, UUID> {
    Optional<HubIamAccount> findByUsernameIgnoreCase(String username);
    List<HubIamAccount> findByAssignedHubCodeOrderByAccountCodeAsc(String assignedHubCode);
    List<HubIamAccount> findAllByOrderByAccountCodeAsc();
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
}

