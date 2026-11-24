package com.ccadro.identity.controller;

import com.ccadro.identity.dto.ApiResponse;
import com.ccadro.identity.util.CallerAuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/system")
public class AdminDataController {
    private final JdbcTemplate jdbc;
    private record Dataset(String key, String table, boolean softDelete) {}
    private static final List<Dataset> DATASETS = List.of(
        new Dataset("users", "users", true), new Dataset("staff", "staff_profiles", true),
        new Dataset("branches", "branches", true), new Dataset("companies", "companies", true),
        new Dataset("drivers", "driver", true), new Dataset("vehicles", "vehicle", true),
        new Dataset("containers", "container", true), new Dataset("manifest", "container_cargo_manifest_item", true),
        new Dataset("shipments", "shipment", true), new Dataset("trips", "trip", true),
        new Dataset("incidents", "field_incident", true), new Dataset("contracts", "b2b_contracts", true),
        new Dataset("payments", "payment_transactions", true), new Dataset("notifications", "emergency_notification", false),
        new Dataset("routes", "route_version", false), new Dataset("carbon", "emission_calculation", false),
        new Dataset("inspections", "pre_trip_inspection", false), new Dataset("applications", "job_applications", false),
        new Dataset("hubs", "local_distribution_hub", false), new Dataset("outbox", "outbox_event", false),
        new Dataset("sagas", "saga_state_log", false), new Dataset("hubAccounts", "hub_iam.hub_accounts", true)
    );

    @GetMapping("/data")
    public ApiResponse<Map<String,Object>> inventory(
            @RequestHeader(value = "X-Auth-Scope", required = false) String scope) {
        CallerAuthUtils.requireAdmin(scope, "Chỉ ADMIN được kiểm tra dữ liệu nội bộ");
        Map<String,Object> datasets = new LinkedHashMap<>();
        for (Dataset dataset : DATASETS) {
            try {
                // Table identifiers come only from the static allowlist above.
                String sql = "SELECT count(*) AS total, "
                    + (dataset.softDelete() ? "count(*) FILTER (WHERE NOT is_deleted)" : "count(*)")
                    + " AS active FROM " + dataset.table();
                Map<String,Object> row = jdbc.queryForMap(sql);
                datasets.put(dataset.key(), Map.of("state", "available", "count", row.get("active"),
                    "total", row.get("total"), "source", "PostgreSQL shared deployment"));
            } catch (org.springframework.dao.DataAccessException ignored) {
                datasets.put(dataset.key(), Map.of("state", "unavailable", "error", "Không đọc được nguồn dữ liệu"));
            }
        }
        Map<String,Object> checks = new LinkedHashMap<>();
        metric(checks, "pendingDrivers", "SELECT count(*) FROM staff_profiles WHERE NOT is_deleted AND role_code = 'DRIVER' AND verification_status <> 'APPROVED'");
        metric(checks, "expiredLicenses", "SELECT count(*) FROM staff_profiles WHERE NOT is_deleted AND role_code = 'DRIVER' AND license_expiry_date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date");
        metric(checks, "unlinkedDrivers", "SELECT count(*) FROM driver_dispatch_qualification WHERE qualification_issue IS NOT NULL");
        metric(checks, "deletedUsers", "SELECT count(*) FROM users WHERE is_deleted");
        metric(checks, "pendingEvents", "SELECT count(*) FROM outbox_event WHERE status = 'PENDING'");
        metric(checks, "failedDispatch", "SELECT count(*) FROM saga_state_log WHERE saga_status NOT IN ('SUCCEEDED','ROLLED_BACK')");
        return ApiResponse.success(Map.of("datasets", datasets, "checks", checks, "checkedAt", Instant.now().toString(),
            "scope", "Read-only counts from shared PostgreSQL. Runtime checks are separate. MongoDB, Redis, Kafka lag, backups and object storage are not verified."));
    }

    private void metric(Map<String,Object> metrics, String name, String sql) {
        try { metrics.put(name, jdbc.queryForObject(sql, Long.class)); }
        catch (org.springframework.dao.DataAccessException ignored) { metrics.put(name, "Chưa xác minh"); }
    }
}
