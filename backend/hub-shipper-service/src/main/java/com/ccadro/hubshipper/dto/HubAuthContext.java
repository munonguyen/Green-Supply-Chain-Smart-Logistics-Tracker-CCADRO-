package com.ccadro.hubshipper.dto;

import lombok.Builder;

@Builder
public record HubAuthContext(
        String username,
        String scope,
        String assignedHubCode,
        String assignedShipperCode
) {
    private java.util.Set<String> tokens() { return scope == null ? java.util.Set.of() : new java.util.HashSet<>(java.util.Arrays.asList(scope.split("\\s+"))); }

    public boolean isAuthenticated() {
        return username != null && !username.isBlank() && scope != null && !scope.isBlank();
    }

    public boolean isAdmin() {
        return scope != null && tokens().contains("ROLE_ADMIN");
    }

    public boolean isManager() {
        return scope != null && (tokens().contains("ROLE_HUB_MANAGER") || tokens().contains("HUB_TASK_RANGE_ASSIGN"));
    }

    public boolean isAuditorOnly() {
        return scope != null && tokens().contains("ROLE_HUB_AUDITOR") && !isAdmin() && !isManager();
    }

    public boolean isShipperScoped() {
        return scope != null
                && (tokens().contains("ROLE_HUB_SHIPPER") || tokens().contains("ROLE_SHIPPER"))
                && !isAdmin()
                && !isManager();
    }

    public boolean hasScope(String token) {
        return isAdmin() || (scope != null && tokens().contains(token));
    }
}

