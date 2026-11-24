package com.ccadro.identity.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "System Health", description = "CCADRO system and module health checks")
public class SystemStatusController {

    JdbcTemplate jdbcTemplate;

    @GetMapping
    @Operation(summary = "CCADRO Health and Capabilities", description = "Verifies DB, PostGIS version, and modular monolith status")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        String postgisVersion;
        String status;
        try {
            postgisVersion = jdbcTemplate.queryForObject("SELECT PostGIS_Version()", String.class);
            status = "UP";
        } catch (Exception e) {
            postgisVersion = "UNAVAILABLE";
            status = "DOWN";
        }

        return ResponseEntity.ok(Map.of(
                "status", status,
                "service", "identity-service",
                "version", "0.1.0-SNAPSHOT",
                "timestamp", Instant.now().toString(),
                "postgisVersion", postgisVersion,
                "dependencies", Map.of("postgresqlPostgis", status)
        ));
    }
}
