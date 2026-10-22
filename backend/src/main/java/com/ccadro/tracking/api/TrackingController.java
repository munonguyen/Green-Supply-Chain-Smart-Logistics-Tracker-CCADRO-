package com.ccadro.tracking.api;

import com.ccadro.tracking.api.dto.IngestTelemetryRequest;
import com.ccadro.tracking.application.TrackingService;
import com.ccadro.tracking.domain.DeviationAlert;
import com.ccadro.tracking.domain.TelemetryEvent;
import com.ccadro.tracking.domain.Trip;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tracking")
@Tag(name = "Trip Tracking", description = "Real-time telemetry ingestion and deviation monitoring (UC09, UC10)")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) {
        this.trackingService = trackingService;
    }

    @PostMapping("/telemetry")
    @Operation(summary = "Ingest GPS Telemetry Point", description = "Receives live GPS coordinates from vehicle tracker")
    public ResponseEntity<TelemetryEvent> ingestTelemetry(@Valid @RequestBody IngestTelemetryRequest request) {
        TelemetryEvent saved = trackingService.ingestTelemetry(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/trips/{tripId}")
    @Operation(summary = "Get trip tracking state")
    public ResponseEntity<Trip> getTrip(@PathVariable UUID tripId) {
        return ResponseEntity.ok(trackingService.getTripById(tripId));
    }

    @GetMapping("/trips/{tripId}/telemetry")
    @Operation(summary = "Get historical GPS telemetry track for trip")
    public ResponseEntity<List<TelemetryEvent>> getTelemetryHistory(@PathVariable UUID tripId) {
        return ResponseEntity.ok(trackingService.getTelemetryHistory(tripId));
    }

    @GetMapping("/trips/{tripId}/alerts")
    @Operation(summary = "Get active deviation alerts for trip")
    public ResponseEntity<List<DeviationAlert>> getAlerts(@PathVariable UUID tripId) {
        return ResponseEntity.ok(trackingService.getAlerts(tripId));
    }
}
