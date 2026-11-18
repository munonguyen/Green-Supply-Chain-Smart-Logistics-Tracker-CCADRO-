package com.ccadro.identity.util;

import com.ccadro.identity.exception.AppException;
import com.ccadro.identity.exception.ErrorCode;

import java.util.Arrays;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Shared utility for parsing and enforcing gateway-propagated X-Auth-Scope RBAC claims.
 */
public final class CallerAuthUtils {

    private CallerAuthUtils() {
    }

    public static Set<String> parseScopes(String callerScope) {
        if (callerScope == null || callerScope.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(callerScope.trim().split("\\s+"))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public static boolean hasAnyRole(String callerScope, String... roles) {
        Set<String> scopes = parseScopes(callerScope);
        for (String role : roles) {
            if (scopes.contains(role)) {
                return true;
            }
        }
        return false;
    }

    public static void requireAdmin(String callerScope, String errorMessage) {
        requireAnyRole(callerScope, errorMessage, "ROLE_ADMIN");
    }

    public static void requireAnyRole(String callerScope, String errorMessage, String... allowedRoles) {
        if (!hasAnyRole(callerScope, allowedRoles)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, errorMessage);
        }
    }

    public static void requireOwnerOrAdmin(String owner, String caller, String callerScope) {
        if (caller == null || (!hasAnyRole(callerScope, "ROLE_ADMIN") && !owner.equals(caller))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
