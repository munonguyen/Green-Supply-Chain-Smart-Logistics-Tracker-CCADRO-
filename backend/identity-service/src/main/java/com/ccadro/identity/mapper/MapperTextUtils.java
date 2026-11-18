package com.ccadro.identity.mapper;

import java.util.Locale;

/** Shared string normalization utilities for MapStruct mappers without polluting type-conversion resolution. */
public final class MapperTextUtils {

    private MapperTextUtils() {
    }

    public static String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String trimLowerOrNull(String value) {
        String trimmed = trimOrNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    public static String normalizeUpper(String value) {
        String trimmed = trimOrNull(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    public static String normalizeOrDefault(String value, String fallback) {
        String normalized = normalizeUpper(value);
        return normalized != null ? normalized : fallback;
    }

    public static String resolveStaffCategory(String roleCode, String explicitCategory) {
        String provided = normalizeUpper(explicitCategory);
        if (provided != null) {
            return provided;
        }
        String role = normalizeUpper(roleCode);
        if (role == null) return "OPS_DISPATCH";
        if ("DRIVER".equals(role) || "HUB_SHIPPER".equals(role)) {
            return "DRIVER_FLEET";
        }
        if ("SAFETY_MANAGER".equals(role) || "ESG_AUDITOR".equals(role) || "HUB_AUDITOR".equals(role)) {
            return "CONTROL_AUDIT";
        }
        if ("ADMIN".equals(role)) {
            return "MANAGEMENT";
        }
        return "OPS_DISPATCH";
    }

    public static String normalizeFilter(String value) {
        String normalized = normalizeUpper(value);
        if (normalized == null || "ALL".equals(normalized)) {
            return null;
        }
        return normalized;
    }
}
