package com.ccadro.identity.repository;

import com.ccadro.identity.entity.HubAuthAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HubAuthAuditLogRepository extends JpaRepository<HubAuthAuditLog, UUID> {
    List<HubAuthAuditLog> findTop50ByOrderByCreatedAtDesc();
    List<HubAuthAuditLog> findTop50ByHubCodeOrderByCreatedAtDesc(String hubCode);
}

