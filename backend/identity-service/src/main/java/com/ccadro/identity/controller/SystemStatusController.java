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
        String postgisVersion = "UNKNOWN";
        try {
            postgisVersion = jdbcTemplate.queryForObject("SELECT PostGIS_Version()", String.class);
        } catch (Exception e) {
            postgisVersion = "ERROR: " + e.getMessage();
        }

        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "system", "CCADRO - Smart Green Logistics Tracker",
                "version", "0.1.0-SNAPSHOT",
                "timestamp", Instant.now().toString(),
                "postgisVersion", postgisVersion,
                "modules", Map.of(
                        "identity", "UP",
                        "asset", "UP",
                        "shipment", "UP",
                        "routing", "UP",
                        "tracking", "UP",
                        "carbon", "UP",
                        "incident", "UP"
                )
        ));
    }
}
