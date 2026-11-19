package com.ccadro.identity.dto.response;

import java.time.Instant;
import java.util.UUID;

/** Public account fields only; credentials are never part of this response type. */
public record HubIamAccountResponse(
        UUID id,
        String accountCode,
        UUID userId,
        String username,
        String passwordAlgo,
        String fullName,
        String email,
        String phone,
        String functionalRole,
        String assignedHubCode,
        String assignedShipperCode,
        String scopeSummary,
        boolean canIngestManifest,
        boolean canAssignCodeRange,
        boolean canSubmitPhotoPod,
        boolean canManageAccounts,
        boolean readOnlyAudit,
        int maxSessionMinutes,
        int failedLoginAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        String lastLoginIp,
        String status,
        String createdBy,
        Boolean isDeleted,
        Instant deletedAt,
        String deletedBy,
        Instant createdAt,
        Instant updatedAt) {
}
